import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "../api/types";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";
import styles from "./Balans.module.css";

type BorrowRequest = { id:number; amount:number; reason:string; status:"pending"|"approved"|"rejected"; createdAt:string; reviewedAt:string|null; creditedAt:string|null };
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const statusLabel:Record<BorrowRequest["status"],string> = {
  pending:"🟠 Annatant", approved:"✅ Apwouve", rejected:"❌ Refize"
};
export default function Balans() {
  const [requestOpen,setRequestOpen] = useState(false);
  const [requestAmount,setRequestAmount] = useState("");
  const [requestReason,setRequestReason] = useState("");
  const [requests,setRequests] = useState<BorrowRequest[]>([]);
  const [requestError,setRequestError] = useState("");
  const [requestBusy,setRequestBusy] = useState(false);
  const refreshRequests = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API}/api/borrow-requests/mine`, {headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      if (response.ok) setRequests(await response.json() as BorrowRequest[]);
    } catch { /* Remain on balance page if history is temporarily unavailable. */ }
  },[]);
  const sendBorrowRequest = async () => {
    const amount = Number(requestAmount);
    if (!Number.isSafeInteger(amount) || amount<=0 || amount>borrowable || !requestReason.trim()) {
      setRequestError("Antre yon kantite valid nan limit ou epi chwazi yon rezon.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {setRequestError("Ou dwe konekte pou mande yon prè.");return;}
    setRequestBusy(true);setRequestError("");
    try {
      const response = await fetch(`${API}/api/borrow-requests`, {
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({amount,reason:requestReason.trim()})
      });
      const data = await response.json() as {message?:string};
      if (!response.ok) throw new Error(data.message || "Demann prè a pa pase.");
      setRequestOpen(false);setRequestAmount("");setRequestReason("");
      await refreshRequests();
    } catch(error) {
      setRequestError(error instanceof Error ? error.message : "Demann prè a pa pase.");
    } finally {setRequestBusy(false);}
  };
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
    void refreshRequests();

    // Refresh again when the user returns to this tab/page.
    const onFocus = () => { void refreshBalances(); void refreshRequests(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") { void refreshBalances(); void refreshRequests(); }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshBalances, refreshRequests, showWithdraw]);

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
              <p className={styles.balanceLabel}>Disponib pou jwe</p>
              <div className={styles.playValue}><Pwen plain /></div>
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
              <button type="button" className={styles.requestButton} disabled={borrowable <= 0 || requests.some(r=>r.status==="pending")} onClick={()=>{setRequestError("");setRequestOpen(true);}}>Mande yon prè</button>
            </div>
          </div>
        </div>

        <section className={styles.requestHistory}>
          <h2>Demann prè mwen yo</h2>
          {requests.length===0 && <p>Ou poko voye okenn demann prè.</p>}
          {requests.map(request=><div className={styles.requestRow} key={request.id}>
            <span>{request.amount.toLocaleString("pt-BR")} pwen · {request.reason}</span>
            <strong>{statusLabel[request.status]}{request.status==="approved" ? (request.creditedAt ? " · Kredite" : " · Poko kredite") : ""}</strong>
          </div>)}
        </section>
        <div className={styles.actions}>
          <button type="button" className={`${styles.action} ${styles.buyButton}`} onClick={() => navigate("/buy-credits")}>
            <span aria-hidden="true">＋</span> Achte Pwen
          </button>
          <button type="button" className={`${styles.action} ${styles.withdrawButton}`} onClick={() => setShowWithdraw(true)}>
            <span aria-hidden="true">↗</span> Retire Pwen
          </button>
        </div>
      </section>
      {requestOpen && <div className={styles.modalBackdrop} role="presentation" onClick={()=>{if(!requestBusy)setRequestOpen(false);}}>
        <div className={styles.requestModal} role="dialog" aria-modal="true" aria-labelledby="borrow-title" onClick={e=>e.stopPropagation()}>
          <h2 id="borrow-title">Mande yon prè</h2>
          <p>Limit ou disponib: <strong>{borrowable.toLocaleString("pt-BR")} pwen</strong></p>
          <label htmlFor="borrow-amount">Konbyen pwen ou vle prete?</label>
          <input id="borrow-amount" type="number" min={1} max={borrowable} step={1} value={requestAmount} onChange={e=>setRequestAmount(e.target.value)} placeholder="Egzanp: 200"/>
          <label htmlFor="borrow-reason">Rezon demann nan</label>
          <select id="borrow-reason" value={requestReason} onChange={e=>setRequestReason(e.target.value)}>
            <option value="">Chwazi yon rezon</option>
            <option value="Bezwen pèsonèl">Bezwen pèsonèl</option>
            <option value="Depans ijan">Depans ijan</option>
            <option value="Lòt rezon">Lòt rezon</option>
          </select>
          <p className={styles.requestNotice}>Voye demann nan pa transfere lajan. Admin lan ap egzamine demann ou an.</p>
          {requestError && <p role="alert" className={styles.requestError}>{requestError}</p>}
          <div className={styles.modalActions}>
            <button type="button" disabled={requestBusy} onClick={()=>setRequestOpen(false)}>Anile</button>
            <button type="button" disabled={requestBusy || !requestReason || !Number.isSafeInteger(Number(requestAmount)) || Number(requestAmount)<=0 || Number(requestAmount)>borrowable} onClick={()=>void sendBorrowRequest()}>{requestBusy?"Ap voye...":"Voye demann nan"}</button>
          </div>
        </div>
      </div>}
      {showWithdraw && <WithdrawModal onClose={() => { setShowWithdraw(false); void refreshBalances(); }} />}
    </main>
  );
}
