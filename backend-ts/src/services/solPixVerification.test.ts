import { describe, expect, it } from "vitest";
import { isVerifiedSolPixPayment } from "./solPixVerification";

const expected = {
  orderNsu: "sol-pix-123-unique",
  providerOrderNsu: "sol-pix-123-unique",
  amountCents: 20000,
  currency: "BRL",
  method: "pix",
  status: "created",
};
const paid = { success: true, paid: true, amount: 20000 };

describe("Sòl PIX payment verification", () => {
  it("accepts only an exact provider-confirmed payment", () => {
    expect(isVerifiedSolPixPayment(expected, paid)).toBe(true);
  });
  it.each([
    [{ ...expected, providerOrderNsu: "other-order" }, paid],
    [{ ...expected, orderNsu: "" }, paid],
    [{ ...expected, method: "wallet" }, paid],
    [{ ...expected, currency: "USD" }, paid],
    [{ ...expected, status: "confirmed" }, paid],
    [{ ...expected, amountCents: 0 }, paid],
    [expected, { ...paid, success: false }],
    [expected, { ...paid, paid: false }],
    [expected, { ...paid, amount: 19999 }],
    [expected, { ...paid, amount: 20001 }],
    [expected, { ...paid, amount: "20000" }],
    [expected, { ...paid, amount: NaN }],
  ])("rejects mismatched, replayed, unpaid or malformed payments", (attempt, verification) => {
    expect(isVerifiedSolPixPayment(attempt, verification)).toBe(false);
  });
});
