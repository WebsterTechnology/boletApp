/** Loan principal and repayment amounts are whole Bolet points. */
export function loanTotal(principal: number): number {
  if (!Number.isSafeInteger(principal) || principal <= 0) throw new Error("Invalid loan principal");
  const total = Math.ceil(principal * 120 / 100);
  if (!Number.isSafeInteger(total) || total > 2147483647) throw new Error("Loan total exceeds supported points");
  return total;
}

/** Partial payments are forbidden throughout the final 24 hours and after the due date. */
export function repaymentAllowed(amount: number, remaining: number, dueAt: number, now: number): boolean {
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(remaining) || amount < 1 || amount > remaining) return false;
  return now < dueAt - 86400000 || amount === remaining;
}

/** Calculate an exact debit without mutating wallet balances. */
export function allocateWalletRepayment(play: number, withdraw: number, amount: number) {
  if (![play, withdraw, amount].every(Number.isSafeInteger) || play < 0 || withdraw < 0 ||
      amount < 1 || !Number.isSafeInteger(play + withdraw) || play + withdraw < amount) return null;
  const withdrawDebited = Math.min(withdraw, amount);
  const playDebited = amount - withdrawDebited;
  return { withdrawDebited, playDebited, withdrawAfter: withdraw - withdrawDebited, playAfter: play - playDebited };
}
