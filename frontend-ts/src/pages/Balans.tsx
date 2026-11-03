import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "../api/types";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";
import styles from "./Balans.module.css";

export default function Balans() {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawable, setWithdrawable] = useState(0);
  const [borrowable, setBorrowable] = useState(0);
  const refreshBalances = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;

      const user: MeUser = await response.json();
      setWithdrawable(Number(user.withdrawablePoints ?? 0));
      setBorrowable(Number(user.borrowablePoints ?? 0));

      // Keep the same current-user cache used by the rest of the app in sync.
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userPoints", String(Number(user.points ?? 0)));
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    }
  }, []);

  useEffect(() => {
    refreshBalances();

    // Refresh again when the user returns to this tab/page.
    const onFocus = () => refreshBalances();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshBalances();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshBalances, showWithdraw]);

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-label="Balans kont ou">
        <header className={styles.header}>
          <div className={styles.headingGroup}>
            <span className={styles.headerIcon} aria-hidden="true">💼</span>
            <div>
              <p className={styles.eyebrow}>Kont HTNovaTech</p>
              <h1 className={styles.heading}>Balans ou</h1>
              <p className={styles.subtitle}>Gade tout balans ou yo yon sèl kote</p>
            </div>
          </div>
          <button type="button" className={styles.backButton} onClick={() => navigate(-1)} aria-label="Retounen nan paj anvan an">←</button>
        </header>

        <div className={styles.balances}>
          <div className={`${styles.balanceCard} ${styles.playCard}`}>
            <div className={styles.balanceIcon} aria-hidden="true">⭐</div>
            <div className={styles.balanceContent}>
              <p className={styles.balanceLabel}>Balans pou jwe</p>
              <div className={styles.playValue}><Pwen label /></div>
            </div>
          </div>

          <div className={`${styles.balanceCard} ${styles.withdrawCard}`}>
            <div className={styles.balanceIcon} aria-hidden="true">↗</div>
            <div className={styles.balanceContent}>
              <p className={styles.balanceLabel}>Disponib pou retire</p>
              <strong className={styles.amount}>{withdrawable.toLocaleString("pt-BR")} <span className={styles.unit}>pwen</span></strong>
            </div>
          </div>

          <div className={`${styles.balanceCard} ${styles.borrowCard}`}>
            <div className={styles.balanceIcon} aria-hidden="true">◇</div>
            <div className={styles.balanceContent}>
              <p className={styles.balanceLabel}>Disponib pou prete</p>
              <strong className={styles.amount}>{borrowable.toLocaleString("pt-BR")} <span className={styles.unit}>pwen</span></strong>
              <p className={styles.helper}>Limit admin lan mete disponib pou ou</p>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.action} ${styles.buyButton}`} onClick={() => navigate("/buy-credits")}>
            <span aria-hidden="true">＋</span> Achte Pwen
          </button>
          <button type="button" className={`${styles.action} ${styles.withdrawButton}`} onClick={() => setShowWithdraw(true)}>
            <span aria-hidden="true">↗</span> Retire Pwen
          </button>
        </div>
      </section>
      {showWithdraw && <WithdrawModal onClose={() => { setShowWithdraw(false); void refreshBalances(); }} />}
    </main>
  );
}
