
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ title: "", message: "", priority: "info", imageUrl: "", linkUrl: "", recipientType: "all", recipientUserId: "" });
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [sendingNotification, setSendingNotification] = useState(false);

  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);
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
    const res = await axios.get(`${API}/api/admin/users`, auth);
    setUsers(res.data);
  };

  const fetchDisabledNumbers = async () => {
    const res = await axios.get(`${API}/api/admin/disabled-numbers`, auth);
    setDisabledNumbers(res.data);
  };

  const fetchDisabledLocations = async () => {
    const res = await axios.get(`${API}/api/admin/disabled-locations`, auth);
    setDisabledLocations(res.data);
  };

  const fetchNotificationHistory = async () => {
    const res = await axios.get(`${API}/api/notifications/history`, auth);
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
      alert(err.response?.data?.message || "Failed to send notification");
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

  const handleAddPwen = async (userId) => {
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

  const handleAdminStatus = async (user) => {
    const nextStatus = !user.isAdmin;
    const action = nextStatus ? "promote this user to admin" : "remove admin access from this user";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    try {
      await axios.patch(`${API}/api/admin/users/${user.id}/admin-status`, { isAdmin: nextStatus }, auth);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update admin status");
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm("Delete this user?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API}/api/auth/users/${userId}`, auth);
      refreshAll();
    } catch (err) {
      alert("Error deleting user");
    }
  };

  const handleRemovePwen = async (userId) => {
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

    const res = await axios.post(
      `${API}/api/admin/disabled-numbers`,
      { numbers: merged },
      auth
    );

    setDisabledNumbers(res.data.disabledNumbers);
    setInputNumbers("");
  };

  const enableNumber = async (num) => {
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

    const res = await axios.post(
      `${API}/api/admin/disabled-locations`,
      { locations: merged },
      auth
    );

    setDisabledLocations(res.data.disabledLocations);
    setSelectedLocation("");
  };

  const enableLocation = async (loc) => {
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
    String(user.phone).includes(search)
  );
}, [users, searchUser]);
  /* ================= UI ================= //remover el index do la do do u no map para parar el admin page*/

  return (
    <div style={{ padding: 24 }}>
      <h2>👑 Admin Dashboard</h2>

      <section style={{ marginBottom: 30, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <h3>📣 Broadcast Notification</h3>
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
      </section>

   

<input
  type="text"
  placeholder="🔍 Search phone number..."
  value={searchUser}
  onChange={(e) => setSearchUser(e.target.value)}
  style={{
    width: 300,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  }}
/>

      <table border="1" width="100%">
        <thead>
          <tr>
            <th>ID</th>
            <th>Phone</th>
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
              <td>{u.phone}</td>
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
