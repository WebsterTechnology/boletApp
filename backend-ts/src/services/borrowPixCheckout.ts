/** Hosted Brazilian InfinitePay checkout. No money is marked paid by this call. */
export async function createBorrowPixCheckout(input:{
  handle:string; orderNsu:string; points:number; redirectUrl:string;
  webhookUrl:string; apiKey:string;
}):Promise<{checkoutUrl:string}> {
  // InfinitePay requires an API key to enforce a PIX-only checkout. Without it,
  // customers could select a card payment that the loan settlement rejects.
  if (typeof input.apiKey !== "string" || !input.apiKey.trim())
    throw new Error("PIX-only checkout requires an InfinitePay API key");
  if (!/^[a-zA-Z0-9_.-]{2,100}$/.test(input.handle) ||
      !/^[a-zA-Z0-9_-]{16,128}$/.test(input.orderNsu) ||
      !Number.isSafeInteger(input.points) || input.points<1 ||
      input.points>21474836)
    throw new Error("Invalid loan PIX checkout details");
  for (const url of [input.redirectUrl,input.webhookUrl]) {
    const parsed=new URL(url);
    if(parsed.protocol!=="https:" || parsed.username || parsed.password)
      throw new Error("PIX callback URLs must use HTTPS");
  }
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch("https://api.checkout.infinitepay.io/links",{
      method:"POST",
      headers:{"Content-Type":"application/json","X-Api-Key":input.apiKey},
      body:JSON.stringify({
        handle:input.handle,
        order_nsu:input.orderNsu,
        items:[{description:"Pagamento de empréstimo Bolet",price:input.points*100,quantity:1}],
        redirect_url:input.redirectUrl,
        webhook_url:input.webhookUrl,
        options:{payment_methods_enabled:["pix"]}
      }),
      signal:controller.signal
    });
    if(!response.ok) throw new Error("InfinitePay checkout request failed");
    const result:unknown=await response.json();
    if(!result || typeof result!=="object") throw new Error("Invalid InfinitePay checkout response");
    const data=result as Record<string,unknown>;
    const checkoutUrl=data.url;
    if(typeof checkoutUrl!=="string") throw new Error("Missing InfinitePay checkout URL");
    const parsed=new URL(checkoutUrl);
    if(parsed.protocol!=="https:" || !(parsed.hostname==="infinitepay.io" || parsed.hostname.endsWith(".infinitepay.io")))
      throw new Error("Untrusted InfinitePay checkout URL");
    return {checkoutUrl};
  } finally {clearTimeout(timeout);}
}
