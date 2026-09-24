import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

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

      const data = await response.json();

      console.log("InfinitePay:", data);

      if (!response.ok) {
        throw new Error(data.error || "Unable to create payment");
      }

      if (!data.checkoutUrl && !data.url) {
        throw new Error("Checkout URL not returned");
      }

      // Redirect to InfinitePay
      window.location.href = data.checkoutUrl || data.url;

    } catch (err) {
      console.error(err);
      alert(err.message);
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
            cursor: "pointer",
            borderRadius: 8,
          }}
        >
          {loading ? "Creating Checkout..." : "Pay with InfinitePay"}
        </button>
      </form>
    </div>
  );
}