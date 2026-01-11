import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

// ❗ DO NOT CHANGE (as requested)
const SERVICE_ID = "service_lr5adiq";
const TEMPLATE_ID = "template_vsokyke";
const PUBLIC_KEY = "ZgNnVzZlDI3N9hwfj";

// backend API
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// rules
const MIN_WITHDRAW = 30;

const WithdrawModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔒 REAL SYSTEM CHECK (source of truth)
  const fetchRealPoints = async () => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${API}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error("Failed to fetch user");

    const user = await res.json();
    return Number(user.points || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount);

    // basic form validation
    if (!form.name || !form.phone || !amount) {
      alert("❌ Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    setLoading(true);

    try {
      // ✅ fetch REAL points from backend
      const realPoints = await fetchRealPoints();

      // ❌ rule 1: minimum withdraw
      if (realPoints < MIN_WITHDRAW) {
        alert(`❌ Ou bezwen omwen ${MIN_WITHDRAW} pwen pou retire`);
        return;
      }

      // ❌ rule 2: cannot exceed balance
      if (amount > realPoints) {
        alert("❌ Ou pa gen ase pwen pou montan sa");
        return;
      }

      // ✅ only now send EmailJS
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: form.name,
          email: form.email || "Non fourni",
          phone: form.phone,
          amount: amount,
          message: form.message || "Aucun message",
        },
        PUBLIC_KEY
      );

      alert("✅ Demande de retrait envoyée !");
      onClose();
    } catch (error) {
      console.error("Withdraw error:", error);
      alert("❌ Erè sistèm. Tanpri eseye ankò");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <h2>Retire Pwen</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Nom complet"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email (optionnel)"
            value={form.email}
            onChange={handleChange}
          />

          <input
            type="text"
            name="phone"
            placeholder="Téléphone"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="amount"
            placeholder="Montant à retirer (min 30)"
            value={form.amount}
            onChange={handleChange}
            required
          />

          <textarea
            name="message"
            placeholder="Message (optionnel)"
            value={form.message}
            onChange={handleChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Vérification..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
