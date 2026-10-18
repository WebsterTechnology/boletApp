// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import LottoCard from "../components/LottoCard";

const Home = ({ openLogin }: { openLogin: () => void }) => {
  const navigate = useNavigate();
  const enter = (destination: string) => { if (localStorage.getItem("token")) { navigate(destination); return; } sessionStorage.setItem("postAuthDestination", destination); openLogin(); };



  return (
    <div className={styles.container}>
      {/* <h1 className={styles.title}>Jwe</h1> */}
      <div className={styles.grid}>
        <LottoCard openLogin={() => enter("/game")} />
        <article className={styles.solCard}><div className={styles.solHero}>Sòl <span>BYENTO</span></div><div className={styles.solBody}><h3>Sòl</h3><p>Yon nouvo espas ap vini byento.</p><button type="button" onClick={() => enter("/sol")}>ANTRE NAN SÒL</button></div></article>
      </div>
    </div>
  );
};

export default Home;

