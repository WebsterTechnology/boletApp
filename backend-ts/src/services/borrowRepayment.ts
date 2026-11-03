/** Loan principal and repayment amounts are whole Bolet points. */
export function loanTotal(principal: number): number {
  if (!Number.isSafeInteger(principal) || principal <= 0) throw new Error("Invalid loan principal");
  return Math.ceil(principal * 120 / 100);
}

/** Partial payments are forbidden throughout the final 24 hours and after the due date. */
export function repaymentAllowed(amount: number, remaining: number, dueAt: number, now: number): boolean {
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(remaining) || amount < 1 || amount > remaining) return false;
  return now < dueAt - 86400000 || amount === remaining;
}
