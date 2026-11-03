import { describe, expect, it } from "vitest";
import { loanTotal, repaymentAllowed } from "./borrowRepayment";

describe("borrow repayment policy", () => {
  it("charges one-time 20% interest with whole-point rounding", () => {
    expect(loanTotal(100)).toBe(120);
    expect(loanTotal(101)).toBe(122);
    expect(loanTotal(1)).toBe(2);
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
