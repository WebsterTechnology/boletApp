import React, { useState } from "react";
import styles from "../style/WithdrawModal.module.css";

const WithdrawModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // simple validation (safe, no regex)
    if (!form.name || !form.phone || !form.amount) {
      alert("Tanpri ranpli tout chan obligatwa yo");
      return;
    }

    console.log("Withdraw request:", form);

    // later: EmailJS or API call here

    alert("Demann ou an voye ✔️");
    onClose(); // close modal after submit
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>
          ✕
        </button>

        <h2>Retire Pwen</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Nom complet"
            value={form.name}
            onChange={handleChange}
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
          />

          <input
            type="number"
            name="amount"
            placeholder="Montant à retirer"
            value={form.amount}
            onChange={handleChange}
          />

          <textarea
            name="message"
            placeholder="Message (optionnel)"
            value={form.message}
            onChange={handleChange}
          />

          <button type="submit">Envoyer</button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
