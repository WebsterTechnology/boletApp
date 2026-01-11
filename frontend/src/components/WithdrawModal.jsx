import React, { useState } from "react";
import styles from "../style/WithdrawModal.module.css";

const WithdrawModal = ({ onClose }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    message: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(form);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>
        <h2>Retire Pwen</h2>

        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Nom" onChange={handleChange} />
          <input name="email" placeholder="Email" onChange={handleChange} />
          <input name="phone" placeholder="Téléphone" onChange={handleChange} />
          <input name="amount" placeholder="Montant" onChange={handleChange} />
          <button type="submit">Envoyer</button>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
