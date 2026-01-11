import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ✅ EmailJS config (unchanged)
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
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount);

    // 🧱 Basic form validation
    if (!form.name || !form.phone || !amount) {
      alert("❌ Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    if (amount < MIN_WITHDRAW) {
      alert(`❌ Retrait minimum: ${MIN_WITHDRAW} pwen`);
      return;
    }

    setLoading(true);

    try {
      // 🔐 STEP 1 — Get REAL user from backend
      const token = localStorage.getItem("token");
      if (!token) {
        alert("❌ Vous n'êtes pas connecté");
        return;
      }

      const res = await fetch(`${API}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Impossible de vérifier les pwen");
      }

      const user = await res.json();
      const userPoints = Number(user.points || 0);

      // 🛑 HARD SECURITY CHECKS
      if (userPoints < MIN_WITHDRAW) {
        alert(`❌ Solde insuffisant. Vous avez ${userPoints} pwen`);
        return;
      }

      if (amount > userPoints) {
        alert(
          `❌ Montant invalide.\nVous avez ${userPoints} pwen disponibles`
        );
        return;
      }

      // ✅ STEP 2 — Send Email (now safe)
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: form.name,
          email: form.email || "N/A",
          phone: form.phone,
          amount,
          message: form.message || "Aucun message",
        },
        PUBLIC_KEY
      );

      alert("✅ Demande de retrait envoyée !");
      onClose();
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("❌ Erreur lors de la demande de retrait");
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
          <input name="name" placeholder="Nom complet" value={form.name} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email (optionnel)" value={form.email} onChange={handleChange} />
          <input name="phone" placeholder="Téléphone" value={form.phone} onChange={handleChange} required />
          <input name="amount" type="number" placeholder="Montant à retirer (min 30)" value={form.amount} onChange={handleChange} required />
          <textarea name="message" placeholder="Message (optionnel)" value={form.message} onChange={handleChange} />

          <button type="submit" disabled={loading}>
            {loading ? "Vérification..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
