import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

function getErrorMessage(data, fallback = "Unable to create payment") {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;

  if (data.error && typeof data.error === "object") {
    if (typeof data.error.message === "string") return data.error.message;
    if (typeof data.error.error === "string") return data.error.error;

    try {
      return JSON.stringify(data.error);
    } catch {
      return fallback;
    }
  }

  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

export default function InfinitePayment() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePayment(e) {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    setLoading(true);

    try {
      if (!API) {
        throw new Error("Payment service is not configured.");
      }

      const response = await fetch(
        `${API}/api/infinitepay/create-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amountBRL: Number(amount),
            description: "Credits",
            name: user.name,
            email: user.email,
            phone: user.phone,
          }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { error: text } : {};
      }

      console.log("InfinitePay:", data);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const checkoutUrl =
        data.checkoutUrl ||
        data.checkout_url ||
        data.url ||
        data.link ||
        data.payment_url;

      if (!checkoutUrl || typeof checkoutUrl !== "string") {
        throw new Error("Checkout URL not returned by InfinitePay.");
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error("InfinitePay payment error:", err);
      alert(err instanceof Error ? err.message : "Unable to create payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "50px auto",
        background: "#fff",
        padding: 30,
        borderRadius: 12,
        boxShadow: "0 0 10px rgba(0,0,0,.15)",
      }}
    >
      <h2>Deposit with InfinitePay</h2>

      <form onSubmit={handlePayment}>
        <label>Amount (BRL)</label>

        <input
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 10,
            marginBottom: 20,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 15,
            border: "none",
            background: "#00995D",
            color: "#fff",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 8,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating Checkout..." : "Pay with InfinitePay"}
        </button>
      </form>
    </div>
  );
}
