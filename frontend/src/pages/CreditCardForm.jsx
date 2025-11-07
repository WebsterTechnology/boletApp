import React, { useState } from "react";
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import styles from "./CreditCardForm.module.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Load public key from .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
//console.log("Stripe Public Key:", import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [cardName, setCardName] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    const intAmount = parseInt(amount, 10);
    if (!intAmount || intAmount <= 0) {
      setStatus("❌ Tanpri antre kantite pwen.");
      setLoading(false);
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card: elements.getElement(CardElement),
        billing_details: { name: cardName },
      });

      if (pmError) {
        setStatus(pmError.message);
        setLoading(false);
        return;
      }

      const { data } = await axios.post("http://localhost:3001/api/stripe", {
        amount: intAmount,
        paymentMethodId: paymentMethod.id,
        userId: storedUser?.id,
      });

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (result.error) {
        setStatus(result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        setStatus("✅ Peman an fèt avèk siksè!");
        window.dispatchEvent(new Event("pointsUpdated")); // refresh UI
        navigate("/");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Erè pandan tranzaksyon an.");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.title}>Enfòmasyon Kat Kredi</h2>

      <label>Kantite Pwen Pou Achte</label>
      <input
        type="number"
        placeholder="10"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      <label>👤 Non sou Kat la</label>
      <input
        type="text"
        placeholder="Ada Lovelace"
        value={cardName}
        onChange={(e) => setCardName(e.target.value)}
        required
      />

      <label>💳 Antre detay kat ou (sekirite)</label>
      <CardElement options={{ style: { base: { fontSize: "16px" } } }} />

      <div className={styles.actions}>
        <button type="submit" disabled={!stripe || loading}>
          {loading ? "Ap trete..." : "Finalize Acha"}
        </button>
      </div>

      {status && <p>{status}</p>}
    </form>
  );
};

const CreditCardForm = () => {
  return (
    <div className={styles.container}>
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
};

export default CreditCardForm;
