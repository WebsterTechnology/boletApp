import React, { useEffect, useMemo, useState } from "react";
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

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationForm>({ title: "", message: "", priority: "info", imageUrl: "", linkUrl: "", recipientType: "all", recipientUserId: "" });
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);

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
      { amount },
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
      { amount },
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
    <div style={{ padding: 24 }}>
      <h2>👑 Admin Dashboard</h2>
      <AdminChat />

      <section style={{ marginBottom: 20 }}>
        <button onClick={() => setShowBroadcast((open) => !open)} aria-expanded={showBroadcast} style={{width:"100%",maxWidth:420,padding:"12px 16px",border:"1px solid #d1d5db",borderRadius:10,background:"#111827",color:"#fff",fontWeight:700,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>📣 Broadcast Notification</span><span>{showBroadcast ? "✕ Close" : "Open ▾"}</span></button>
        {showBroadcast && (
          <div style={{marginTop:10,padding:20,border:"1px solid #ddd",borderRadius:12}}>
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
        <div style={{display:"grid",gap:8}}>{notificationHistory.map((n)=><div key={n.id} style={{padding:10,border:"1px solid #eee",borderRadius:8}}><strong>{n.title}</strong> — {n.priority}<div>{n.message}</div><div><b>Recipient:</b> {n.recipientType === "user" ? (n.recipient?.phone || `User #${n.recipientUserId}`) : "All Users"} · <b>Read count:</b> {Number(n.readCount || 0)}</div><small>{new Date(n.createdAt).toLocaleString()}</small></div>)}</div>
          </div>
        )}
      </section>

   

<input
  type="text"
  placeholder="🔍 Search name, CPF, phone or email..."
  value={searchUser}
  onChange={(e) => setSearchUser(e.target.value)}
  style={{
    width: 300,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  }}
/>

      <table border={1} width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>CPF</th>
            <th>Contact</th>
            <th>Address</th>
            <th>Points</th>
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
      </table>

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

