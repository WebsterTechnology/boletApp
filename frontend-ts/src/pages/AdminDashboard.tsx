import React, { useEffect, useMemo, useState } from "react";
import "./AdminDashboard.css";
import axios, { isAxiosError } from "axios";
import AdminChat from "../components/AdminChat";
import type {
  AdminUser,
  DisabledLocationsResponse,
  DisabledNumbersResponse,
  NotificationHistoryItem,
} from "../api/types";

/** Form state for the broadcast panel (select values are plain strings). */
interface NotificationForm {
  title: string;
  message: string;
  priority: string;
  imageUrl: string;
  linkUrl: string;
  recipientType: string;
  recipientUserId: string;
}

type AdminSolContract = {
  id: number; userId: number; customer: { fullName: string | null; phone: string; email: string | null } | null;
  monthlyAmountCents: number; dueDay: number; status: string; paidMonths: number; createdAt: string;
  totalContributedCents: number;
  nextInstallment: { number: number; amountCents: number; estimatedDueDate: string } | null;
  installments: { number: number; amountCents: number; status: string; paidAt: string | null }[];
  payments: { id: number; installmentId: number; method: string; status: string; amountCents: number; confirmedAt: string | null; createdAt: string }[];
};
const solMoney = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

type SolWithdrawal = {id:number;packageId:number;userId:number;recipientName:string|null;pixKey:string|null;grossCents:number;penaltyCents:number;netCents:number;status:string;createdAt:string;fullName:string|null;phone:string};
type AdminBorrowRequest = {
  id:number; userId:number; amount:number; reason:string;
  status:"pending"|"approved"|"rejected"; createdAt:string; reviewedAt:string|null; creditedAt:string|null;
  customer:{id:number;fullName:string|null;phone:string;borrowablePoints:number}|null;
  repayment?: {
    total:number;repaid:number;remaining:number;percentage:number;
    status:"unpaid"|"partial"|"paid";ledgerReconciles:boolean;
    payments:{id:number;amount:number;method:string;createdAt:string}[];
  };
};
const borrowStatusLabels:Record<AdminBorrowRequest["status"],string> = {
  pending:"🟠 Annatant", approved:"✅ Apwouve", rejected:"❌ Refize"
};
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const BORROW_TERM_MS = 30 * 24 * 60 * 60 * 1000;
const BORROW_INTEREST = 1.2;
function AdminBorrowCountdown({creditedAt,amount,now}:{creditedAt:string;amount:number;now:number}) {
  const credited = Date.parse(creditedAt);
  if (!Number.isFinite(credited)) return <p>Dat kredi a pa disponib.</p>;
  const seconds = Math.max(0,Math.ceil((credited + BORROW_TERM_MS - now)/1000));
  const days = Math.floor(seconds/86400);
  const hours = Math.floor((seconds%86400)/3600);
  const minutes = Math.floor((seconds%3600)/60);
  const secs = seconds%60;
  const total = Math.round(amount * BORROW_INTEREST * 100)/100;
  return <div className="admin-borrow-countdown" role="timer">
    <div>Rete <strong className="admin-borrow-days">{days} jou</strong> pou remèt <strong>{total.toLocaleString("pt-BR")} pwen</strong></div>
    <div className="admin-borrow-clock">⏱ {[hours,minutes,secs].map(n=>String(n).padStart(2,"0")).join(":")}</div>
    <small>Èdtan : Minit : Segonn</small>
    {seconds===0 && <div className="admin-borrow-overdue">⚠️ Delè 30 jou a pase</div>}
  </div>;
}

export default function AdminDashboard() {
  const [withdrawals,setWithdrawals] = useState<SolWithdrawal[]>([]);
  const [withdrawalsOpen,setWithdrawalsOpen] = useState(false);
  const [withdrawalsError,setWithdrawalsError] = useState("");
  const [withdrawalsBusy,setWithdrawalsBusy] = useState<number|null>(null);
  const loadWithdrawals = async () => {
    try {
      setWithdrawalsError("");
      const response=await axios.get<SolWithdrawal[]>(API+"/api/sol/admin/withdrawals",auth);
      setWithdrawals(response.data);
    } catch {setWithdrawalsError("Nou pa kapab chaje demann retrè yo.");}
  };
  const markWithdrawalPaid = async (id:number) => {
    if(!window.confirm("Èske ou deja voye PIX pou kliyan sa a?"))return;
    setWithdrawalsBusy(id);
    try {await axios.patch(API+"/api/sol/admin/withdrawals/"+id+"/paid",{},auth);await loadWithdrawals();}
    catch {alert("Nou pa kapab make retrè a kòm peye.");}
    finally {setWithdrawalsBusy(null);}
  };
  const archiveWithdrawal = async (id:number) => {
    if(!window.confirm("Retire demann peye sa a nan lis administratè ak kliyan an? Dosye finansye a ap rete konsève."))return;
    setWithdrawalsBusy(id);
    try {await axios.delete(API+"/api/sol/admin/withdrawals/"+id,auth);await loadWithdrawals();}
    catch {alert("Se sèlman retrè ki deja peye ou ka achive.");}
    finally {setWithdrawalsBusy(null);}
  };
  const [borrowClockNow,setBorrowClockNow] = useState(Date.now());
  useEffect(()=>{const id=window.setInterval(()=>setBorrowClockNow(Date.now()),1000);return ()=>window.clearInterval(id);},[]);
  const [borrowRequestsOpen,setBorrowRequestsOpen] = useState(false);
  const [borrowRequests,setBorrowRequests] = useState<AdminBorrowRequest[]>([]);
  const [borrowError,setBorrowError] = useState("");
  const [borrowBusy,setBorrowBusy] = useState<number|null>(null);
  const loadBorrowRequests = async () => {
    try {
      setBorrowError("");
      const response = await axios.get<AdminBorrowRequest[]>(API + "/api/borrow-requests/admin", auth);
      setBorrowRequests(response.data);
    } catch { setBorrowError("Pa kapab chaje demann prè yo."); }
  };
  useEffect(()=>{
    if(!borrowRequestsOpen)return;
    const timer=window.setInterval(()=>{void loadBorrowRequests();},10000);
    return ()=>window.clearInterval(timer);
  },[borrowRequestsOpen]);
  const decideBorrow = async (id:number,decision:"approved"|"rejected") => {
    if (!window.confirm(decision==="approved"
      ? "Apwouve demann sa a epi transfere kantite pwen yo soti nan Disponib pou prete pou ale nan Disponib pou retire? Aksyon sa a kredite balans kliyan an."
      : "Refize demann prè sa a?")) return;
    setBorrowBusy(id);
    try {
      await axios.patch(API + "/api/borrow-requests/admin/" + id + "/decision", {decision}, auth);
      await Promise.all([loadBorrowRequests(), fetchUsers()]);
    } catch (error) {
      alert((isAxiosError(error) && error.response?.data?.message) || "Pa kapab anrejistre desizyon an.");
    } finally {setBorrowBusy(null);}
  };
  const creditLegacyBorrow = async (id:number,amount:number) => {
    if (!window.confirm(`Kredite ${amount} pwen pou demann deja apwouve #${id}? Sa ap retire kantite a nan Disponib pou prete epi ajoute li nan Disponib pou retire.`)) return;
    setBorrowBusy(id);
    try {
      await axios.patch(API + "/api/borrow-requests/admin/" + id + "/credit", {}, auth);
      await Promise.all([loadBorrowRequests(), fetchUsers()]);
    } catch (error) {
      alert((isAxiosError(error) && error.response?.data?.message) || "Pa kapab kredite prè sa a.");
    } finally { setBorrowBusy(null); }
  };
  const [customersOpen, setCustomersOpen] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const [solContracts, setSolContracts] = useState<AdminSolContract[]>([]);
  const solTotalsByUser = useMemo(() => {
    const totals = new Map<number,number>();
    for (const contract of solContracts) totals.set(contract.userId,(totals.get(contract.userId)??0)+contract.totalContributedCents);
    return totals;
  },[solContracts]);
  // Test users #204 and #2 are excluded from the business total, but all contracts remain visible for audit.
  const SOL_TEST_USER_IDS = [204, 2];
  const solProductionContracts = useMemo(() => solContracts.filter(c => !SOL_TEST_USER_IDS.includes(c.userId)), [solContracts]);
  const solGrandTotalCents = useMemo(() => solProductionContracts.reduce((sum, contract) => sum + contract.totalContributedCents, 0), [solProductionContracts]);
  const solTestTotalCents = useMemo(() => solContracts.filter(c => SOL_TEST_USER_IDS.includes(c.userId)).reduce((sum, c) => sum + c.totalContributedCents, 0), [solContracts]);
  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState("");
  const [solSearch, setSolSearch] = useState("");
  const [solExpanded, setSolExpanded] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [balanceTypes, setBalanceTypes] = useState<Record<number, "play" | "withdraw" | "borrow">>({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationForm>({ title: "", message: "", priority: "info", imageUrl: "", linkUrl: "", recipientType: "all", recipientUserId: "" });
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<number | null>(null);

  const [disabledNumbers, setDisabledNumbers] = useState<string[]>([]);
  const [disabledLocations, setDisabledLocations] = useState<string[]>([]);
  const [inputNumbers, setInputNumbers] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(""); // no default

  const token = localStorage.getItem("token") || "";
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const loadSolContracts = async () => {
    setSolLoading(true);
    setSolError("");
    try {
      const response = await axios.get<AdminSolContract[]>(`${API}/api/admin/sol/contracts`, auth);
      setSolContracts(response.data);
    } catch {
      setSolError("Nou pa kapab chaje kontra Sòl yo.");
    } finally { setSolLoading(false); }
  };

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    const res = await axios.get<AdminUser[]>(`${API}/api/admin/users`, auth);
    setUsers(res.data);
  };

  const fetchDisabledNumbers = async () => {
    const res = await axios.get<string[]>(`${API}/api/admin/disabled-numbers`, auth);
    setDisabledNumbers(res.data);
  };

  const fetchDisabledLocations = async () => {
    const res = await axios.get<string[]>(`${API}/api/admin/disabled-locations`, auth);
    setDisabledLocations(res.data);
  };

  const fetchNotificationHistory = async () => {
    const res = await axios.get<NotificationHistoryItem[]>(`${API}/api/notifications/history`, auth);
    setNotificationHistory(Array.isArray(res.data) ? res.data : []);
  };

  const sendNotification = async () => {
    if (!notification.title.trim() || !notification.message.trim()) return alert("Title and message are required");
    try {
      setSendingNotification(true);
      const payload = { ...notification, recipientUserId: notification.recipientType === "user" ? Number(notification.recipientUserId) : null };
      if (payload.recipientType === "user" && !payload.recipientUserId) return alert("Select a user");
      await axios.post(`${API}/api/notifications/send`, payload, auth);
      setNotification({ title: "", message: "", priority: "info", imageUrl: "", linkUrl: "", recipientType: "all", recipientUserId: "" });
      await fetchNotificationHistory();
      alert(payload.recipientType === "all" ? "Notification sent to all users" : "Notification sent to selected user");
    } catch (err) {
      alert((isAxiosError(err) && err.response?.data?.message) || "Failed to send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!window.confirm("Efase notifikasyon sa a pou tout itilizatè yo? Li pap parèt ankò.")) return;
    setDeletingNotificationId(id);
    try {
      await axios.delete(`${API}/api/notifications/${id}`, auth);
      await fetchNotificationHistory();
    } catch (err) {
      alert((isAxiosError(err) && err.response?.data?.message) || "Failed to delete notification");
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchDisabledNumbers(),
      fetchDisabledLocations(),
      fetchNotificationHistory(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll().catch(console.error);
  }, [token]);

  /* ================= POINTS ================= */

  const handleAddPwen = async (userId: number) => {
    const amount = parseInt(amounts[userId], 10);
    if (!amount) return alert("Enter amount");

    await axios.post(
      `${API}/api/admin/users/${userId}/add-pwen`,
      { amount, balanceType: balanceTypes[userId] || "play" },
      auth
    );

    refreshAll();
    setAmounts((s) => ({ ...s, [userId]: "" }));
  };

  const handleAdminStatus = async (user: AdminUser) => {
    const nextStatus = !user.isAdmin;
    const action = nextStatus ? "promote this user to admin" : "remove admin access from this user";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    try {
      await axios.patch(`${API}/api/admin/users/${user.id}/admin-status`, { isAdmin: nextStatus }, auth);
      await fetchUsers();
    } catch (err) {
      alert((isAxiosError(err) && err.response?.data?.message) || "Failed to update admin status");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const confirmDelete = window.confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/api/auth/users/${userId}`, auth);
      refreshAll();
    } catch {
      alert("Error deleting user");
    }
  };

  const handleRemovePwen = async (userId: number) => {
    const amount = parseInt(amounts[userId], 10);
    if (!amount) return alert("Enter amount");

    await axios.post(
      `${API}/api/admin/users/${userId}/remove-pwen`,
      { amount, balanceType: balanceTypes[userId] || "play" },
      auth
    );

    refreshAll();
    setAmounts((s) => ({ ...s, [userId]: "" }));
  };

  /* ================= DISABLE NUMBERS ================= */

  const saveDisabledNumbers = async () => {
    if (!inputNumbers.trim()) return;

    const newNumbers = inputNumbers
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    const merged = Array.from(new Set([...disabledNumbers, ...newNumbers]));

    const res = await axios.post<DisabledNumbersResponse>(
      `${API}/api/admin/disabled-numbers`,
      { numbers: merged },
      auth
    );

    setDisabledNumbers(res.data.disabledNumbers);
    setInputNumbers("");
  };

  const enableNumber = async (num: string) => {
    const updated = disabledNumbers.filter((n) => n !== num);
    setDisabledNumbers(updated);

    await axios.post(
      `${API}/api/admin/disabled-numbers`,
      { numbers: updated },
      auth
    );
  };

  /* ================= DISABLE LOCATIONS ================= */

  const addDisabledLocation = async () => {
    if (!selectedLocation) return;

    const merged = Array.from(
      new Set([...disabledLocations, selectedLocation])
    );

    const res = await axios.post<DisabledLocationsResponse>(
      `${API}/api/admin/disabled-locations`,
      { locations: merged },
      auth
    );

    setDisabledLocations(res.data.disabledLocations);
    setSelectedLocation("");
  };

  const enableLocation = async (loc: string) => {
    const updated = disabledLocations.filter((l) => l !== loc);
    setDisabledLocations(updated);

    await axios.post(
      `${API}/api/admin/disabled-locations`,
      { locations: updated },
      auth
    );
  };
const filteredUsers = useMemo(() => {
  if (!searchUser.trim()) {
    return users;
  }

  const search = searchUser.trim();

  return users.filter((user) =>
    [user.phone,user.fullName,user.cpf,user.email].some((value) =>
      String(value || "").toLowerCase().includes(search.toLowerCase())
    )
  );
}, [users, searchUser]);
  /* ================= UI ================= //remover el index do la do do u no map para parar el admin page*/

  return (
    <div className="admin-dashboard">
      <h2>👑 Admin Dashboard</h2>
      <AdminChat />
      <section className="admin-accordion-section">
        <button className="admin-section-toggle" type="button" aria-expanded={borrowRequestsOpen}
          onClick={() => {setBorrowRequestsOpen(v=>!v);if(!borrowRequestsOpen)void loadBorrowRequests();}}>
          <span>🤝 Demann prè — Annatant / Apwouve / Refize</span>
          <span>{borrowRequestsOpen ? "▲ Fèmen" : "▼ Ouvri"}</span>
        </button>
        {borrowRequestsOpen && <div style={{display:"grid",gap:12,marginTop:14}}>
          <button type="button" onClick={()=>void loadBorrowRequests()}>Rafrechi demann prè yo</button>
          {borrowError && <p role="alert">{borrowError}</p>}
          {!borrowError && borrowRequests.length===0 && <p>Pa gen demann prè.</p>}
          {borrowRequests.map(request=><article key={request.id}
            style={{border:"1px solid #61728a",borderRadius:12,padding:15,overflowWrap:"anywhere"}}>
            <strong>{request.customer?.fullName||"Kliyan"} — #{request.userId}</strong>
            <p style={{margin:"8px 0"}}>{request.customer?.phone||""} · Demann #{request.id}</p>
            <p style={{margin:"8px 0"}}><b>{request.amount.toLocaleString("pt-BR")} pwen</b> · Limit kliyan: {Number(request.customer?.borrowablePoints??0).toLocaleString("pt-BR")} pwen</p>
            <p style={{margin:"8px 0"}}>Rezon: {request.reason}</p>
            <p style={{margin:"8px 0"}}>{borrowStatusLabels[request.status]}{request.creditedAt ? " · 💸 Kredite nan balans retrè" : request.status==="approved" ? " · ⚠️ Poko kredite" : ""} · {new Date(request.createdAt).toLocaleString()}</p>
            {request.status==="approved" && request.creditedAt && request.repayment && <section aria-label="Enfòmasyon sou ranbousman" style={{background:"#132b3e",border:"1px solid #53718b",borderRadius:12,padding:14,margin:"12px 0",color:"#f4f8ff"}}>
              <strong style={{fontSize:18}}>Enfòmasyon sou ranbousman</strong>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:12}}>
                <div>Montan pou remèt<br/><strong>{request.repayment.total.toLocaleString("pt-BR")} pwen</strong></div>
                <div>Total peye<br/><strong>{request.repayment.repaid.toLocaleString("pt-BR")} pwen</strong></div>
                <div>Rès pou peye<br/><strong>{request.repayment.remaining.toLocaleString("pt-BR")} pwen</strong></div>
                <div>Estati<br/><strong style={{color:request.repayment.status==="paid"?"#4ade80":request.repayment.status==="partial"?"#facc15":"#f4f8ff"}}>{request.repayment.status==="paid"?"✅ Peye nèt":request.repayment.status==="partial"?"🟡 Peye an pati":"Poko peye"}</strong></div>
              </div>
              <div style={{marginTop:12}}><strong>{request.repayment.percentage}% ranbouse</strong>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={request.repayment.percentage} style={{height:10,borderRadius:10,background:"#35495b",overflow:"hidden",marginTop:6}}>
                  <div style={{width:`${request.repayment.percentage}%`,height:"100%",background:request.repayment.status==="paid"?"#22c55e":"#facc15"}}/>
                </div>
              </div>
              {!request.repayment.ledgerReconciles && <p role="alert" style={{color:"#fca5a5"}}>⚠️ Dosye peman yo pa koresponn ak total anrejistre a. Verifye kont lan.</p>}
              <strong style={{display:"block",marginTop:14}}>Istwa peman yo</strong>
              {request.repayment.payments.length===0?<p>Pa gen peman konfime ankò.</p>:<ul style={{paddingLeft:20,margin:"8px 0"}}>
                {request.repayment.payments.map(payment=><li key={payment.id} style={{marginBottom:8}}>
                  <strong>{Number(payment.amount).toLocaleString("pt-BR")} pwen</strong> · {payment.method==="wallet"?"Balans Bolet":payment.method==="pix"?"PIX":payment.method} · {new Date(payment.createdAt).toLocaleString("fr-CA",{dateStyle:"medium",timeStyle:"medium"})}
                </li>)}
              </ul>}
            </section>}
            {request.status==="approved" && request.creditedAt && (!request.repayment || request.repayment.remaining > 0) && <AdminBorrowCountdown creditedAt={request.creditedAt} amount={request.amount} now={borrowClockNow}/>}
            {request.status==="approved" && !request.creditedAt && <button
              type="button" disabled={borrowBusy===request.id}
              onClick={()=>void creditLegacyBorrow(request.id,request.amount)}
              style={{background:"#0a7b63",color:"white",padding:"10px 14px",borderRadius:9,border:0,fontWeight:800}}>
              Kredite {request.amount.toLocaleString("pt-BR")} pwen nan Disponib pou retire
            </button>}
            {request.status==="pending" && <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              <button type="button" disabled={borrowBusy===request.id}
                onClick={()=>void decideBorrow(request.id,"approved")}
                style={{background:"#11864d",color:"white",padding:"10px 14px",borderRadius:9,border:0,fontWeight:800}}>
                Apwouve
              </button>
              <button type="button" disabled={borrowBusy===request.id}
                onClick={()=>void decideBorrow(request.id,"rejected")}
                style={{background:"#b72c46",color:"white",padding:"10px 14px",borderRadius:9,border:0,fontWeight:800}}>
                Refize
              </button>
            </div>}
          </article>)}
          <small>Apwobasyon transfere kantite demann nan soti nan Disponib pou prete pou ale nan Disponib pou retire. Yon demann deja kredite pa kapab kredite de fwa. Demann ki te apwouve anvan aktyalizasyon sa a mande yon klik Kredite apa.</small>
        </div>}
      </section>

      <section className="admin-accordion-section">
        <button type="button" onClick={() => { setSolOpen(v => !v); if (!solOpen) void loadSolContracts(); }}
          className="admin-section-toggle" aria-expanded={solOpen}>
          <span>📋 Sòl — Kontra ak peman</span><span>{solOpen ? "▲ Fèmen" : "▼ Ouvri"}</span>
        </button>
        {solOpen && <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0" }}>
            <input aria-label="Chèche kliyan Sòl" placeholder="Chèche non, telefòn oswa ID..."
              value={solSearch} onChange={e => setSolSearch(e.target.value)} style={{ padding: 10, flex: 1, minWidth: 180 }} />
            <button type="button" onClick={() => void loadSolContracts()} disabled={solLoading}>Rafrechi</button>
          </div>
          {solLoading && <p>Ap chaje kontra yo...</p>}
          {solError && <p role="alert">{solError}</p>}
          {!solLoading && !solError && <p>{solProductionContracts.length} kontra Sòl reyèl <small style={{display:"block",opacity:0.8}}>{solContracts.length-solProductionContracts.length} kontra tès (#2 ak #204) pa konte</small></p>}
          {!solLoading && !solError && <div style={{background:"#0e7146",border:"1px solid #6ed3a0",borderRadius:12,padding:"16px 20px",margin:"12px 0 18px",color:"#fff"}}>
            <div style={{fontSize:14,fontWeight:700}}>Total Sòl resevwa — san kont tès yo</div>
            <strong style={{display:"block",fontSize:"clamp(24px,5vw,34px)",marginTop:6}}>{solMoney(solGrandTotalCents)}</strong>
            <small style={{display:"block",marginTop:5}}>Sòm kontribisyon konfime nan {solProductionContracts.length} kontra, san itilizatè tès #204 ak #2. Pa konte PIX annatant ni mwa ki poko peye.</small>
            {solTestTotalCents > 0 && <small style={{display:"block",marginTop:6}}>Kont tès #204 ak #2 eskli: {solMoney(solTestTotalCents)}</small>}
          </div>}
          {solContracts.filter(c => [String(c.id),String(c.userId),c.customer?.fullName || "",c.customer?.phone || ""]
            .some(x => x.toLowerCase().includes(solSearch.toLowerCase()))).map(c => (
            <article key={c.id} style={{ border: "1px solid #6b7280", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <button type="button" aria-expanded={solExpanded === c.id}
                onClick={() => setSolExpanded(x => x === c.id ? null : c.id)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 12, textAlign: "left" }}>
                <span><strong>{c.customer?.fullName || "Kliyan"} — #{c.userId}</strong>
                  <small style={{ display: "block" }}>{c.customer?.phone || "Pa gen telefòn"} · Kontra #{c.id} · {c.paidMonths}/12 peye</small>
                  <small style={{ display: "block", fontWeight: 700 }}>Total pake sa a peye: {solMoney(c.totalContributedCents)}</small>
                  <small style={{ display: "block" }}>Total kliyan sa a peye nan Sòl: {solMoney(solTotalsByUser.get(c.userId)??0)}</small></span>
                <span>{solExpanded === c.id ? "▲ Fèmen" : "▼ Ouvri"}</span>
              </button>
              {solExpanded === c.id && <>
                <div style={{ padding: "12px 4px" }}>
                  <div>Pakè: {solMoney(c.monthlyAmountCents)}/mwa · Eta: {c.status} · Peye: {c.paidMonths}/12</div>
                  <div>Total peye: {solMoney(c.totalContributedCents)}</div>
                  <div>{c.nextInstallment ? `Pwochen peman: mwa ${c.nextInstallment.number} — ${solMoney(c.nextInstallment.amountCents)} · Dat estime: ${c.nextInstallment.estimatedDueDate}` : "Pa gen peman an atant"}</div>
                </div>
                <h4>Kontribisyon chak mwa</h4>
                <div style={{ display: "grid", gap: 5 }}>{c.installments.map(i => <div key={i.number}>
                  Mwa {i.number}: {solMoney(i.amountCents)} — {i.status} {i.paidAt ? `(${new Date(i.paidAt).toLocaleDateString()})` : ""}
                </div>)}</div>
                <h4>Istwa peman (balans / PIX)</h4>
                {c.payments.length === 0 ? <p>Pa gen peman anrejistre.</p> :
                  c.payments.map(p => <div key={p.id}>#{p.id} · {p.method.toUpperCase()} · {solMoney(p.amountCents)} · {p.status}
                    {p.confirmedAt ? ` · ${new Date(p.confirmedAt).toLocaleString()}` : ""}</div>)}
              </>}
            </article>
          ))}
        </>}
      </section>


      <section className="admin-accordion-section">
        <button className="admin-section-toggle" aria-expanded={withdrawalsOpen} type="button" onClick={() => {setWithdrawalsOpen(v=>!v);if(!withdrawalsOpen)void loadWithdrawals();}}>
          <span>💸 Demann retrè Sòl — Annatant / Peye</span><span>{withdrawalsOpen ? "▲ Fèmen" : "▼ Ouvri"}</span>
        </button>
        {withdrawalsOpen && <div style={{display:"grid",gap:12,marginTop:12}}>
          <button type="button" onClick={() => void loadWithdrawals()}>Rafrechi retrè yo</button>
          {withdrawalsError && <p role="alert">{withdrawalsError}</p>}
          {withdrawals.map(w=><article key={w.id} style={{padding:14,border:"1px solid #888",borderRadius:12}}>
            <strong>{w.fullName||"Kliyan"} — #{w.userId}</strong>
            <p>{w.phone||""} · Demann Sòl #{w.id} · {solMoney(w.netCents)} · Kontra Sòl #{w.packageId}</p>
            <p><strong>Non pou PIX:</strong> {w.recipientName||"Pa bay"} </p>
            <p><strong>Kle PIX:</strong> {w.pixKey||"Pa bay"} {w.pixKey && <button type="button" onClick={()=>void navigator.clipboard.writeText(w.pixKey||"")}>Kopye kle PIX</button>}</p>
            <p>{w.status==="pending"?"🟠 Annatant peman PIX":w.status==="paid"?"✅ Peye":w.status} · {new Date(w.createdAt).toLocaleString()}</p>
            {w.status==="pending" && <button type="button" disabled={withdrawalsBusy===w.id} onClick={() => void markWithdrawalPaid(w.id)}>Make kòm peye</button>}
            {w.status==="paid" && <button type="button" disabled={withdrawalsBusy===w.id} onClick={() => void archiveWithdrawal(w.id)}>Efase nan lis yo</button>}
          </article>)}
          {!withdrawalsError && withdrawals.length===0 && <p>Pa gen demann retrè.</p>}
        </div>}
      </section>

      <section className="admin-accordion-section">
        <button onClick={() => setShowBroadcast((open) => !open)} aria-expanded={showBroadcast} className="admin-section-toggle"><span>📣 Broadcast Notification</span><span>{showBroadcast ? "▲ Fèmen" : "▼ Ouvri"}</span></button>
        {showBroadcast && (
          <div className="admin-broadcast-panel">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}><h3 style={{margin:0}}>📣 Broadcast Notification</h3><button onClick={() => setShowBroadcast(false)} style={{border:0,background:"#eee",borderRadius:8,padding:"7px 10px",cursor:"pointer"}}>✕ Close</button></div>
        <input placeholder="Title" value={notification.title} onChange={(e)=>setNotification((n)=>({...n,title:e.target.value}))} style={{width:"100%",padding:10,marginBottom:10}} />
        <textarea placeholder="Message" value={notification.message} onChange={(e)=>setNotification((n)=>({...n,message:e.target.value}))} rows={4} style={{width:"100%",padding:10,marginBottom:10}} />
        <select value={notification.priority} onChange={(e)=>setNotification((n)=>({...n,priority:e.target.value}))} style={{padding:10,marginRight:10}}>
          <option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
        </select>
        <select value={notification.recipientType} onChange={(e)=>setNotification((n)=>({...n,recipientType:e.target.value,recipientUserId:""}))} style={{padding:10}}>
          <option value="all">All Users</option>
          <option value="user">Specific User</option>
        </select>
        {notification.recipientType === "user" && (
          <select value={notification.recipientUserId} onChange={(e)=>setNotification((n)=>({...n,recipientUserId:e.target.value}))} style={{width:"100%",padding:10,marginTop:10}}>
            <option value="">Select user by phone...</option>
            {users.map((u)=><option key={u.id} value={u.id}>{u.phone} — User #{u.id}</option>)}
          </select>
        )}
        <input placeholder="Optional image URL" value={notification.imageUrl} onChange={(e)=>setNotification((n)=>({...n,imageUrl:e.target.value}))} style={{width:"100%",padding:10,marginTop:10}} />
        <input placeholder="Optional link URL" value={notification.linkUrl} onChange={(e)=>setNotification((n)=>({...n,linkUrl:e.target.value}))} style={{width:"100%",padding:10,marginTop:10}} />
        <button onClick={sendNotification} disabled={sendingNotification} style={{marginTop:12,padding:"10px 18px",background:"#111827",color:"#fff"}}>{sendingNotification?"Sending...":"Send Notification"}</button>
        <h4 style={{marginTop:22}}>History</h4>
        <div style={{display:"grid",gap:8}}>{notificationHistory.map((n)=><div key={n.id} style={{padding:10,border:"1px solid #eee",borderRadius:8}}><strong>{n.title}</strong> — {n.priority}<div>{n.message}</div><div><b>Recipient:</b> {n.recipientType === "user" ? (n.recipient?.phone || `User #${n.recipientUserId}`) : "All Users"} · <b>Read count:</b> {Number(n.readCount || 0)}</div><small>{new Date(n.createdAt).toLocaleString()}</small><button type="button" disabled={deletingNotificationId !== null} onClick={() => deleteNotification(n.id)} style={{marginLeft:12,padding:"6px 10px",background:"#b91c1c",color:"#fff",border:0,borderRadius:6,cursor:"pointer"}}>{deletingNotificationId === n.id ? "Deleting..." : "🗑 Delete for everyone"}</button></div>)}</div>
          </div>
        )}
      </section>

   

<section className="admin-accordion-section">
        <button type="button" className="admin-section-toggle" aria-expanded={customersOpen} onClick={() => setCustomersOpen(v => !v)}>
          <span>👥 Kliyan yo ({users.length})</span>
          <span>{customersOpen ? "▲ Fèmen" : "▼ Ouvri"}</span>
        </button>
        {customersOpen && <div style={{marginTop:14}}>
<input
  type="text"
  placeholder="🔍 Search name, CPF, phone or email..."
  value={searchUser}
  onChange={(e) => setSearchUser(e.target.value)}
  className="admin-search"
/>

      <div className="admin-users-table-wrap"><table className="admin-users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>CPF</th>
            <th>Contact</th>
            <th>Address</th>
            <th>Disponib pou jwe</th>
            <th>Disponib pou retire</th>
            <th>Disponib pou prete</th>
            <th>Role</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          
          {filteredUsers.map((u, index) => (
            <tr key={u.id}>
             <td>{index + 1}</td>
              <td><strong>{u.fullName || "Cadastro pendente"}</strong><br/><small>{u.birthDate || "Nascimento pendente"}</small></td>
              <td>{u.cpf || "Pendente"}</td>
              <td>{u.phone}<br/><small>{u.email || "E-mail pendente"}</small></td>
              <td>{u.address ? `${u.address}, ${u.city} - ${u.state}, CEP ${u.cep}` : "Cadastro pendente"}</td>
              <td>{u.points}</td>
              <td>{u.withdrawablePoints || 0}</td>
              <td>{u.borrowablePoints ?? 0}</td>
              <td>{u.isAdmin ? "👑 Admin" : "User"}</td>

              <td>
                <input
                  type="number"
                  value={amounts[u.id] || ""}
                  onChange={(e) =>
                    setAmounts((s) => ({
                      ...s,
                      [u.id]: e.target.value,
                    }))
                  }
                  style={{ width: 80 }}
                />
                <select value={balanceTypes[u.id] || "play"} onChange={(e)=>setBalanceTypes(s=>({...s,[u.id]:e.target.value as "play"|"withdraw"|"borrow"}))} style={{display:"block",marginTop:6}}>
                  <option value="play">Disponib pou jwe</option>
                  <option value="withdraw">Disponib pou retire</option>
                  <option value="borrow">Disponib pou prete</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleAddPwen(u.id)}>➕ Add</button>

                <button
                  onClick={() => handleAdminStatus(u)}
                  style={{ marginLeft: 6, background: u.isAdmin ? "#6b7280" : "#d4af37", color: u.isAdmin ? "#fff" : "#111" }}
                >
                  {u.isAdmin ? "Remove Admin" : "👑 Make Admin"}
                </button>

                <button
                  onClick={() => handleRemovePwen(u.id)}
                  style={{ marginLeft: 6, background: "red", color: "#fff" }}
                >
                  ➖ Remove
                </button>

                {/* 🔥 DELETE BUTTON */}
                <button
                  onClick={() => handleDeleteUser(u.id)}
                  style={{ marginLeft: 6, background: "black", color: "#fff" }}
                >
                  🗑 Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

        </div>}
      </section>

      {loading && <p>Loading…</p>}

      <hr />

      <h3>🚫 Disable Numbers</h3>

      <input
        value={inputNumbers}
        onChange={(e) => setInputNumbers(e.target.value)}
        placeholder="2,5,10"
      />
      <button onClick={saveDisabledNumbers}>Save</button>

      <div style={{ marginTop: 10 }}>
        {disabledNumbers.map((n) => (
          <button key={n} onClick={() => enableNumber(n)}>
            ❌ {n}
          </button>
        ))}
      </div>

      <hr />

      <h3>🌎 Disable Locations</h3>

      <select
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
      >
        <option value="">Select location</option>
        <option value="New York">New York</option>
        <option value="Florida">Florida</option>
        <option value="Georgia">Georgia</option>

      </select>

      <button onClick={addDisabledLocation}>Save</button>

      <div style={{ marginTop: 10 }}>
        {disabledLocations.map((l) => (
          <button key={l} onClick={() => enableLocation(l)}>
            ❌ {l}
          </button>
        ))}
      </div>
    </div>
  );
}

