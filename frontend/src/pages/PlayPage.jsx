
import React, { useState, useEffect } from "react"; // ✅ add useEffect
import { useNavigate } from "react-router-dom"; // ✅ add this
import styles from "./PlayPage.module.css";
import YonChif from "../components/YonChif";
import DeChif from "../components/DeChif"; // ✅ NEW
import Maryaj from "../components/Maryaj";
import TwaChif from "../components/TwaChif";
import Katchif from "../components/Katchif"; // ✅ NEW
import Video from "../components/Video";
import BetCart from "../components/BetCart";

const PlayPage = () => {
  const [mode, setMode] = useState("yon_chif");
  const [loading, setLoading] = useState(true); // ✅ NEW
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    fetch("/api/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error();
        setLoading(false); // ✅ allow page
      })
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/");
      });
  }, [navigate]);

  // ⛔ BLOCK UI until verified
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.playPage}>
      <nav className={styles.modeSelector}>
        <button
          className={mode === "yon_chif" ? styles.active : ""}
          onClick={() => setMode("yon_chif")}
        >
          Yon Chif
        </button>

        <button
          className={mode === "de_chif" ? styles.active : ""}
          onClick={() => setMode("de_chif")}
        >
          Bòlèt
        </button>

        <button
          className={mode === "maryaj" ? styles.active : ""}
          onClick={() => setMode("maryaj")}
        >
          Maryaj
        </button>

        <button
          className={mode === "twa_chif" ? styles.active : ""}
          onClick={() => setMode("twa_chif")}
        >
          Twa Chif
        </button>

        <button
          className={mode === "katchif" ? styles.active : ""}
          onClick={() => setMode("katchif")}
        >
          Katchif
        </button>
      </nav>

      <div className={styles.content}>
        {mode === "yon_chif" && <YonChif />}
        {mode === "de_chif" && <DeChif />}
        {mode === "maryaj" && <Maryaj />}
        {mode === "twa_chif" && <TwaChif />}
        {mode === "katchif" && <Katchif />}
      </div>

      {/* ⬇️ Unified cart always visible */}
      <div className={styles.cartSection}>
        <BetCart />
      </div>

      <Video />
    </div>
  );
};

export default PlayPage;
