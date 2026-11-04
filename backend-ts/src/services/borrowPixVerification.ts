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
    (response.capture_method === "pix" || response.capture_method === "credit_card") &&
    typeof response.amount === "number" &&
    Number.isSafeInteger(response.amount) &&
    response.amount === expectedAmountCents;
}

/** Always query InfinitePay over HTTPS; callback fields are identifiers, not proof. */
export async function checkBorrowPixWithProvider(input: {
  handle:string; orderNsu:string; transactionNsu:string; slug:string;
  apiKey?:string;
}): Promise<PixVerification> {
  if (![input.handle,input.orderNsu,input.transactionNsu,input.slug].every(
    value=>typeof value==="string" && value.length>0 && value.length<=255
  )) throw new Error("Invalid PIX payment identifiers");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch("https://api.checkout.infinitepay.io/payment_check",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        ...(input.apiKey?{"X-Api-Key":input.apiKey}:{})
      },
      body:JSON.stringify({
        handle:input.handle,order_nsu:input.orderNsu,
        transaction_nsu:input.transactionNsu,slug:input.slug
      }),
      signal:controller.signal
    });
    if (!response.ok) throw new Error("InfinitePay verification unavailable");
    const body:unknown=await response.json();
    if (!body || typeof body!=="object" || Array.isArray(body))
      throw new Error("Invalid InfinitePay verification response");
    return body as PixVerification;
  } finally {clearTimeout(timeout);}
}
