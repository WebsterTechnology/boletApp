import { afterEach, describe, expect, it, vi } from "vitest";
import { createBorrowPixCheckout } from "./borrowPixCheckout";

afterEach(()=>vi.unstubAllGlobals());

describe("loan InfinitePay hosted checkout",()=>{
  const input={
    handle:"merchant123",apiKey:"test_checkout_key",orderNsu:"loan_pix_order_123456789",
    points:60,redirectUrl:"https://example.com/loan/return",
    webhookUrl:"https://api.example.com/api/borrow-pix/webhook"
  };
  it("sends 100 cents per point and does not claim a payment is settled",async()=>{
    const fetchMock=vi.fn().mockResolvedValue({
      ok:true,json:async()=>({url:"https://checkout.infinitepay.io/checkout/123"})
    });
    vi.stubGlobal("fetch",fetchMock);
    const result=await createBorrowPixCheckout(input);
    expect(result.checkoutUrl).toContain("infinitepay.io");
    const [url,request]=fetchMock.mock.calls[0];
    expect(url).toBe("https://api.checkout.infinitepay.io/links");
    const payload=JSON.parse(request.body);
    expect(payload.order_nsu).toBe(input.orderNsu);
    expect(payload.items[0].price).toBe(6000);
    expect(payload.webhook_url).toBe(input.webhookUrl);
    expect(payload.options.payment_methods_enabled).toEqual(["pix"]);
    expect(request.headers["X-Api-Key"]).toBe(input.apiKey);
  });
  it("refuses a checkout without a key to guarantee PIX-only payment", async()=>{
    const fetchMock=vi.fn();
    vi.stubGlobal("fetch",fetchMock);
    await expect(createBorrowPixCheckout({...input,apiKey:""})).rejects.toThrow("PIX-only");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects non-HTTPS callback addresses without contacting provider",async()=>{
    const fetchMock=vi.fn();
    vi.stubGlobal("fetch",fetchMock);
    await expect(createBorrowPixCheckout({...input,webhookUrl:"http://example.com/callback"})).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects a checkout URL from an untrusted domain",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({
      ok:true,json:async()=>({url:"https://infinitepay.io.evil.example/checkout"})
    }));
    await expect(createBorrowPixCheckout(input)).rejects.toThrow("Untrusted");
  });
  it("rejects provider failure and invalid amounts",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false}));
    await expect(createBorrowPixCheckout(input)).rejects.toThrow();
    await expect(createBorrowPixCheckout({...input,points:0})).rejects.toThrow();
  });
});
