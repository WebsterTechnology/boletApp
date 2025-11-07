import React, { useEffect, useState } from "react";
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdminClaims() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("requested");
  const token = localStorage.getItem("token") || "";
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    const res = await axios.get(`${API}/api/admin/claims?status=${status}`, auth);
    setItems(res.data || []);
  };

  useEffect(() => { load(); }, [status]);

  const credit = async (id) => {
    await axios.post(`${API}/api/admin/claims/${id}/credit-points`, {}, auth);
    await load();
    alert("Points credited");
  };
  const markPaid = async (id) => {
    const note = prompt("Optional note / PIX tx id:");
    await axios.post(`${API}/api/admin/claims/${id}/mark-paid`, { note }, auth);
    await load();
    alert("Marked as paid");
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>👑 Admin — Claims</h2>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="requested">Requested</option>
          <option value="credited">Credited</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={load}>Refresh</button>
      </div>

      {items.length === 0 ? (
        <p>No claims.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((c) => (
            <div key={c.id} style={{ background:"#0f172a", color:"#e5e7eb", borderRadius:12, padding:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <strong>#{c.id} • {c.betType} • user:{c.userId} {c.User?.phone ? `(${c.User.phone})` : ""}</strong>
                <span style={{ background:"#9ca3af", color:"#111", padding:"2px 8px", borderRadius:999, fontSize:12 }}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginTop:6, opacity:0.9 }}>
                <div>Choice: <strong>{c.choice}</strong></div>
                {!!c.amountPoints && <div>Points: <strong>+{c.amountPoints}</strong></div>}
                {!!Number(c.amountBRL) && <div>BRL: <strong>R$ {c.amountBRL}</strong></div>}
                {c.pixKey && <div>PIX: <strong>{c.pixKey}</strong></div>}
              </div>
              {c.status === "requested" && (
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  {c.choice === "points" && <button onClick={() => credit(c.id)}>✅ Credit points</button>}
                  {c.choice === "pix" &&  <button onClick={() => markPaid(c.id)}>💸 Mark PIX paid</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
