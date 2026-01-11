import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

// ✅ EmailJS config (frontend only – OK)
const SERVICE_ID = "service_lr5adiq";
const TEMPLATE_ID = "template_vsokyke";
const PUBLIC_KEY = "ZgNnVzZlDI3N9hwfj"; 

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ basic validation
    if (!form.name || !form.phone || !form.amount) {
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
          amount: form.amount,
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
            placeholder="Montant à retirer"
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
