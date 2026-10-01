// @vitest-environment node
/**
 * End-to-end contract: the frontend's own request code against backend-ts on a real Postgres.
 * Runs only when BACKEND_TEST_DATABASE_URL points at a throwaway database (it creates tables
 * and rows). Example:
 *   BACKEND_TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/boletapp npm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  AdminBetsResponse,
  AdminUser,
  AuthResponse,
  MeUser,
  MyBetItem,
  MyBetsResponse,
  NotificationHistoryItem,
  NotificationItem,
} from "../../src/api/types";
import api from "../../src/utils/axios";
import submitAllBets from "../../src/utils/submitAllBets";
import type { CartBet } from "../../src/types/bet";
import { backendAvailable, startBackend } from "./backend";

const DB_URL = process.env.BACKEND_TEST_DATABASE_URL;

// Node environment (the backend cannot load under jsdom). Give the frontend code the two
// browser globals it touches: localStorage and window events.
if (typeof globalThis.window === "undefined") {
  const store = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
    window: Object.assign(new EventTarget(), { location: { href: "" } }),
    alert: () => {},
  });
}

/** Every key the TypeScript type declares must be present, and nothing undeclared may appear. */
function expectExactKeys<T>(obj: T, keys: (keyof T)[], optional: string[] = []) {
  const actual = Object.keys(obj as object).sort();
  for (const k of keys) expect(actual, `missing key "${String(k)}"`).toContain(k);
  const allowed = new Set<string>([...keys, ...optional].map(String));
  expect(actual.filter((k) => !allowed.has(k)), "keys not in the frontend type").toEqual([]);
}

const AUTH_USER_KEYS = ["id", "phone", "points", "isAdmin", "fullName", "cpf", "birthDate", "email", "address", "city", "state", "cep", "profileComplete"] as const;
const ME_KEYS = ["id", "phone", "points", "isAdmin", "fullName", "email", "profileComplete"] as const;
const MY_BET_KEYS = ["id", "receiptId", "type", "numbers", "pwen", "draw", "status", "createdAt"] as const;

describe.skipIf(!DB_URL || !backendAvailable)("live contract against backend-ts + Postgres", () => {
  let backend: Awaited<ReturnType<typeof startBackend>>;
  let user: AuthResponse;
  let admin: AuthResponse;

  const call = async <T>(method: string, path: string, body?: unknown, token?: string) => {
    const res = await fetch(backend.url + path, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, data: (await res.json()) as T };
  };

  beforeAll(async () => {
    backend = await startBackend(DB_URL);
    await backend.sequelize.sync({ force: true });

    // Point the app's axios instance at the in-process backend, using Node's HTTP adapter.
    api.defaults.baseURL = backend.url;
    api.defaults.adapter = "http";

    const stamp = Date.now().toString().slice(-8);
    const reg = await call<AuthResponse>("POST", "/api/auth/register", {
      phone: `+55119${stamp}`, password: "1234", fullName: "Ana", email: "ana@x.com",
    });
    expect(reg.status).toBe(201);
    user = reg.data;

    const regAdmin = await call<AuthResponse>("POST", "/api/auth/register", {
      phone: `+55118${stamp}`, password: "4321", fullName: "Admin", email: "adm@x.com",
    });
    await backend.sequelize.query(`UPDATE users SET "isAdmin" = true, points = 1000 WHERE id = ${regAdmin.data.user.id}`);
    admin = (await call<AuthResponse>("POST", "/api/auth/login", { phone: `+55118${stamp}`, password: "4321" })).data;
  }, 120_000);

  afterAll(async () => {
    await backend?.stop();
  });

  it("register/login return AuthResponse exactly as typed", () => {
    expectExactKeys(user, ["message", "user", "token"]);
    expectExactKeys(user.user, [...AUTH_USER_KEYS]);
    expect(admin.user.isAdmin).toBe(true);
  });

  it("GET /api/users/me returns MeUser exactly as typed", async () => {
    const { data } = await call<MeUser>("GET", "/api/users/me", undefined, user.token);
    expectExactKeys(data, [...ME_KEYS]);
  });

  it("submitAllBets places every game for every location, and /api/bets/me returns MyBetItem rows", async () => {
    await call("POST", `/api/admin/users/${user.user.id}/add-pwen`, { amount: 100 }, admin.token);

    // What LoginModal leaves in localStorage, which submitAllBets and the axios interceptor read.
    localStorage.setItem("token", user.token);
    localStorage.setItem("user", JSON.stringify({ ...user.user, points: 100 }));

    const bets: CartBet[] = [
      { id: 1, type: "Yon Chif", number: "5", amount: 2 },
      { id: 2, type: "De Chif", number: "25", amount: 2 },
      { id: 3, type: "Twa Chif", number: "123", amount: 2 },
      { id: 4, type: "Katchif", number: "1234", amount: 2 },
      { id: 5, type: "Maryaj", part1: "12", part2: "34", number: "12-34", display: "12-34", amount: 2 },
    ];
    const deleted: number[] = [];
    const result = await submitAllBets({ bets, selectedLocations: ["New York", "Florida"], deleteBet: (id) => deleted.push(id) });
    expect(result.total).toBe(20);
    expect(deleted).toEqual([1, 2, 3, 4, 5]);

    const { data } = await call<MyBetsResponse>("GET", "/api/bets/me", undefined, user.token);
    expectExactKeys(data, ["items", "totalPwen"]);
    expect(data.items).toHaveLength(10);
    expect(data.totalPwen).toBe(20);
    for (const item of data.items) {
      expectExactKeys<MyBetItem>(item, [...MY_BET_KEYS], ["part1", "part2"]);
    }
    expect(new Set(data.items.map((i) => i.type))).toEqual(new Set(["yonchif", "dechif", "twachif", "katchif", "maryaj"]));
    // One receipt per location, as Fich groups them.
    expect(new Set(data.items.map((i) => i.receiptId)).size).toBe(2);

    // The balance the frontend cached matches the server.
    const me = await call<MeUser>("GET", "/api/users/me", undefined, user.token);
    expect(me.data.points).toBe(result.remaining);
  });

  it("the backend rejects a disabled number even if the UI check is bypassed", async () => {
    await call("POST", "/api/admin/disabled-numbers", { numbers: ["7"] }, admin.token);
    localStorage.setItem("token", user.token);
    localStorage.setItem("user", JSON.stringify({ points: 1000 }));
    await expect(
      submitAllBets({ bets: [{ id: 9, type: "Yon Chif", number: "7", amount: 1 }], selectedLocations: ["Florida"], deleteBet: () => {} })
    ).rejects.toMatchObject({ response: { status: 400 } });
    await call("POST", "/api/admin/disabled-numbers", { numbers: [] }, admin.token);
  });

  it("admin endpoints return the shapes AdminBets and AdminDashboard read", async () => {
    const bets = await call<AdminBetsResponse>("GET", "/api/admin/bets", undefined, admin.token);
    expectExactKeys(bets.data, ["items", "total"]);
    expect(bets.data.items.length).toBeGreaterThan(0);
    expectExactKeys(bets.data.items[0], ["id", "type", "userId", "receiptId", "phone", "numbers", "pwen", "draw", "status", "createdAt"], ["customerName"]);

    const users = await call<AdminUser[]>("GET", "/api/admin/users", undefined, admin.token);
    expectExactKeys(users.data[0], ["id", "phone", "points", "isAdmin", "fullName", "cpf", "birthDate", "email", "address", "city", "state", "cep"]);

    const first = bets.data.items[0];
    const patched = await call("PATCH", `/api/admin/bets/${first.type}/${first.id}/status`, { status: "won" }, admin.token);
    expect(patched.status).toBe(200);
  });

  it("notifications match NotificationItem / NotificationHistoryItem", async () => {
    const sent = await call<NotificationItem>("POST", "/api/notifications/send", {
      title: "Hi", message: "Test", priority: "info", imageUrl: "", linkUrl: "", recipientType: "all", recipientUserId: null,
    }, admin.token);
    expect(sent.status).toBe(201);

    const list = await call<NotificationItem[]>("GET", "/api/notifications", undefined, user.token);
    expectExactKeys(list.data[0], ["id", "title", "message", "priority", "imageUrl", "linkUrl", "createdAt", "updatedAt", "read"], ["NotificationReads"]);

    const history = await call<NotificationHistoryItem[]>("GET", "/api/notifications/history", undefined, admin.token);
    expectExactKeys(history.data[0], ["id", "title", "message", "priority", "imageUrl", "linkUrl", "createdAt", "updatedAt", "readCount", "recipientType", "recipientUserId", "recipient"], ["target", "NotificationReads"]);
  });
});
