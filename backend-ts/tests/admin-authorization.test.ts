import { describe, expect, it, vi } from "vitest";

import { adminOnly } from "../src/middleware/adminOnly";

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("Admin authorization middleware", () => {
  it("rejects an authenticated normal user with 403", () => {
    const req: any = { user: { id: 2, isAdmin: false } };
    const res: any = response();
    const next = vi.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access denied: Admins only" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a request with no authenticated user with 403", () => {
    const req: any = {};
    const res: any = response();
    const next = vi.fn();

    adminOnly(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an authenticated administrator", () => {
    const req: any = { user: { id: 1, isAdmin: true } };
    const res: any = response();
    const next = vi.fn();

    adminOnly(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
