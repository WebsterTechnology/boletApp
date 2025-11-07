import React, { useState, useMemo } from "react";
import { getCountryCallingCode, getCountries } from "libphonenumber-js";
import * as countryList from "country-codes-list";
import { FaChevronDown, FaEye } from "react-icons/fa";
import styles from "../style/RegisterModal.module.css";

const RegisterModal = ({ onClose }) => {
  const countries = useMemo(() => {
    const validISOs = getCountries();
    return Object.entries(countryList.customList("countryCode", "{countryNameEn}"))
      .filter(([iso]) => validISOs.includes(iso))
      .map(([iso, name]) => ({
        name,
        code: "+" + getCountryCallingCode(iso),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === "+509") || countries[0]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdult, setIsAdult] = useState(false);

  const fullPhone = `${selectedCountry.code}${phone}`;

  const handleRegister = async () => {
  try {
    const res = await fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fullPhone.trim(),
        password: password.toString().trim(),
      }),
    });

    const data = await res.json();
    if (res.ok) {
      // ✅ Save both full phone & user object
      localStorage.setItem("user", JSON.stringify({ phone: fullPhone }));
      localStorage.setItem("userPhone", fullPhone); // ✅ Needed by Header
      window.dispatchEvent(new Event("userLoggedIn")); // ✅ Let Header know
      
    
      window.location.href = "/game"; // ✅ You can change this if needed
    } else {
      alert("❌ " + data.message);
    }
  } catch (err) {
    console.error("Register error:", err);
    alert("❌ Erè pandan ou te kreye kont la");
  }
};


  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <h2 className={styles.title}>Ouvè yon kont</h2>

        <div className={styles.phoneInputWrapper}>
          <div
            className={styles.code}
            onClick={() => setShowPicker(!showPicker)}
            style={{ background: "#000", color: "#fff" }}
          >
            {selectedCountry.code} <FaChevronDown size={10} />
          </div>
          <input
            type="tel"
            placeholder="Antre nimewo telefòn mobil ou"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {showPicker && (
          <div className={styles.countryList}>
            <div className={styles.pickerTitle}>Chwazi Peyi</div>
            {countries.map((c, index) => (
              <div
                key={index}
                className={styles.countryOption}
                onClick={() => {
                  setSelectedCountry(c);
                  setShowPicker(false);
                }}
              >
                {c.name} <span className={styles.countryCode}>({c.code})</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.passwordInputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Chwazi yon kòd sekrè *"
            className={styles.input}
            maxLength={4}
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
          />
          <FaEye
            className={styles.eyeIcon}
            onClick={() => setShowPassword(!showPassword)}
          />
        </div>
        <small style={{ fontSize: "0.75rem", color: "#888" }}>
          *Pa plis pase 4 chif
        </small>

        <div className={styles.checkboxWrapper}>
          <input
            type="checkbox"
            id="ageConfirm"
            checked={isAdult}
            onChange={(e) => setIsAdult(e.target.checked)}
          />
          <label htmlFor="ageConfirm">Mwen gen 18 lane oswa plis</label>
        </div>

        <button
          className={styles.submitBtn}
          style={{ marginTop: "1.5rem" }}
          onClick={handleRegister}
          disabled={
            !isAdult ||
            phone.length < 6 ||
            password.length !== 4
          }
        >
          OUVÈ YON KONT
        </button>

        <div className={styles.dividerLine}>
          <span className={styles.orText}>OSWA</span>
        </div>

        <button className={styles.altBtn}>RANTRE SOU KONT OU</button>

        <p className={styles.note}>
          Si'w jwe ak Websmobil, sa vle di ou aksepte tout kondisyon nou yo{" "}
          <a href="#">Kondisyon nou yo</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterModal;
