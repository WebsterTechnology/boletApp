import React, { useState, useMemo, type ChangeEvent } from "react";
import { getCountryCallingCode, getCountries, type CountryCode } from "libphonenumber-js";
import * as countryList from "country-codes-list";
import { FaChevronDown, FaEye } from "react-icons/fa";
import styles from "../style/RegisterModal.module.css";

const RegisterModal = ({ onClose }: { onClose: () => void }) => {
  const countries = useMemo(() => {
    const validISOs = getCountries();
    return Object.entries(countryList.customList("countryCode", "{countryNameEn}"))
      .filter(([iso]) => validISOs.includes(iso as CountryCode))
      .map(([iso, name]) => ({
        name,
        code: "+" + getCountryCallingCode(iso as CountryCode),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === "+55") || countries[0]
  );
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ fullName:"", email:"", confirmPassword:"" });
  const field = (name: "fullName" | "email") => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdult, setIsAdult] = useState(false);

  const fullPhone = `${selectedCountry.code}${phone}`;

const API = import.meta.env.VITE_API_URL;

const handleRegister = async () => {
  if (!isAdult) return alert("Ou dwe gen 18 lane oswa plis.");
  if (!form.fullName.trim() || !form.email.trim()) return alert("Tanpri antre non ak e-mail ou.");
  if (password !== form.confirmPassword) return alert("PIN yo pa menm.");

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fullPhone.trim(),
        password: password.toString().trim(),
        ...form,
        confirmPassword: undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert("❌ " + (data.message || "Enskripsyon echwe"));
      return;
    }

    // ✅ SAVE FULL AUTH SESSION (SAME AS LOGIN)
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("userId", String(data.user.id));
    localStorage.setItem("userPhone", data.user.phone || fullPhone);
    localStorage.setItem("token", data.token);
    localStorage.setItem("isAdmin", JSON.stringify(!!data.user?.isAdmin));
    localStorage.setItem("userPoints", String(data.user?.points ?? 0));

    // notify app
    window.dispatchEvent(new Event("userLoggedIn"));
    window.dispatchEvent(new Event("pointsUpdated"));

    // new users already have a complete profile
    window.location.href = "/";
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

        <input className={styles.input} placeholder="Non konplè *" value={form.fullName} onChange={field("fullName")} />

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

        <input className={styles.input} type="email" placeholder="Imèl *" value={form.email} onChange={field("email")} style={{marginTop:10}} />

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
        <input type="password" inputMode="numeric" maxLength={4} placeholder="Konfime PIN ou *" className={styles.input} value={form.confirmPassword} onChange={(e)=>setForm(f=>({...f,confirmPassword:e.target.value.replace(/\D/g,"").slice(0,4)}))} style={{marginTop:10}} />
        <small className={styles.pinHelp}>PIN nan dwe gen egzakteman 4 chif</small>

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
            password.length !== 4 || form.confirmPassword.length !== 4
          }
        >
          OUVÈ YON KONT
        </button>

        <div className={styles.dividerLine}>
          <span className={styles.orText}>OSWA</span>
        </div>

        <button className={styles.altBtn} onClick={onClose}>RANTRE SOU KONT OU</button>

        <p className={styles.note}>
          Si'w jwe ak Websmobil, sa vle di ou aksepte tout kondisyon nou yo{" "}
          <a href="#">Kondisyon nou yo</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterModal;

