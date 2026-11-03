import { describe, expect, it } from "vitest";
import { loanTotal, repaymentAllowed, allocateWalletRepayment, walletRepaymentReconciles, repaymentLedgerReconciles } from "./borrowRepayment";

describe("borrow repayment policy", () => {
  it("charges one-time 20% interest with whole-point rounding", () => {
    expect(loanTotal(100)).toBe(120);
    expect(loanTotal(101)).toBe(122);
    expect(loanTotal(1)).toBe(2);
    expect(() => loanTotal(2147483647)).toThrow();
  });
  it("allows partial repayments before the final day", () => {
    expect(repaymentAllowed(50,120,30*86400000,0)).toBe(true);
  });
  it("requires full outstanding balance in the final 24 hours", () => {
    const due=30*86400000;
    expect(repaymentAllowed(50,120,due,due-86400000)).toBe(false);
    expect(repaymentAllowed(120,120,due,due-86400000)).toBe(true);
    expect(repaymentAllowed(120,120,due,due+1000)).toBe(true);
  });
  it("rejects overpayment, zero payment, and unsafe values", () => {
    expect(repaymentAllowed(121,120,100000000,0)).toBe(false);
    expect(repaymentAllowed(0,120,100000000,0)).toBe(false);
    expect(repaymentAllowed(1.5,120,100000000,0)).toBe(false);
  });
});

describe("wallet repayment allocation", () => {
  it("uses withdrawable points first", () => {
    expect(allocateWalletRepayment(80,40,50)).toEqual({
      withdrawDebited:40, playDebited:10, withdrawAfter:0, playAfter:70
    });
  });
  it("uses only withdrawable points when sufficient", () => {
    expect(allocateWalletRepayment(80,100,50)).toEqual({
      withdrawDebited:50, playDebited:0, withdrawAfter:50, playAfter:80
    });
  });
  it("rejects insufficient, negative, fractional and unsafe balances", () => {
    expect(allocateWalletRepayment(10,20,31)).toBeNull();
    expect(allocateWalletRepayment(-1,20,1)).toBeNull();
    expect(allocateWalletRepayment(1.5,20,1)).toBeNull();
    expect(allocateWalletRepayment(Number.MAX_SAFE_INTEGER,1,1)).toBeNull();
  });
});

describe("repayment ledger reconciliation", () => {
  const valid = { amount:50, playDebited:10, withdrawDebited:40,
    playBefore:80, withdrawBefore:40, playAfter:70, withdrawAfter:0 };
  it("accepts a balanced wallet deduction", () => {
    expect(walletRepaymentReconciles(valid)).toBe(true);
  });
  it("detects mismatched and incomplete balance snapshots", () => {
    expect(walletRepaymentReconciles({...valid,playAfter:71})).toBe(false);
    expect(walletRepaymentReconciles({...valid,withdrawDebited:39})).toBe(false);
    expect(walletRepaymentReconciles({...valid,playBefore:null})).toBe(false);
  });
});

describe("loan repayment ledger totals", () => {
  it("matches multiple partial payments", () => {
    expect(repaymentLedgerReconciles(120,[50,70])).toBe(true);
  });
  it("detects missing or duplicated payments", () => {
    expect(repaymentLedgerReconciles(120,[50])).toBe(false);
    expect(repaymentLedgerReconciles(120,[50,70,70])).toBe(false);
  });
  it("allows a new loan with no payments but rejects invalid amounts", () => {
    expect(repaymentLedgerReconciles(0,[])).toBe(true);
    expect(repaymentLedgerReconciles(20,[0,20])).toBe(false);
  });
});
