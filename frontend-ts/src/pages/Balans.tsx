import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "../api/types";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";
import styles from "./Balans.module.css";

type BorrowRequest = { id:number; amount:number; reason:string; status:"pending"|"approved"|"rejected"; createdAt:string; reviewedAt:string|null; creditedAt:string|null; repaidPoints?:number };
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const LOAN_TERM_DAYS = 30;
const LOAN_INTEREST_PERCENT = 20;
const repaymentTotal = (amount:number) => Math.ceil(amount * (100 + LOAN_INTEREST_PERCENT) / 100);
const remainingTime = (creditedAt:string, now:number) => {
  const credited = Date.parse(creditedAt);
  if (!Number.isFinite(credited)) return null;
  const remaining = Math.max(0, Math.ceil((credited + LOAN_TERM_DAYS * 86400000 - now) / 1000));
  return {days:Math.floor(remaining/86400),hours:Math.floor((remaining%86400)/3600),minutes:Math.floor((remaining%3600)/60),seconds:remaining%60};
};
const statusLabel:Record<BorrowRequest["status"],string> = {
  pending:"🟠 Annatant", approved:"✅ Apwouve", rejected:"❌ Refize"
};
export default function Balans() {
  const [requestOpen,setRequestOpen] = useState(false);
  const [historyOpen,setHistoryOpen] = useState(false);
  const [clockNow,setClockNow] = useState(() => Date.now());
  const [requestAmount,setRequestAmount] = useState("");
  const [requestReason,setRequestReason] = useState("");
  const [requests,setRequests] = useState<BorrowRequest[]>([]);
  const [requestError,setRequestError] = useState("");
  const [requestBusy,setRequestBusy] = useState(false);
  const [paying,setPaying] = useState<BorrowRequest|null>(null);
  const [paymentAmount,setPaymentAmount] = useState("");
  const [paymentError,setPaymentError] = useState("");
  const [paymentBusy,setPaymentBusy] = useState(false);
  const [paymentHistory,setPaymentHistory] = useState<{amount:number;method:string;createdAt:string;balancesReconcile?:boolean|null}[]>([]);
  const repaymentEnabled = import.meta.env.VITE_BORROW_REPAYMENTS_ENABLED === "true";
  const openRepayment = async (request: BorrowRequest) => {
    const outstanding = Math.max(0,repaymentTotal(request.amount)-Number(request.repaidPoints??0));
    setPaying(request);setPaymentAmount(String(outstanding));setPaymentError("");setPaymentHistory([]);
    const token=localStorage.getItem("token");
    if(!token)return;
    try {
      const response=await fetch(API+"/api/borrow-requests/"+request.id+"/repayments",{headers:{Authorization:"Bearer "+token}});
      if(response.ok){
        const result=await response.json() as {payments?:{amount:number;method:string;createdAt:string;balancesReconcile?:boolean|null}[];ledgerReconciles?:boolean};
        setPaymentHistory(result.payments??[]);
        if(result.ledgerReconciles===false || result.payments?.some(p=>p.balancesReconcile===false)){
          setPaymentError("Gen yon diferans nan istwa peman an. Kontakte administratè a anvan ou fè yon lòt peman.");
        }
      }
    }catch{ /* History can be viewed on the next request. */ }
  };
  const submitWalletRepayment = async () => {
    if (!paying || !repaymentEnabled) return;
    const outstanding = Math.max(0,repaymentTotal(paying.amount)-Number(paying.repaidPoints??0));
    const amount = Number(paymentAmount);
    const time = remainingTime(paying.creditedAt||"",Date.now());
    if (!Number.isSafeInteger(amount) || amount<=0 || amount>outstanding || (time?.days===0 && amount!==outstanding)) {
      setPaymentError("Kantite peman an pa valid. Nan dènye jou a, ou dwe peye tout rès la.");
      return;
    }
    const token=localStorage.getItem("token");
    if(!token){setPaymentError("Ou dwe konekte.");return;}
    if(!window.confirm("Konfime peman "+amount+" pwen nan balans Bolet ou?"))return;
    setPaymentBusy(true);setPaymentError("");
    try {
      const response=await fetch(API+"/api/borrow-requests/"+paying.id+"/wallet-repayments",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:"Bearer "+token,"Idempotency-Key":crypto.randomUUID().replace(/-/g,"")},
        body:JSON.stringify({amount})
      });
      const result=await response.json() as {message?:string};
      if(!response.ok)throw new Error(result.message||"Peman an pa pase.");
      setPaying(null);setPaymentAmount("");
      await refreshRequests();
      window.location.reload();
    }catch(error){setPaymentError(error instanceof Error?error.message:"Peman an pa pase.");}
    finally{setPaymentBusy(false);}
  };

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
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
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
          <button type="button" className={styles.historyToggle}
            aria-expanded={historyOpen} aria-controls="borrow-history-list"
            onClick={()=>setHistoryOpen(open=>!open)}>
            <span className={styles.historyTitle}>
              <span aria-hidden="true">📋</span> Demann prè mwen yo
              {requests.length>0 && <span className={styles.historyCount}>{requests.length}</span>}
            </span>
            <span className={styles.historyChevron} aria-hidden="true">{historyOpen ? "⌃" : "⌄"}</span>
          </button>
          {historyOpen && <div id="borrow-history-list" className={styles.historyList}>
            {requests.length===0 && <p>Ou poko voye okenn demann prè.</p>}
            {requests.map(request=><div className={styles.requestRow} key={request.id}>
              <span>{request.amount.toLocaleString("pt-BR")} pwen · {request.reason}</span>
              <div className={styles.requestStatus}>
                <strong>{statusLabel[request.status]}{request.status==="approved" ? (request.creditedAt ? " · Kredite" : " · Poko kredite") : ""}</strong>
                {request.status==="approved" && request.creditedAt && (() => {
                  const time = remainingTime(request.creditedAt,clockNow);
                  const expired = time !== null && time.days===0 && time.hours===0 && time.minutes===0 && time.seconds===0;
                  const outstanding = Math.max(0,repaymentTotal(request.amount)-Number(request.repaidPoints??0));
                  const clock = time ? [time.hours,time.minutes,time.seconds].map(value=>String(value).padStart(2,"0")).join(":") : "--:--:--";
                  return <div className={styles.repaymentDue} role="timer" aria-label="Tan ki rete pou remèt prè a">
                    {outstanding===0 ? <strong>✅ Prè a fin peye.</strong> : <span className={styles.repaymentSentence}>Rete <strong className={expired ? styles.repaymentOverdue : styles.repaymentDays}>{time?.days ?? "—"} jou</strong> pou remèt <strong>{outstanding.toLocaleString("pt-BR")} pwen</strong></span>}
                    {outstanding>0 && <span className={styles.repaymentClock}>⏱ {clock} <small>èdtan : minit : segonn</small></span>}
                    {outstanding>0 && repaymentEnabled && <button type="button" onClick={()=>void openRepayment(request)}>Remèt prè mwen</button>}
                    {outstanding>0 && expired && <span className={styles.repaymentOverdue}>Delè 30 jou a pase</span>}
                  </div>;
                })()}
              </div>
            </div>)}
          </div>}
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

      {paying && <div className={styles.modalBackdrop} role="presentation" onClick={()=>{if(!paymentBusy)setPaying(null);}}>
        <div className={styles.requestModal} role="dialog" aria-modal="true" aria-label="Remèt prè mwen" onClick={e=>e.stopPropagation()}>
          <h2>Remèt prè mwen</h2>
          <p>Rès prè a: <strong>{Math.max(0,repaymentTotal(paying.amount)-Number(paying.repaidPoints??0)).toLocaleString("pt-BR")} pwen</strong></p>
          <p>{remainingTime(paying.creditedAt||"",clockNow)?.days===0?"Dènye jou: ou dwe peye tout rès la.":"Ou ka peye yon pati oswa tout rès la."}</p>
          <label htmlFor="loan-repayment-amount">Kantite pou peye ak balans Bolet ou</label>
          <input id="loan-repayment-amount" type="number" min={1} step={1}
            max={Math.max(0,repaymentTotal(paying.amount)-Number(paying.repaidPoints??0))}
            value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}
            readOnly={remainingTime(paying.creditedAt||"",clockNow)?.days===0}/>
          <button type="button" onClick={()=>setPaymentAmount(String(Math.max(0,repaymentTotal(paying.amount)-Number(paying.repaidPoints??0))))}>Peye tout rès la</button>
          {paymentHistory.length>0 && <section aria-label="Istwa peman prè">
            <h3>Istwa peman yo</h3>
            <ul>{paymentHistory.map((entry,index)=><li key={index}>{entry.amount.toLocaleString("pt-BR")} pwen — {entry.method==="wallet"?"Balans Bolet":entry.method} — {new Date(entry.createdAt).toLocaleDateString("fr-CA")}{entry.balancesReconcile===true?" — ✓ Verifye":entry.balancesReconcile===false?" — ⚠ Verifye ak administratè a":""}</li>)}</ul>
          </section>}
          {paymentError && <p role="alert" className={styles.requestError}>{paymentError}</p>}
          <div className={styles.modalActions}>
            <button type="button" disabled={paymentBusy} onClick={()=>setPaying(null)}>Anile</button>
            <button type="button" disabled={paymentBusy} onClick={()=>void submitWalletRepayment()}>Konfime peman</button>
          </div>
        </div>
      </div>}
      {requestOpen && <div className={styles.modalBackdrop} role="presentation" onClick={()=>{if(!requestBusy)setRequestOpen(false);}}>
        <div className={styles.requestModal} role="dialog" aria-modal="true" aria-labelledby="borrow-title" onClick={e=>e.stopPropagation()}>
          <h2 id="borrow-title">Mande yon prè</h2>
          <p>Limit ou disponib: <strong>{borrowable.toLocaleString("pt-BR")} pwen</strong></p>
          <label htmlFor="borrow-amount">Konbyen pwen ou vle prete?</label>
          <input id="borrow-amount" type="number" min={1} max={borrowable} step={1} value={requestAmount} onChange={e=>setRequestAmount(e.target.value)} placeholder="Egzanp: 200"/>
          {Number.isSafeInteger(Number(requestAmount)) && Number(requestAmount)>0 && Number(requestAmount)<=borrowable && <div className={styles.repaymentPreview} aria-live="polite">
            <strong>Konbyen w ap remèt apre 30 jou?</strong>
            <span>Prè: {Number(requestAmount).toLocaleString("pt-BR")} pwen</span>
            <span>Enterè (20%): {(repaymentTotal(Number(requestAmount))-Number(requestAmount)).toLocaleString("pt-BR")} pwen</span>
            <strong>Total pou remèt: {repaymentTotal(Number(requestAmount)).toLocaleString("pt-BR")} pwen</strong>
            <small>30 jou yo kòmanse lè admin lan apwouve epi kredite prè a.</small>
          </div>}
          <label htmlFor="borrow-reason">Rezon demann nan</label>
          <select id="borrow-reason" value={requestReason} onChange={e=>setRequestReason(e.target.value)}>
            <option value="">Chwazi yon rezon</option>
            <option value="Bezwen pèsonèl">Bezwen pèsonèl</option>
            <option value="Depans ijan">Depans ijan</option>
            <option value="Lòt rezon">Lòt rezon</option>
          </select>
          <p className={styles.requestNotice}>Voye demann nan pa transfere lajan. Admin lan ap egzamine demann ou an. Kondisyon yo: 20% enterè, 30 jou apre kredi a.</p>
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
