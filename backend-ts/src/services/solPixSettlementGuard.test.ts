import { describe, expect, it } from "vitest";
import { canSettleSolPixInstallment } from "./solPixSettlementGuard";

const state = {
  packageId: 7, contributionId: 8, packageStatus: "active",
  paidMonths: 1, installmentNumber: 2, installmentAmountCents: 20000,
  contributionStatus: "pending", contributionPaidAt: null,
  contributionPaymentReference: null,
  attemptId: 10, attemptPackageId: 7, attemptContributionId: 8,
  attemptAmountCents: 20000, attemptCurrency: "BRL",
  attemptMethod: "pix", attemptStatus: "created",
  attemptProviderReference: "sol-pix-10", providerOrderNsu: "sol-pix-10",
};
const paid = { success: true, paid: true, amount: 20000 };

describe("Sòl PIX settlement guard", () => {
  it("accepts the exact next installment with confirmed payment", () => {
    expect(canSettleSolPixInstallment(state, paid)).toBe(true);
  });
  it("accepts the first installment for an untouched draft", () => {
    expect(canSettleSolPixInstallment({ ...state, packageStatus: "draft", paidMonths: 0, installmentNumber: 1 }, paid)).toBe(true);
  });
  it.each([
    { packageId: 99 }, { attemptPackageId: 99 }, { attemptContributionId: 99 },
    { packageStatus: "cancelled" }, { packageStatus: "completed" },
    { paidMonths: 12 }, { paidMonths: 2 }, { installmentNumber: 3 },
    { contributionStatus: "paid" }, { contributionPaidAt: new Date() },
    { contributionPaymentReference: "existing" },
    { installmentAmountCents: 10000 }, { attemptAmountCents: 10000 },
    { attemptMethod: "wallet" }, { attemptStatus: "confirmed" },
    { attemptProviderReference: null }, { attemptProviderReference: "other" },
    { providerOrderNsu: "other" },
  ])("rejects invalid or replayed installment state", change => {
    expect(canSettleSolPixInstallment({ ...state, ...change }, paid)).toBe(false);
  });
  it("rejects an unpaid or incorrectly priced provider confirmation", () => {
    expect(canSettleSolPixInstallment(state, { ...paid, paid: false })).toBe(false);
    expect(canSettleSolPixInstallment(state, { ...paid, amount: 19999 })).toBe(false);
  });
});
