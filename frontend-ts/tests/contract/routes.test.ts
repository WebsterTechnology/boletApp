// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { backendAvailable, startBackend } from "./backend";
import { ENDPOINTS } from "./endpoints";

/** Express's built-in 404 page ("Cannot GET /x") means no route matched. */
const isUnrouted = (status: number, body: string) => status === 404 && /Cannot (GET|POST|PUT|PATCH|DELETE) /.test(body);

let backend: Awaited<ReturnType<typeof startBackend>>;

describe.skipIf(!backendAvailable)("frontend ↔ backend-ts route contract", () => {
beforeAll(async () => {
  backend = await startBackend();
}, 60_000);

afterAll(async () => {
  await backend?.stop();
});

describe("every endpoint the frontend calls is served by backend-ts", () => {
  it.each(ENDPOINTS.filter((e) => !e.missing))("$method $path ($usedBy)", async ({ method, path }) => {
    const res = await fetch(backend.url + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    const body = await res.text();
    expect(isUnrouted(res.status, body), `${method} ${path} is not routed in backend-ts`).toBe(false);
  });
});

describe("known gaps: the frontend calls these but backend-ts does not serve them", () => {
  it.each(ENDPOINTS.filter((e) => e.missing))("$method $path — $missing", async ({ method, path }) => {
    const res = await fetch(backend.url + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : "{}",
    });
    // If this starts failing, the gap was fixed: drop `missing` in endpoints.ts.
    expect(isUnrouted(res.status, await res.text())).toBe(true);
  });
});

describe("protected endpoints reject requests without the Bearer token the app sends", () => {
  it.each([
    "/api/users/me",
    "/api/bets/me",
    "/api/notifications",
    "/api/admin/users",
  ])("GET %s → 401", async (path) => {
    const res = await fetch(backend.url + path);
    expect(res.status).toBe(401);
  });
});

describe("public endpoints return the shapes the frontend expects", () => {
  it("disabled numbers and locations are string arrays", async () => {
    for (const path of ["/api/admin/public-disabled-numbers", "/api/admin/public-disabled-locations"]) {
      const data = await (await fetch(backend.url + path)).json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((v: unknown) => typeof v === "string")).toBe(true);
    }
  });

  it("login validation errors come back as { message } (LoginModal shows data.message)", async () => {
    const res = await fetch(backend.url + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Phone and password are required" });
  });

  // Production needs the deployed frontend domain in backend-ts CORS_ORIGINS; that is config, not code.
  it("allows the Vite dev server origin (http://localhost:5173) by default (CORS)", async () => {
    const res = await fetch(backend.url + "/api/auth/login", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,authorization",
      },
    });
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
  });
});
});
