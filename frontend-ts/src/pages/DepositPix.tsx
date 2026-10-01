// src/pages/DepositPix.tsx
// Not routed anywhere. It expects a Stripe clientSecret from /api/pix/create, which
// backend-ts (Asaas) does not return, so it cannot work against the current API.
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY; // pk_test_...

/** The PIX fields this page looks for on Stripe's next_action (not in Stripe's types). */
interface PixQrAction {
  qr_code?: string;
  image_url?: string;
  content?: string;
}

export default function DepositPix() {
  const [amount, setAmount] = useState(90);
  const [clientSecret, setClientSecret] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const token = localStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  async function createPix() {
    // 1) Ask your backend to create the PIX PaymentIntent
    const res = await axios.post(`${API}/api/pix/create`, { amountBRL: amount }, auth);
    setClientSecret(res.data.clientSecret);
    setStatus("created");
  }

  useEffect(() => {
    if (!clientSecret) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    (async () => {
      // 2) Use Stripe.js to retrieve the PaymentIntent and its next_action (PIX QR)
      const stripe = (await loadStripe(PUBLISHABLE_KEY as string))!;
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

      // Stripe often returns the QR under next_action.pix_display_qr_code
      const next = paymentIntent?.next_action as unknown as Record<string, PixQrAction | undefined> | null | undefined;
      const maybePix = next?.pix_display_qr_code || next?.display_bank_transfer_instructions;
      if (maybePix?.qr_code || maybePix?.image_url || maybePix?.content) {
        setQr(maybePix.qr_code || maybePix.content || maybePix.image_url || null);
      }
      setStatus(paymentIntent!.status);

      // 3) Optional: poll to update UI until webhook marks it 'succeeded'
      intervalId = setInterval(async () => {
        const { paymentIntent: pi } = await stripe.retrievePaymentIntent(clientSecret);
        setStatus(pi!.status);
        // You could also break when pi.status === 'succeeded'
      }, 3000);
    })();

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [clientSecret]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Deposit by PIX</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <button onClick={createPix}>Create PIX</button>
      </div>

      {clientSecret && (
        <>
          <p>Status: {status}</p>
          {qr && (
            <>
              <p>Scan this PIX QR in your bank app:</p>
              {/* If you receive a data URL (image), show <img src={qr} />.
                 If you receive an EMV/QR string, render it with a QR lib like 'qrcode.react'. */}
              <img src={qr} alt="PIX QR" />
            </>
          )}
          <p>After paying, admin can credit your points in the dashboard.</p>
        </>
      )}
    </div>
  );
}

