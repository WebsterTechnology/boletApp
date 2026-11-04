import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "../api/types";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";
import styles from "./Balans.module.css";

type BorrowRequest = { id:number; amount:number; reason:string; status:"pending"|"approved"|"rejected"; createdAt:string; reviewedAt:string|null; creditedAt:string|null };
const API = import.meta.env.VITE_API_URL || "https://boletapp-production.up.railway.app";
type LoanStatus={remaining:number;total:number;finalDay:boolean;pendingPix:boolean;walletPaymentsEnabled:boolean;pixPaymentsEnabled:boolean};
const LOAN_TERM_DAYS = 30;
const LOAN_INTEREST_PERCENT = 20;
const repaymentTotal = (amount:number) => Math.round(amount * (100 + LOAN_INTEREST_PERCENT)) / 100;
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
  const [loanStatuses,setLoanStatuses] = useState<Record<number,LoanStatus>>({});
  const [paymentAmounts,setPaymentAmounts] = useState<Record<number,string>>({});
  const [paymentMethods,setPaymentMethods] = useState<Record<number,"wallet"|"pix">>({});
  const [paymentBusy,setPaymentBusy] = useState<Record<number,boolean>>({});
  const [paymentMessage,setPaymentMessage] = useState<Record<number,string>>({});
  const refreshLoanStatuses = useCallback(async (records:BorrowRequest[])=>{
    const token=localStorage.getItem("token");if(!token)return;
    const entries=await Promise.all(records.filter(r=>r.status==="approved"&&r.creditedAt).map(async r=>{
      try {const response=await fetch(API+"/api/borrow-requests/"+r.id+"/repayment-status",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
        return [r.id,response.ok?await response.json():null] as const;
      }catch{return [r.id,null] as const;}
    }));
    setLoanStatuses(Object.fromEntries(entries.filter(entry=>entry[1]!==null)) as Record<number,LoanStatus>);
  },[]);
  // A hosted InfinitePay link cannot be cancelled at the provider. Abandon only
  // the local attempt, and tell the customer not to use their old payment link.
  const abandonPix=async(id:number)=>{
    setPaymentBusy(p=>({...p,[id]:true}));
    setPaymentMessage(p=>({...p,[id]:""}));
    try{
      const response=await fetch(API+"/api/borrow-requests/"+id+"/pix-attempts/abandon",{
        method:"POST",headers:{Authorization:"Bearer "+localStorage.getItem("token")}
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||"Pa kapab chanje metòd peman an.");
      setPaymentMethods(p=>({...p,[id]:"wallet"}));
      setPaymentMessage(p=>({...p,[id]:"Ou ka peye ak balans Bolet kounye a. Pa itilize ansyen lyen PIX la."}));
      await refreshRequests();
    }catch(e){
      setPaymentMessage(p=>({...p,[id]:e instanceof Error?e.message:"Pa kapab chanje metòd peman an."}));
    }finally{setPaymentBusy(p=>({...p,[id]:false}));}
  };
  const repayLoan=async(id:number,status:LoanStatus)=>{
    const method=paymentMethods[id]||(status.walletPaymentsEnabled?"wallet":"pix");
    const amount=status.finalDay?status.remaining:Number(paymentAmounts[id]??String(status.remaining));
    if(!Number.isSafeInteger(amount)||amount<1||amount>status.remaining){setPaymentMessage(p=>({...p,[id]:"Antre yon kantite valid."}));return;}
    setPaymentBusy(p=>({...p,[id]:true}));
    try{
      const endpoint=method==="wallet"?"wallet-repayments":"pix-intents";
      const response=await fetch(API+"/api/borrow-requests/"+id+"/"+endpoint,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+localStorage.getItem("token"),"Idempotency-Key":"loan_"+crypto.randomUUID().replace(/-/g,"")},body:JSON.stringify({amount})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||"Peman an pa pase.");
      if(method==="pix"){if(!result.checkoutUrl)throw new Error("Lyen PIX pa disponib.");window.location.assign(result.checkoutUrl);return;}
      setPaymentAmounts(p=>({...p,[id]:""}));
      setPaymentMessage(p=>({...p,[id]:"Peman anrejistre."}));
      void refreshBalances();void refreshRequests();window.dispatchEvent(new Event("pointsUpdated"));
    }catch(e){setPaymentMessage(p=>({...p,[id]:e instanceof Error?e.message:"Peman an pa pase."}));}
    finally{setPaymentBusy(p=>({...p,[id]:false}));}
  };
  const refreshRequests = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const response = await fetch(`${API}/api/borrow-requests/mine`, {headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      if (response.ok) {const records=await response.json() as BorrowRequest[];setRequests(records);void refreshLoanStatuses(records);}
    } catch { /* Remain on balance page if history is temporarily unavailable. */ }
  },[refreshLoanStatuses]);
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
                {request.status==="approved" && request.creditedAt && loanStatuses[request.id]?.remaining !== 0 && (() => {
                  const time = remainingTime(request.creditedAt,clockNow);
                  const expired = time !== null && time.days===0 && time.hours===0 && time.minutes===0 && time.seconds===0;
                  const clock = time ? [time.hours,time.minutes,time.seconds].map(value=>String(value).padStart(2,"0")).join(":") : "--:--:--";
                  return <div className={styles.repaymentDue} role="timer" aria-label="Tan ki rete pou remèt prè a">
                    <span className={styles.repaymentSentence}>Rete <strong className={expired ? styles.repaymentOverdue : styles.repaymentDays}>{time?.days ?? "—"} jou</strong> pou remèt <strong>{repaymentTotal(request.amount).toLocaleString("pt-BR")} pwen</strong></span>
                    <span className={styles.repaymentClock}>⏱ {clock} <small>èdtan : minit : segonn</small></span>
                    {expired && <span className={styles.repaymentOverdue}>Delè 30 jou a pase</span>}
                  </div>;
                })()}
                {request.status==="approved"&&request.creditedAt&&loanStatuses[request.id]&&(()=>{
                  const loan=loanStatuses[request.id];
                  const method=paymentMethods[request.id]||(loan.walletPaymentsEnabled?"wallet":"pix");
                  return <div style={{marginTop:12,padding:12,border:"1px solid #526a80",borderRadius:12}}>
                    <strong>Remèt prè mwen</strong>
                    <p>Rès pou peye: <strong>{loan.remaining} pwen</strong> sou {loan.total} pwen</p>
                    {loan.remaining===0?<p>Prè sa a fin peye.</p>:<>
                      {loan.finalDay&&<p>Dènye jou a: peye tout rès la.</p>}
                      {loan.pendingPix&&<div style={{margin:"10px 0"}}>
                        <p>Yon peman PIX annatant.</p>
                        <p style={{fontSize:13,color:"#e5edf8"}}>Si w pa peye ak PIX, ou ka chwazi balans Bolet. Pa itilize ansyen lyen PIX la apre sa.</p>
                        <button type="button" disabled={!!paymentBusy[request.id]}
                          onClick={()=>void abandonPix(request.id)}
                          style={{background:"#facc15",color:"#111827",fontWeight:700,padding:"9px 12px",borderRadius:8}}>
                          {paymentBusy[request.id]?"Tanpri tann...":"Anile peman annatant pou peye ak balans"}
                        </button>
                      </div>}
                      {!loan.finalDay&&<label style={{display:"block",color:"#e5edf8",fontWeight:700,marginTop:10}}>Kantite pou peye
                        <input type="number" min={1} max={loan.remaining} step={1} value={paymentAmounts[request.id]??String(loan.remaining)}
                          onChange={e=>setPaymentAmounts(p=>({...p,[request.id]:e.target.value}))}
                          style={{display:"block",padding:8,width:"100%",boxSizing:"border-box"}}/>
                      </label>}
                      {loan.walletPaymentsEnabled&&<label style={{display:"block"}}><input type="radio" checked={method==="wallet"} onChange={()=>setPaymentMethods(p=>({...p,[request.id]:"wallet"}))}/> <span style={{color:"#facc15",fontWeight:700}}>Peye ak balans Bolet</span></label>}
                      {loan.pixPaymentsEnabled&&<label style={{display:"block"}}><input type="radio" checked={method==="pix"} onChange={()=>setPaymentMethods(p=>({...p,[request.id]:"pix"}))}/> <span style={{color:"#facc15",fontWeight:700}}>Peye ak pix</span></label>}
                      {(loan.walletPaymentsEnabled||loan.pixPaymentsEnabled)?
                        <button type="button" disabled={!!paymentBusy[request.id]||loan.pendingPix||(method==="wallet"&&!loan.walletPaymentsEnabled)||(method==="pix"&&!loan.pixPaymentsEnabled)}
                          onClick={()=>void repayLoan(request.id,loan)}>{paymentBusy[request.id]?"Tanpri tann...":loan.finalDay?"Peye tout rès la":"Peye kounye a"}</button>
                        :<p>Opsyon peman yo poko aktive.</p>}
                    </>}
                    {paymentMessage[request.id]&&<p role="status">{paymentMessage[request.id]}</p>}
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
