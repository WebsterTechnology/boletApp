// src/components/WithdrawModal.jsx
import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ❗ DO NOT CHANGE (as requested)
const SERVICE_ID = "service_lr5adiq";
const TEMPLATE_ID = "template_vsokyke";
const PUBLIC_KEY = "ZgNnVzZlDI3N9hwfj";

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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Basic field validation
    if (!form.name || !form.phone || !form.amount) {
      alert("❌ Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    const amount = Number(form.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("❌ Montan pa valab");
      return;
    }

    setLoading(true);

    try {
      // 🔐 STEP 1 — GET REAL USER FROM BACKEND
      const token = localStorage.getItem("token");
      if (!token) {
        alert("❌ Ou pa konekte");
        return;
      }

      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("❌ Erè serve. Réessayez.");
        return;
      }

      const user = await res.json();
      const userPoints = Number(user.points || 0);

      // ❌ RULE 1 — MINIMUM 30 PWEN
      if (userPoints < MIN_WITHDRAW) {
        alert("❌ Retrait minimum: 30 pwen");
        return;
      }

      // ❌ RULE 2 — ASKING MORE THAN AVAILABLE
      if (amount > userPoints) {
        alert("❌ Pwen ensifizan");
        return;
      }

      // ✅ STEP 2 — SEND EMAIL ONLY IF VALID
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: form.name,
          email: form.email || "N/A",
          phone: form.phone,
          amount: amount,
          message: form.message || "Aucun message",
        },
        PUBLIC_KEY
      );

      alert("✅ Demande de retrait envoyée !");
      onClose();
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("❌ Une erreur est survenue");
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
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
