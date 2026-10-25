/**
 * Sòl-only InfinitePay verification rules. This module never credits Loto
 * points, changes balances, or marks a contribution paid.
 *
 * The checkout creation and webhook settlement must both remain disabled
 * until the separate Sòl PIX flow is implemented and tested end to end.
 */
export type SolPixVerification = {
  success?: unknown;
  paid?: unknown;
  amount?: unknown;
};

export type SolPixExpectedPayment = {
  orderNsu: string;
  providerOrderNsu: string;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
};

/**
 * Fail closed: the order must be bound to this specific Sòl payment attempt,
 * the provider must explicitly confirm paid, and the gross amount must match
 * the server-stored installment price exactly in BRL cents.
 */
export function isVerifiedSolPixPayment(
  expected: SolPixExpectedPayment,
  verification: SolPixVerification,
): boolean {
  return (
    expected.method === "pix" &&
    expected.status === "created" &&
    expected.currency === "BRL" &&
    typeof expected.orderNsu === "string" &&
    expected.orderNsu.length > 0 &&
    expected.orderNsu === expected.providerOrderNsu &&
    Number.isSafeInteger(expected.amountCents) &&
    expected.amountCents > 0 &&
    verification.success === true &&
    verification.paid === true &&
    typeof verification.amount === "number" &&
    Number.isSafeInteger(verification.amount) &&
    verification.amount === expected.amountCents
  );
}
