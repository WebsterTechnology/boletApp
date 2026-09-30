import { describe, expect, it, vi } from "vitest";

vi.mock("../src/models", () => ({
  User: { findByPk: vi.fn() },
}));

import { authenticate } from "../src/middleware/authenticate";

describe("Authentication middleware", () => {
  it("rejects a missing bearer token with 401", async () => {
    const req: any = { headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied: No token provided" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a malformed bearer token with 401", async () => {
    const req: any = { headers: { authorization: "Bearer definitely-not-a-jwt" } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a non-Bearer authorization header with 401", async () => {
    const req: any = { headers: { authorization: "Basic abc123" } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
