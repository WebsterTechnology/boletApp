import { describe, expect, it } from "vitest";
import { buildSolPixCheckoutPayload, parseSolPixCheckoutUrl, solPixOrderNsu } from "./solPixCheckout";

const attempt = {
  id: 123,
  packageId: 45,
  contributionId: 67,
  amountCents: 20000,
  currency: "BRL",
  method: "pix",
  status: "created",
};
const config = {
  handle: "merchant-handle",
  redirectUrl: "https://htnovatech.com/",
  webhookUrl: "https://boletapp-production.up.railway.app/api/sol-pix/webhook",
};

describe("Sòl-only PIX checkout payload", () => {
  it("uses the server-stored amount and a deterministic Sòl-only order reference", () => {
    expect(buildSolPixCheckoutPayload(attempt, config)).toEqual({
      handle: "merchant-handle",
      items: [{ quantity: 1, price: 20000, description: "Sol package 45 installment 67" }],
      order_nsu: "sol-pix-123",
      redirect_url: config.redirectUrl,
      webhook_url: config.webhookUrl,
    });
    expect(solPixOrderNsu(123)).toBe("sol-pix-123");
  });
  it.each([10000, 20000, 50000, 100000])("allows fixed Sòl package amount %i cents", amountCents => {
    expect(buildSolPixCheckoutPayload({ ...attempt, amountCents }, config).items[0].price).toBe(amountCents);
  });
  it.each([
    { method: "wallet" }, { status: "confirmed" }, { currency: "USD" },
    { amountCents: 1 }, { amountCents: 19999 }, { amountCents: NaN },
    { id: -1 }, { packageId: 0 }, { contributionId: 0 },
  ])("rejects invalid checkout attempts", change => {
    expect(() => buildSolPixCheckoutPayload({ ...attempt, ...change }, config)).toThrow();
  });
  it("rejects HTTP webhook and redirect destinations", () => {
    expect(() => buildSolPixCheckoutPayload(attempt, { ...config, webhookUrl: "http://example.com/hook" })).toThrow();
    expect(() => buildSolPixCheckoutPayload(attempt, { ...config, redirectUrl: "http://example.com" })).toThrow();
  });
  it("only accepts InfinitePay HTTPS checkout URLs", () => {
    expect(parseSolPixCheckoutUrl("https://checkout.infinitepay.io/pay/123")).toBe("https://checkout.infinitepay.io/pay/123");
    expect(() => parseSolPixCheckoutUrl("http://checkout.infinitepay.io/pay/123")).toThrow();
    expect(() => parseSolPixCheckoutUrl("https://infinitepay.io.evil.com/pay")).toThrow();
    expect(() => parseSolPixCheckoutUrl("https://evil.com/pay")).toThrow();
    expect(() => parseSolPixCheckoutUrl("javascript:alert(1)")).toThrow();
    expect(() => parseSolPixCheckoutUrl(null)).toThrow();
  });
});
