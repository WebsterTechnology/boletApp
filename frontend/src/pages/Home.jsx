// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Home.module.css";
import LottoCard from "../components/LottoCard";

const Home = ({ openLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    // Redirect only if truly logged in
    if (token && location.pathname === "/") {
      navigate("/game", { replace: true });
    }
  }, [navigate, location.pathname]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Jwe</h1>
      <div className={styles.grid}>
        <LottoCard openLogin={openLogin} />
      </div>
    </div>
  );
};

export default Home;
