/**
 * Calculate the exact whole-point debit for a Sòl installment.
 * Pure function: callers must perform all writes in one database transaction.
 */
export function calculateSolWalletDebit(play: number, withdrawable: number, amountCents: number) {
  if (![play, withdrawable, amountCents].every(Number.isSafeInteger) ||
      play < 0 || withdrawable < 0 || amountCents <= 0 || amountCents % 100 !== 0) {
    throw new Error("Invalid Sòl wallet balance or amount");
  }
  const required = amountCents / 100;
  if (!Number.isSafeInteger(play + withdrawable)) throw new Error("Wallet total exceeds safe integer range");
  if (play + withdrawable < required) return null;
  const playDebited = Math.min(play, required);
  const withdrawDebited = required - playDebited;
  return {
    pointsDebited: required,
    playDebited,
    withdrawDebited,
    playAfter: play - playDebited,
    withdrawAfter: withdrawable - withdrawDebited,
  };
}
