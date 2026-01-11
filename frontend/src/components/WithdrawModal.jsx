import React, { useState } from "react";
import emailjs from "@emailjs/browser";
import styles from "../style/WithdrawModal.module.css";

const WithdrawModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    method: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    emailjs
      .send(
        "YOUR_SERVICE_ID",
        "YOUR_TEMPLATE_ID",
        form,
        "YOUR_PUBLIC_KEY"
      )
      .then(() => {
        setSuccess(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        alert("Failed to send request");
      });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <h2>Retire Pwen</h2>

        {success ? (
          <p className={styles.success}>
            Demande envoyée avec succès. Nou pral kontakte w.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input name="name" placeholder="Nom complet" onChange={handleChange} required />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
            <input name="phone" placeholder="Téléphone" onChange={handleChange} required />
            <input name="amount" placeholder="Montant à retirer" onChange={handleChange} required />

            <select name="method" onChange={handleChange} required>
              <option value="">Méthode de paiement</option>
              <option value="MonCash">MonCash</option>
              <option value="Zelle">Zelle</option>
              <option value="Bank">Bank Transfer</option>
            </select>

            <textarea
              name="message"
              placeholder="Message optionnel"
              onChange={handleChange}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default WithdrawModal;
