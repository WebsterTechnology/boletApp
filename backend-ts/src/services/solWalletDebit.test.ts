import { describe, expect, it } from "vitest";
import { calculateSolWalletDebit } from "./solWalletDebit";

describe("Sòl wallet debit calculation", () => {
  it("deducts play first then withdrawable", () => {
    expect(calculateSolWalletDebit(50, 735, 10000)).toEqual({
      pointsDebited: 100, playDebited: 50, withdrawDebited: 50,
      playAfter: 0, withdrawAfter: 685,
    });
  });
  it("uses only play balance when sufficient", () => {
    expect(calculateSolWalletDebit(200, 300, 10000)).toMatchObject({
      playDebited: 100, withdrawDebited: 0, playAfter: 100, withdrawAfter: 300,
    });
  });
  it("uses only withdrawable when play is empty", () => {
    expect(calculateSolWalletDebit(0, 100, 10000)).toMatchObject({
      playDebited: 0, withdrawDebited: 100, playAfter: 0, withdrawAfter: 0,
    });
  });
  it("does not calculate a debit with insufficient funds", () => {
    expect(calculateSolWalletDebit(20, 79, 10000)).toBeNull();
  });
  it("accepts exact total", () => {
    expect(calculateSolWalletDebit(20, 80, 10000)).toMatchObject({
      playAfter: 0, withdrawAfter: 0,
    });
  });
  it.each([[NaN, 100, 10000], [-1, 100, 10000], [50, -1, 10000], [50, 100, 10050], [50, 100, 0], [Number.MAX_SAFE_INTEGER, 1, 10000]])(
    "rejects invalid balance or amount %s %s %s",
    (play, withdrawable, cents) => {
      expect(() => calculateSolWalletDebit(play, withdrawable, cents)).toThrow();
    },
  );
});
