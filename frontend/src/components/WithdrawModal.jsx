import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ❌ DO NOT CHANGE (as requested)
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

  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔐 Fetch REAL points from backend
  useEffect(() => {
    const fetchUserPoints = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Not authorized");

        const user = await res.json();
        setUserPoints(Number(user.points || 0));
      } catch (err) {
        console.error("Failed to fetch user points", err);
        setUserPoints(0);
      }
    };

    fetchUserPoints();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userPoints === null) {
      alert("Chargement de vos points...");
      return;
    }

    const amount = Number(form.amount);

    // ❌ HARD RULES (SYSTEM ENFORCED)
    if (userPoints < MIN_WITHDRAW) {
      alert(`❌ Retrait impossible. Minimum ${MIN_WITHDRAW} pwen requis.`);
      return;
    }

    if (amount < MIN_WITHDRAW) {
      alert(`❌ Le montant minimum est ${MIN_WITHDRAW} pwen.`);
      return;
    }

    if (amount > userPoints) {
      alert("❌ Vous n’avez pas assez de pwen.");
      return;
    }

    if (!form.name || !form.phone || !amount) {
      alert("Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    setLoading(true);

    try {
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
      console.error("EmailJS error:", err);
      alert("❌ Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <h2>Retire Pwen</h2>

        {userPoints !== null && (
          <p className={styles.balance}>Solde: {userPoints} pwen</p>
        )}

        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Nom complet" onChange={handleChange} required />
          <input name="email" placeholder="Email (optionnel)" onChange={handleChange} />
          <input name="phone" placeholder="Téléphone" onChange={handleChange} required />
          <input type="number" name="amount" placeholder="Montant à retirer" onChange={handleChange} required />
          <textarea name="message" placeholder="Message (optionnel)" onChange={handleChange} />

          <button type="submit" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
