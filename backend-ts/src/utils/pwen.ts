export const INVALID_PWEN_MESSAGE = "Pwen must be a positive whole number";
export const PWEN_LOCKED_MESSAGE = "Pwen cannot be changed on an existing bet";

/**
 * A bet stake as a positive integer, or null when invalid.
 * Accepts `10` or `"10"`; rejects negatives, zero, decimals, "10abc", "", null, etc.
 * Never trust the client for this: a negative stake turns `points -= pwen` into a credit.
 */
export function parsePwen(value: unknown): number | null {
  let n: number;
  if (typeof value === "number") n = value;
  else if (typeof value === "string" && /^\d+$/.test(value.trim())) n = Number(value.trim());
  else return null;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Updates must not change the stake: points were only charged for the original amount.
 * Sending the same value back (as some clients do) is allowed.
 */
export function pwenChangeRejected(requested: unknown, current: number): boolean {
  return requested !== undefined && requested !== null && parsePwen(requested) !== current;
}
