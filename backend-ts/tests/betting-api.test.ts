import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";

vi.mock("../src/middleware/authenticate", async () => {
  const actual = await vi.importActual<typeof import("../src/middleware/authenticate")>("../src/middleware/authenticate");
  return {
    ...actual,
    authenticate: (req: any, _res: any, next: any) => {
      req.user = { id: 1 };
      next();
    },
    currentUser: () => ({ id: 1 }),
  };
});

vi.mock("../src/utils/betRestrictions", () => ({
  disabledBetMessage: () => null,
  disabledMaryajMessage: () => null,
}));

vi.mock("../src/models", () => {
  const user = { id: 1, points: 100, save: vi.fn(async () => undefined) };
  const model = () => ({
    create: vi.fn(async (data: any) => ({ id: 1, status: "pending", ...data })),
    findOne: vi.fn(),
    findAll: vi.fn(async () => []),
    sum: vi.fn(async () => 0),
  });
  return {
    __testUser: user,
    User: { findByPk: vi.fn(async () => user) },
    YonChif: model(),
    DeChif: model(),
    TwaChif: model(),
    Maryaj: model(),
    Katchif: model(),
  };
});

import app from "../src/app";
import * as models from "../src/models";

const testUser = (models as any).__testUser as { id: number; points: number; save: ReturnType<typeof vi.fn> };

type Game = {
  name: string;
  path: string;
  valid: Record<string, unknown>;
  model: any;
};

const games: Game[] = [
  { name: "Yon Chif", path: "/api/yonchif", valid: { number: "5", pwen: 10, location: "New York", receiptId: "TEST-YON" }, model: (models as any).YonChif },
  { name: "De Chif", path: "/api/dechif", valid: { number: "25", pwen: 10, location: "New York", receiptId: "TEST-DE" }, model: (models as any).DeChif },
  { name: "Twa Chif", path: "/api/twachif", valid: { number: "123", pwen: 10, location: "New York", receiptId: "TEST-TWA" }, model: (models as any).TwaChif },
  { name: "Maryaj", path: "/api/maryaj", valid: { part1: "25", part2: "46", pwen: 10, location: "New York", receiptId: "TEST-MAR" }, model: (models as any).Maryaj },
  { name: "Kat Chif", path: "/api/katchif", valid: { number: "1234", pwen: 10, location: "New York", receiptId: "TEST-KAT" }, model: (models as any).Katchif },
];

beforeEach(() => {
  testUser.points = 100;
  testUser.save.mockClear();
  for (const game of games) {
    game.model.create.mockClear();
    game.model.findOne.mockReset();
    game.model.findAll.mockClear();
    game.model.sum?.mockResolvedValue(0);
  }
});

describe.each(games)("$name API pwen security", (game) => {
  it("accepts a valid positive whole-number bet and deducts the balance", async () => {
    const res = await request(app).post(game.path).send(game.valid);
    expect(res.status).toBe(201);
    expect(testUser.points).toBe(90);
    expect(testUser.save).toHaveBeenCalledTimes(1);
    expect(game.model.create).toHaveBeenCalledTimes(1);
  });

  it.each([-100, 0, 10.5])("rejects unsafe pwen %p without changing balance or creating a bet", async (pwen) => {
    const res = await request(app).post(game.path).send({ ...game.valid, pwen });
    expect(res.status).toBe(400);
    expect(testUser.points).toBe(100);
    expect(testUser.save).not.toHaveBeenCalled();
    expect(game.model.create).not.toHaveBeenCalled();
  });

  it("rejects a missing receiptId without changing balance", async () => {
    const { receiptId: _receiptId, ...body } = game.valid;
    const res = await request(app).post(game.path).send(body);
    expect(res.status).toBe(400);
    expect(testUser.points).toBe(100);
    expect(game.model.create).not.toHaveBeenCalled();
  });

  it("rejects insufficient balance without creating a bet", async () => {
    testUser.points = 5;
    const res = await request(app).post(game.path).send(game.valid);
    expect(res.status).toBe(403);
    expect(testUser.points).toBe(5);
    expect(game.model.create).not.toHaveBeenCalled();
  });

  it("blocks changing pwen on an existing bet", async () => {
    const current = { id: 7, pwen: 10, number: (game.valid as any).number, part1: (game.valid as any).part1, part2: (game.valid as any).part2, location: "New York", save: vi.fn(async () => undefined) };
    game.model.findOne.mockResolvedValue(current);
    const updateBody = game.name === "Maryaj"
      ? { part1: "25", part2: "46", pwen: -100, location: "New York" }
      : { number: (game.valid as any).number, pwen: -100, location: "New York" };
    const res = await request(app).put(`${game.path}/7`).send(updateBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Pwen cannot be changed on an existing bet");
    expect(current.save).not.toHaveBeenCalled();
  });

  it("blocks increasing pwen on an existing bet", async () => {
    const current = { id: 7, pwen: 10, number: (game.valid as any).number, part1: (game.valid as any).part1, part2: (game.valid as any).part2, location: "New York", save: vi.fn(async () => undefined) };
    game.model.findOne.mockResolvedValue(current);
    const updateBody = game.name === "Maryaj"
      ? { part1: "25", part2: "46", pwen: 1000, location: "New York" }
      : { number: (game.valid as any).number, pwen: 1000, location: "New York" };
    const res = await request(app).put(`${game.path}/7`).send(updateBody);
    expect(res.status).toBe(400);
    expect(current.save).not.toHaveBeenCalled();
  });
});

describe("Authentication boundary", () => {
  it("authenticate middleware itself rejects a missing bearer token", async () => {
    vi.resetModules();
    const { authenticate } = await import("../src/middleware/authenticate");
    const req: any = { headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
