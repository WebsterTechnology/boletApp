/** InfinitePay webhooks are unsigned: never trust a callback as proof of payment.
 * Verify with the provider's payment_check endpoint before settlement.
 */
export type PixVerification = {
  success?: unknown; paid?: unknown; amount?: unknown;
  capture_method?: unknown;
};
export function verifiedBorrowPixPayment(
  response: PixVerification, expectedAmountCents: number
): boolean {
  return Number.isSafeInteger(expectedAmountCents) &&
    expectedAmountCents >= 100 &&
    response.success === true && response.paid === true &&
    response.capture_method === "pix" &&
    typeof response.amount === "number" &&
    Number.isSafeInteger(response.amount) &&
    response.amount === expectedAmountCents;
}
