/**
 * Sòl-only InfinitePay checkout request builder.
 *
 * This module is deliberately pure. It neither creates a payment link nor
 * confirms a contribution. Do not use the Loto credit/top-up endpoint for Sòl.
 */
export type SolPixCheckoutAttempt = {
  id: number;
  packageId: number;
  contributionId: number;
  amountCents: number;
  currency: string;
  method: string;
  status: string;
};

export type SolPixCheckoutPayload = {
  handle: string;
  items: { quantity: 1; price: number; description: string }[];
  order_nsu: string;
  redirect_url: string;
  webhook_url: string;
};

export function solPixOrderNsu(attemptId: number): string {
  if (!Number.isSafeInteger(attemptId) || attemptId <= 0) {
    throw new Error("Invalid Sòl PIX attempt");
  }
  return `sol-pix-${attemptId}`;
}

export function buildSolPixCheckoutPayload(
  attempt: SolPixCheckoutAttempt,
  config: { handle: string; redirectUrl: string; webhookUrl: string },
): SolPixCheckoutPayload {
  if (attempt.method !== "pix" || attempt.status !== "created" ||
      attempt.currency !== "BRL" || !Number.isSafeInteger(attempt.packageId) ||
      attempt.packageId <= 0 || !Number.isSafeInteger(attempt.contributionId) ||
      attempt.contributionId <= 0 || !Number.isSafeInteger(attempt.amountCents) ||
      ![10000, 20000, 50000, 100000].includes(attempt.amountCents)) {
    throw new Error("Sòl PIX attempt is not eligible");
  }
  if (!config.handle || !config.handle.trim()) throw new Error("Missing InfinitePay handle");
  for (const value of [config.redirectUrl, config.webhookUrl]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) {
      throw new Error("Sòl PIX URLs must use HTTPS");
    }
  }
  return {
    handle: config.handle,
    items: [{
      quantity: 1,
      price: attempt.amountCents,
      description: `Sol package ${attempt.packageId} installment ${attempt.contributionId}`,
    }],
    order_nsu: solPixOrderNsu(attempt.id),
    redirect_url: config.redirectUrl,
    webhook_url: config.webhookUrl,
  };
}

/** Do not redirect a customer to a URL not belonging to InfinitePay. */
export function parseSolPixCheckoutUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("Missing checkout URL");
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" ||
      !(hostname === "infinitepay.io" || hostname.endsWith(".infinitepay.io")) ||
      url.username || url.password) {
    throw new Error("Untrusted InfinitePay checkout URL");
  }
  return url.toString();
}
