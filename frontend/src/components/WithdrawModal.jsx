import React, { useEffect, useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

const SERVICE_ID = "service_lr5adiq";
const TEMPLATE_ID = "template_vsokyke";
const PUBLIC_KEY = "ZgNnVzZlDI3N9hwfj";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const WithdrawModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    message: "",
  });

  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(false);

  // 🔒 FETCH REAL POINTS FROM BACKEND
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${API}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const user = await res.json();
        setUserPoints(Number(user.points || 0));
      } catch (err) {
        console.error("Failed to fetch points:", err);
      }
    };

    fetchPoints();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(form.amount);

    // ❌ BASIC CHECKS
    if (!form.name || !form.phone || !amount) {
      alert("Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    // ❌ MINIMUM 30 PWEN
    if (userPoints < 30) {
      alert("❌ Ou bezwen omwen 30 pwen pou retire");
      return;
    }

    // ❌ ASKING MORE THAN AVAILABLE
    if (amount > userPoints) {
      alert(`❌ Ou gen sèlman ${userPoints} pwen`);
      return;
    }

    // ❌ ASKING LESS THAN 30
    if (amount < 30) {
      alert("❌ Retrait minimum: 30 pwen");
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
    } catch (error) {
      console.error("EmailJS error:", error);
      alert("❌ Erreur lors de l'envoi. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <h2>Retire Pwen</h2>
        <p style={{ opacity: 0.7 }}>
          Solde disponible : <strong>{userPoints} P</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Nom complet" value={form.name} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email (optionnel)" value={form.email} onChange={handleChange} />
          <input name="phone" placeholder="Téléphone" value={form.phone} onChange={handleChange} required />
          <input name="amount" type="number" placeholder="Montant à retirer" value={form.amount} onChange={handleChange} required />
          <textarea name="message" placeholder="Message (optionnel)" value={form.message} onChange={handleChange} />

          <button type="submit" disabled={loading}>
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
