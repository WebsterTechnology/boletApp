import React, { useState } from "react";
import styles from "./BuyCreditPage.module.css";
import { useNavigate } from "react-router-dom";

const BuyCreditPage = () => {
  const [selectedMethod, setSelectedMethod] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!acceptedTerms) {
      alert("Tanpri aksepte kondisyon yo.");
      return;
    }

    if (!selectedMethod) {
      alert("Tanpri chwazi yon mòd peman.");
      return;
    }

    if (selectedMethod === "credit") {
      navigate("/credit-card");
    } else if (selectedMethod === "pix") {
      navigate("/infinite-payment"); // ✅ Navigates to InfinitePayment page "/pix-payment"
    } else {
      alert(`Ou chwazi: ${selectedMethod}`);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Fòm Peman</h2>
      <p className={styles.subtitle}>Chwazi mòd ou vle peye a.</p>

      {/* 💳 Kat Kredi */}
      <div
        className={`${styles.paymentOption} ${
          selectedMethod === "credit" ? styles.selected : ""
        }`}
        onClick={() => setSelectedMethod("credit")}
      >
        <div className={styles.iconAndLabel}>
          <span role="img" aria-label="Kat Kredi">💳</span>
          <div>
            <div className={styles.label}>Kat Kredi</div>
          </div>
        </div>
      </div>

      {/* ⚡ Pix */}
      <div
        className={`${styles.paymentOption} ${
          selectedMethod === "pix" ? styles.selected : ""
        }`}
        onClick={() => setSelectedMethod("pix")}
      >
        <div className={styles.iconAndLabel}>
          <span role="img" aria-label="Pix">⚡</span>
          <div>
            <div className={styles.label}>Pix</div>
            <div className={styles.description}>Peman imedyat</div>
          </div>
        </div>
      </div>

      {/* 🧾 Boleto */}
      <div
        className={`${styles.paymentOption} ${
          selectedMethod === "boleto" ? styles.selected : ""
        }`}
        onClick={() => setSelectedMethod("boleto")}
      >
        <div className={styles.iconAndLabel}>
          <span role="img" aria-label="Boleto">🧾</span>
          <div>
            <div className={styles.label}>Boleto</div>
            <div className={styles.description}>Jenere yon tikè pou peye pita</div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className={styles.checkboxSection}>
        <input
          type="checkbox"
          id="terms"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
        />
        <label htmlFor="terms">
          <span className={styles.link}>Mwen dakò ak Kondisyon Itilizasyon</span>
        </label>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.backButton}`}>
          Retounen
        </button>
        <button
          className={`${styles.button} ${styles.continueButton}`}
          onClick={handleContinue}
          disabled={!selectedMethod || !acceptedTerms}
        >
          Kontinye
        </button>
      </div>
    </div>
  );
};

export default BuyCreditPage;
