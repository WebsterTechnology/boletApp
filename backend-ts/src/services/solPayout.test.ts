import { describe, expect, it } from "vitest";
import { calculateSolPayout } from "./solPayout";

describe("Sòl withdrawal payout arithmetic", () => {
  it.each([
    [10000, 1, 10000, 1000, 9000],
    [10000, 3, 30000, 3000, 27000],
    [20000, 6, 120000, 12000, 108000],
    [10000, 12, 120000, 0, 130000],
    [50000, 12, 600000, 0, 650000],
    [100000, 12, 1200000, 0, 1300000],
  ])("calculates %i cents x %i months", (monthly, months, gross, penalty, net) => {
    expect(calculateSolPayout(monthly, months)).toEqual({
      grossCents: gross, penaltyCents: penalty, netCents: net,
      completed: months === 12, points: net / 100,
    });
  });
  it.each([[0, 1], [10001, 1], [10000, 0], [10000, 13], [-10000, 1], [10000, 1.5], [Number.MAX_SAFE_INTEGER, 12]])(
    "rejects invalid payout values %s, %s", (amount, months) => {
      expect(() => calculateSolPayout(amount, months)).toThrow();
    },
  );
});
