/** Pure Sòl payout arithmetic. Amounts are integer BRL cents. */
export function calculateSolPayout(monthlyAmountCents: number, paidMonths: number) {
  if (!Number.isSafeInteger(monthlyAmountCents) || monthlyAmountCents <= 0 ||
      monthlyAmountCents % 100 !== 0 || !Number.isSafeInteger(paidMonths) ||
      paidMonths < 1 || paidMonths > 12) {
    throw new Error("Invalid Sòl payout inputs");
  }
  const grossCents = monthlyAmountCents * paidMonths;
  if (!Number.isSafeInteger(grossCents)) throw new Error("Sòl payout overflow");
  const completed = paidMonths === 12;
  const penaltyCents = completed ? 0 : Math.floor(grossCents / 10);
  const netCents = completed ? grossCents + monthlyAmountCents : grossCents - penaltyCents;
  if (!Number.isSafeInteger(netCents) || netCents <= 0 || netCents % 100 !== 0) {
    throw new Error("Sòl payout requires reconciliation");
  }
  return { grossCents, penaltyCents, netCents, completed, points: netCents / 100 };
}
