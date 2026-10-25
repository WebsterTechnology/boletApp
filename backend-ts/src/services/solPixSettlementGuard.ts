import { isVerifiedSolPixPayment, type SolPixVerification } from "./solPixVerification";

/**
 * Pure, fail-closed precondition for the eventual transactional Sòl PIX webhook.
 * The caller must lock the package, attempt and contribution in a single DB
 * transaction, check this guard, and commit all three changes atomically.
 * This function NEVER changes the Loto wallet or creates a receipt.
 */
export type SolPixSettlementState = {
  packageId: number;
  contributionId: number;
  packageStatus: string;
  paidMonths: number;
  installmentNumber: number;
  installmentAmountCents: number;
  contributionStatus: string;
  contributionPaidAt: Date | null;
  contributionPaymentReference: string | null;
  attemptId: number;
  attemptPackageId: number;
  attemptContributionId: number;
  attemptAmountCents: number;
  attemptCurrency: string;
  attemptMethod: string;
  attemptStatus: string;
  attemptProviderReference: string | null;
  providerOrderNsu: string;
};

export function canSettleSolPixInstallment(
  state: SolPixSettlementState,
  verification: SolPixVerification,
): boolean {
  if (![state.packageId, state.contributionId, state.attemptId,
    state.attemptPackageId, state.attemptContributionId,
    state.installmentNumber, state.paidMonths,
    state.installmentAmountCents, state.attemptAmountCents]
    .every(Number.isSafeInteger)) return false;
  if (state.packageId <= 0 || state.contributionId <= 0 ||
      state.attemptId <= 0 || state.attemptPackageId !== state.packageId ||
      state.attemptContributionId !== state.contributionId ||
      state.packageStatus !== "draft" && state.packageStatus !== "active" ||
      state.paidMonths < 0 || state.paidMonths >= 12 ||
      state.installmentNumber !== state.paidMonths + 1 ||
      state.contributionStatus !== "pending" ||
      state.contributionPaidAt !== null ||
      state.contributionPaymentReference !== null ||
      state.installmentAmountCents !== state.attemptAmountCents ||
      ![10000, 20000, 50000, 100000].includes(state.installmentAmountCents)) {
    return false;
  }
  return isVerifiedSolPixPayment({
    orderNsu: `sol-pix-${state.attemptId}`,
    providerOrderNsu: state.providerOrderNsu,
    amountCents: state.attemptAmountCents,
    currency: state.attemptCurrency,
    method: state.attemptMethod,
    status: state.attemptStatus,
  }, verification) && state.attemptProviderReference === state.providerOrderNsu;
}
