// // src/pages/AdminBets.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// const badgeColor = (s = "") => {
//   switch (s.toLowerCase()) {
//     case "won": return "#16a34a";
//     case "lost": return "#dc2626";
//     case "paid": return "#2563eb";
//     case "pending": return "#9ca3af";
//     default: return "#6b7280";
//   }
// };
// const fmt = (d) => {
//   const dt = new Date(d);
//   return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
// };

// export default function AdminBets() {
//   const nav = useNavigate();
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // filters
//   const [type, setType] = useState("all");      // all | yonchif | maryaj | twachif
//   const [status, setStatus] = useState("all");  // all | pending | won | lost | paid
//   const [q, setQ] = useState("");

//   const token = localStorage.getItem("token") || "";
//   const isAdmin = (() => {
//     try { return JSON.parse(localStorage.getItem("isAdmin") ?? "false") === true; }
//     catch { return false; }
//   })();

//   // Always build an explicit auth header for each call
//   const auth = useMemo(
//     () => ({ headers: { Authorization: `Bearer ${token}` } }),
//     [token]
//   );

//   const guard = () => {
//     if (!token) {
//       alert("Access denied: No token provided");
//       nav("/");
//       return false;
//     }
//     if (!isAdmin) {
//       alert("Admin only");
//       nav("/");
//       return false;
//     }
//     return true;
//   };

//   const load = async () => {
//     if (!guard()) return;
//     setLoading(true);
//     try {
//       const params = {};
//       if (type !== "all") params.type = type;
//       if (status !== "all") params.status = status;

//       const res = await axios.get(`${API}/api/admin/bets`, { ...auth, params });
//       setItems(Array.isArray(res.data) ? res.data : (res.data.items || []));
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to load bets");
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateStatus = async (row, newStatus) => {
//     if (!guard()) return;
//     try {
//       await axios.patch(
//         `${API}/api/admin/bets/${row.type}/${row.id}/status`,
//         { status: newStatus },
//         auth
//       );
//       await load();
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to update bet");
//     }
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [type, status]);

//   // client search filter
//   const filtered = useMemo(() => {
//     const needle = q.trim().toLowerCase();
//     if (!needle) return items;
//     return items.filter((it) => {
//       const hay = `${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`.toLowerCase();
//       return hay.includes(needle);
//     });
//   }, [items, q]);

//   return (
//     <div style={{ padding: 16 }}>
//       <h2>👑 Admin — Manage Bets</h2>

//       <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
//         <select value={type} onChange={(e) => setType(e.target.value)}>
//           <option value="all">All types</option>
//           <option value="yonchif">Yon Chif</option>
//           <option value="maryaj">Maryaj</option>
//           <option value="twachif">Twa Chif</option>
//         </select>

//         <select value={status} onChange={(e) => setStatus(e.target.value)}>
//           <option value="all">All status</option>
//           <option value="pending">Pending</option>
//           <option value="won">Won</option>
//           <option value="lost">Lost</option>
//           <option value="paid">Paid</option>
//         </select>

//         <input
//           placeholder="Search (phone, numbers, type)…"
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//           style={{ flex: 1 }}
//         />

//         <button onClick={load} disabled={loading}>
//           {loading ? "Loading..." : "Refresh"}
//         </button>
//       </div>

//       {loading ? (
//         <p>Loading…</p>
//       ) : filtered.length === 0 ? (
//         <p>No bets found.</p>
//       ) : (
//         <div style={{ display: "grid", gap: 12 }}>
//           {filtered.map((b) => (
//             <div
//               key={`${b.type}-${b.id}`}
//               style={{
//                 background: "#0f172a",
//                 color: "#e5e7eb",
//                 borderRadius: 12,
//                 padding: "12px 14px",
//                 border: "1px solid #1f2937",
//               }}
//             >
//               <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//                 <strong>
//                   #{b.id} • {b.type} • {b.phone || `user:${b.userId}`}
//                 </strong>
//                 <span
//                   style={{
//                     background: badgeColor(b.status),
//                     color: "#fff",
//                     padding: "2px 10px",
//                     borderRadius: 999,
//                     fontSize: 12,
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   {b.status}
//                 </span>
//               </div>

//               <div style={{ marginTop: 6, opacity: 0.9 }}>
//                 <div>Numbers: <strong>{b.numbers}</strong></div>
//                 {b.pwen != null && <div>Pwen: <strong>{b.pwen}</strong></div>}
//                 {b.draw && <div>Draw: <strong>{b.draw}</strong></div>}
//                 <div style={{ opacity: 0.7, marginTop: 4 }}>{fmt(b.createdAt)}</div>
//               </div>

//               <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
//                 <button onClick={() => updateStatus(b, "won")}>✅ Mark Won</button>
//                 <button onClick={() => updateStatus(b, "lost")}>❌ Mark Lost</button>
//                 <button onClick={() => updateStatus(b, "paid")}>💸 Mark Paid</button>
//                 <button onClick={() => updateStatus(b, "pending")}>🕓 Back to Pending</button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
// src/pages/AdminBets.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const badgeColor = (s = "") => {
  switch (s.toLowerCase()) {
    case "won": return "#16a34a";
    case "lost": return "#dc2626";
    case "paid": return "#2563eb";
    case "pending": return "#9ca3af";
    default: return "#6b7280";
  }
};

const fmt = (d) => {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "";
  }
};

export default function AdminBets() {
  const navigate = useNavigate();

  // data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowBusy, setRowBusy] = useState(null); // `${type}-${id}` when patching

  // filters
  const [type, setType] = useState("all");      // all | yonchif | maryaj | twachif
  const [status, setStatus] = useState("all");  // all | pending | won | lost | paid
  const [q, setQ] = useState("");

  // auth
  const token = localStorage.getItem("token") || "";
  const isAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("isAdmin") ?? "false") === true;
    } catch {
      return false;
    }
  })();
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const guard = () => {
    if (!token) {
      alert("Access denied: No token provided");
      navigate("/");
      return false;
    }
    if (!isAdmin) {
      alert("Admin only");
      navigate("/");
      return false;
    }
    return true;
  };

  const load = async () => {
    if (!guard()) return;
    setLoading(true);
    try {
      const params = {};
      if (type !== "all") params.type = type;
      if (status !== "all") params.status = status;

      const res = await axios.get(`${API}/api/admin/bets`, { ...auth, params });
      // backend may return {items: [...]} or just [...]
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(list);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to load bets");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (row, newStatus) => {
    if (!guard()) return;
    const key = `${row.type}-${row.id}`;
    setRowBusy(key);
    try {
      await axios.patch(
        `${API}/api/admin/bets/${row.type}/${row.id}/status`,
        { status: newStatus },
        auth
      );
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update bet");
    } finally {
      setRowBusy(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status]);

  // client search filter
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const hay = `${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2>👑 Admin — Manage Bets</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
          <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="yonchif">Yon Chif</option>
          <option value="maryaj">Maryaj</option>
          <option value="twachif">Twa Chif</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="paid">Paid</option>
        </select>

        <input
          placeholder="Search (phone, numbers, type)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : filtered.length === 0 ? (
        <p>No bets found.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((b) => {
            const busy = rowBusy === `${b.type}-${b.id}`;
            return (
              <div
                key={`${b.type}-${b.id}`}
                style={{
                  background: "#0f172a",
                  color: "#e5e7eb",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid #1f2937",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>
                    #{b.id} • {b.type} • {b.phone || `user:${b.userId}`}
                  </strong>
                  <span
                    style={{
                      background: badgeColor(b.status),
                      color: "#fff",
                      padding: "2px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    {b.status}
                  </span>
                </div>

                <div style={{ marginTop: 6, opacity: 0.9 }}>
                  <div>Numbers: <strong>{b.numbers}</strong></div>
                  {b.pwen != null && <div>Pwen: <strong>{b.pwen}</strong></div>}
                  {b.draw && <div>Draw: <strong>{b.draw}</strong></div>}
                  <div style={{ opacity: 0.7, marginTop: 4 }}>{fmt(b.createdAt)}</div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => updateStatus(b, "won")} disabled={busy}>
                    {busy ? "…" : "✅ Mark Won"}
                  </button>
                  <button onClick={() => updateStatus(b, "lost")} disabled={busy}>
                    {busy ? "…" : "❌ Mark Lost"}
                  </button>
                  <button onClick={() => updateStatus(b, "paid")} disabled={busy}>
                    {busy ? "…" : "💸 Mark Paid"}
                  </button>
                  <button onClick={() => updateStatus(b, "pending")} disabled={busy}>
                    {busy ? "…" : "🕓 Back to Pending"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
