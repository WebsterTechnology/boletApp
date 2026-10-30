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
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const [solContracts, setSolContracts] = useState<AdminSolContract[]>([]);
  const solTotalsByUser = useMemo(() => {
    const totals = new Map<number,number>();
    for (const contract of solContracts) totals.set(contract.userId,(totals.get(contract.userId)??0)+contract.totalContributedCents);
    return totals;
  },[solContracts]);
  const solGrandTotalCents = useMemo(() => solContracts.reduce((sum, contract) => sum + contract.totalContributedCents, 0), [solContracts]);
  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState("");
  const [solSearch, setSolSearch] = useState("");
  const [solExpanded, setSolExpanded] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [balanceTypes, setBalanceTypes] = useState<Record<number, "play" | "withdraw">>({});
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
      <section style={{ margin: "20px 0", padding: 16, border: "1px solid #4b5563", borderRadius: 12 }}>
        <button type="button" onClick={() => { setSolOpen(v => !v); if (!solOpen) void loadSolContracts(); }}
          style={{ padding: 12, width: "100%", fontWeight: 700 }}>
          📋 Sòl — Kontra ak peman {solOpen ? "▲" : "▼"}
        </button>
        {solOpen && <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "14px 0" }}>
            <input aria-label="Chèche kliyan Sòl" placeholder="Chèche non, telefòn oswa ID..."
              value={solSearch} onChange={e => setSolSearch(e.target.value)} style={{ padding: 10, flex: 1, minWidth: 180 }} />
            <button type="button" onClick={() => void loadSolContracts()} disabled={solLoading}>Rafrechi</button>
          </div>
          {solLoading && <p>Ap chaje kontra yo...</p>}
          {solError && <p role="alert">{solError}</p>}
          {!solLoading && !solError && <p>{solContracts.length} kontra Sòl</p>}
          {!solLoading && !solError && <div style={{background:"#0e7146",border:"1px solid #6ed3a0",borderRadius:12,padding:"16px 20px",margin:"12px 0 18px",color:"#fff"}}>
            <div style={{fontSize:14,fontWeight:700}}>Total Sòl resevwa — tout kontra yo</div>
            <strong style={{display:"block",fontSize:"clamp(24px,5vw,34px)",marginTop:6}}>{solMoney(solGrandTotalCents)}</strong>
            <small style={{display:"block",marginTop:5}}>Sòm kontribisyon ki konfime nan tout {solContracts.length} kontra ki nan lis la. Pa konte PIX annatant ni mwa ki poko peye.</small>
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


      <section style={{marginBottom:20}}>
        <button type="button" onClick={() => {setWithdrawalsOpen(v=>!v);if(!withdrawalsOpen)void loadWithdrawals();}}>
          💸 Demann retrè Sòl — Annatant / Peye {withdrawalsOpen?"▲":"▼"}
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

      <section style={{ marginBottom: 20 }}>
        <button onClick={() => setShowBroadcast((open) => !open)} aria-expanded={showBroadcast} className="admin-broadcast-toggle"><span>📣 Broadcast Notification</span><span>{showBroadcast ? "✕ Close" : "Open ▾"}</span></button>
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
                <select value={balanceTypes[u.id] || "play"} onChange={(e)=>setBalanceTypes(s=>({...s,[u.id]:e.target.value as "play"|"withdraw"}))} style={{display:"block",marginTop:6}}>
                  <option value="play">Disponib pou jwe</option>
                  <option value="withdraw">Disponib pou retire</option>
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

