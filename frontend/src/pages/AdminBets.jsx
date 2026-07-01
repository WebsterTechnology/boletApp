
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
//   try {
//     const dt = new Date(d);
//     return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//     })}`;
//   } catch {
//     return "";
//   }
// };

// export default function AdminBets() {
//   const navigate = useNavigate();

//   // data
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [rowBusy, setRowBusy] = useState(null);

//   // filters
//   const [type, setType] = useState("all");
//   const [status, setStatus] = useState("all");
//   const [q, setQ] = useState("");

//   // 👥 NEW: Group by user
//   const [groupByUser, setGroupByUser] = useState(false);
//   const [expandedUsers, setExpandedUsers] = useState({});

//   // 🕐 NEW: Date grouping
//   const [groupByDate, setGroupByDate] = useState(false);
//   const [expandedDates, setExpandedDates] = useState({});

//   // 📌 NEW: Quick filters
//   const [showOnlyPending, setShowOnlyPending] = useState(false);

//   // auth
//   const token = localStorage.getItem("token") || "";
//   const isAdmin = (() => {
//     try {
//       return JSON.parse(localStorage.getItem("isAdmin") ?? "false") === true;
//     } catch {
//       return false;
//     }
//   })();
//   const auth = useMemo(
//     () => ({ headers: { Authorization: `Bearer ${token}` } }),
//     [token]
//   );

//   const guard = () => {
//     if (!token) {
//       alert("Access denied: No token provided");
//       navigate("/");
//       return false;
//     }
//     if (!isAdmin) {
//       alert("Admin only");
//       navigate("/");
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
      
//       // Apply pending filter if enabled
//       let statusParam = status;
//       if (showOnlyPending) statusParam = "pending";
//       if (statusParam !== "all") params.status = statusParam;

//       const res = await axios.get(`${API}/api/admin/bets`, { ...auth, params });
//       const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
//       setItems(list);
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to load bets");
//       setItems([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const updateStatus = async (row, newStatus) => {
//     if (!guard()) return;
//     const key = `${row.type}-${row.id}`;
//     setRowBusy(key);
//     try {
//       await axios.patch(
//         `${API}/api/admin/bets/${row.type}/${row.id}/status`,
//         { status: newStatus },
//         auth
//       );
//       await load();
//     } catch (e) {
//       alert(e.response?.data?.message || "Failed to update bet");
//     } finally {
//       setRowBusy(null);
//     }
//   };

//   useEffect(() => {
//     load();
//   }, [type, status, showOnlyPending]);

//   // Toggle user expansion
//   const toggleUser = (userId) => {
//     setExpandedUsers(prev => ({
//       ...prev,
//       [userId]: !prev[userId]
//     }));
//   };

//   // Toggle date expansion
//   const toggleDate = (date) => {
//     setExpandedDates(prev => ({
//       ...prev,
//       [date]: !prev[date]
//     }));
//   };

//   // Expand all users
//   const expandAllUsers = () => {
//     if (!groupedByUser) return;
//     const allExpanded = {};
//     Object.keys(groupedByUser).forEach(userId => {
//       allExpanded[userId] = true;
//     });
//     setExpandedUsers(allExpanded);
//   };

//   // Collapse all users
//   const collapseAllUsers = () => {
//     setExpandedUsers({});
//   };

//   // client search filter
//   const filtered = useMemo(() => {
//     const needle = q.trim().toLowerCase();
//     if (!needle) return items;
//     return items.filter((it) => {
//       const hay = `${it.phone ?? ""} ${it.numbers ?? ""} ${it.type ?? ""} ${it.status ?? ""}`.toLowerCase();
//       return hay.includes(needle);
//     });
//   }, [items, q]);

//   // 👥 NEW: Group bets by user
//   const groupedByUser = useMemo(() => {
//     if (!groupByUser) return null;
    
//     const groups = {};
//     filtered.forEach(bet => {
//       const userId = bet.userId || 'unknown';
//       const phone = bet.phone || `User ${userId}`;
//       if (!groups[userId]) {
//         groups[userId] = {
//           userId,
//           phone,
//           bets: [],
//           totalPwen: 0,
//           pendingCount: 0,
//           wonCount: 0,
//           lostCount: 0,
//           paidCount: 0
//         };
//       }
//       groups[userId].bets.push(bet);
//       groups[userId].totalPwen += Number(bet.pwen || 0);
      
//       // Count by status
//       const status = (bet.status || 'pending').toLowerCase();
//       if (status === 'pending') groups[userId].pendingCount++;
//       else if (status === 'won') groups[userId].wonCount++;
//       else if (status === 'lost') groups[userId].lostCount++;
//       else if (status === 'paid') groups[userId].paidCount++;
//     });
    
//     // Sort users by most recent bet
//     Object.values(groups).forEach(group => {
//       group.bets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     });
    
//     return groups;
//   }, [filtered, groupByUser]);

//   // 🕐 NEW: Group bets by date
//   const groupedByDate = useMemo(() => {
//     if (!groupByDate) return null;
    
//     const groups = {};
//     filtered.forEach(bet => {
//       const date = new Date(bet.createdAt).toLocaleDateString();
//       if (!groups[date]) {
//         groups[date] = {
//           date,
//           bets: [],
//           totalPwen: 0
//         };
//       }
//       groups[date].bets.push(bet);
//       groups[date].totalPwen += Number(bet.pwen || 0);
//     });
    
//     // Sort dates (newest first)
//     const sortedDates = Object.keys(groups).sort((a, b) => 
//       new Date(b) - new Date(a)
//     );
    
//     const sortedGroups = {};
//     sortedDates.forEach(date => {
//       sortedGroups[date] = groups[date];
//       sortedGroups[date].bets.sort((a, b) => 
//         new Date(b.createdAt) - new Date(a.createdAt)
//       );
//     });
    
//     return sortedGroups;
//   }, [filtered, groupByDate]);

//   // Reset grouping options
//   const resetGrouping = () => {
//     setGroupByUser(false);
//     setGroupByDate(false);
//     setExpandedUsers({});
//     setExpandedDates({});
//   };

//   // Render bet card (same as before)
//   const renderBetCard = (b) => {
//     const busy = rowBusy === `${b.type}-${b.id}`;
//     return (
//       <div
//         key={`${b.type}-${b.id}`}
//         style={{
//           background: "#0f172a",
//           color: "#e5e7eb",
//           borderRadius: 12,
//           padding: "12px 14px",
//           border: "1px solid #1f2937",
//           marginBottom: 8
//         }}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//           <strong>
//             #{b.id} • {b.type} • {b.phone || `user:${b.userId}`}
//           </strong>
//           <span
//             style={{
//               background: badgeColor(b.status),
//               color: "#fff",
//               padding: "2px 10px",
//               borderRadius: 999,
//               fontSize: 12,
//               textTransform: "uppercase",
//             }}
//           >
//             {b.status}
//           </span>
//         </div>

//         <div style={{ marginTop: 6, opacity: 0.9 }}>
//           <div>Numbers: <strong>{b.numbers}</strong></div>
//           {b.pwen != null && <div>Pwen: <strong>{b.pwen}</strong></div>}
//           {b.draw && <div>Draw: <strong>{b.draw}</strong></div>}
//           <div style={{ opacity: 0.7, marginTop: 4 }}>{fmt(b.createdAt)}</div>
//         </div>

//         <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
//           <button onClick={() => updateStatus(b, "won")} disabled={busy}>
//             {busy ? "…" : "✅ Mark Won"}
//           </button>
//           <button onClick={() => updateStatus(b, "lost")} disabled={busy}>
//             {busy ? "…" : "❌ Mark Lost"}
//           </button>
//           <button onClick={() => updateStatus(b, "paid")} disabled={busy}>
//             {busy ? "…" : "💸 Mark Paid"}
//           </button>
//           <button onClick={() => updateStatus(b, "pending")} disabled={busy}>
//             {busy ? "…" : "🕓 Back to Pending"}
//           </button>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
//         <h2>👑 Admin — Manage Bets</h2>
//         <div style={{ display: "flex", gap: 8 }}>
//           <button onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
//           <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
//         </div>
//       </div>

//       {/* 🔍 FILTERS ROW */}
//       <div style={{ display: "flex", gap: 12, margin: "12px 0", flexWrap: "wrap" }}>
//         <select value={type} onChange={(e) => setType(e.target.value)}>
//           <option value="all">All types</option>
//           <option value="yonchif">Yon Chif</option>
//           <option value="dechif">Bòlèt</option>
//           <option value="maryaj">Maryaj</option>
//           <option value="twachif">Twa Chif</option>
//           <option value="katchif">Kat Chif</option>
//         </select>

//         <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={showOnlyPending}>
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
//           style={{ flex: 1, minWidth: "200px" }}
//         />
//       </div>

//       {/* 🎯 NEW: ORGANIZATION TOOLS */}
//       <div style={{ 
//         display: "flex", 
//         gap: 12, 
//         margin: "12px 0", 
//         padding: "12px",
//         background: "#1e293b",
//         borderRadius: 8,
//         flexWrap: "wrap",
//         alignItems: "center"
//       }}>
//         <span style={{ color: "#94a3b8", fontWeight: "bold" }}>📋 Organize:</span>
        
//         <button 
//           onClick={() => {
//             if (groupByUser) {
//               setGroupByUser(false);
//             } else {
//               setGroupByUser(true);
//               setGroupByDate(false);
//             }
//           }}
//           style={{
//             background: groupByUser ? "#3b82f6" : "#334155",
//             color: "white",
//             border: "none",
//             padding: "6px 12px",
//             borderRadius: 6,
//             cursor: "pointer"
//           }}
//         >
//           👥 Group by User
//         </button>
        
//         <button 
//           onClick={() => {
//             if (groupByDate) {
//               setGroupByDate(false);
//             } else {
//               setGroupByDate(true);
//               setGroupByUser(false);
//             }
//           }}
//           style={{
//             background: groupByDate ? "#3b82f6" : "#334155",
//             color: "white",
//             border: "none",
//             padding: "6px 12px",
//             borderRadius: 6,
//             cursor: "pointer"
//           }}
//         >
//           📅 Group by Date
//         </button>
        
//         <button 
//           onClick={() => setShowOnlyPending(!showOnlyPending)}
//           style={{
//             background: showOnlyPending ? "#eab308" : "#334155",
//             color: "white",
//             border: "none",
//             padding: "6px 12px",
//             borderRadius: 6,
//             cursor: "pointer"
//           }}
//         >
//           ⏳ {showOnlyPending ? "Show All" : "Only Pending"}
//         </button>
        
//         {groupByUser && (
//           <>
//             <button onClick={expandAllUsers} style={{ background: "#475569", color: "white", border: "none", padding: "6px 12px", borderRadius: 6 }}>
//               🔽 Expand All
//             </button>
//             <button onClick={collapseAllUsers} style={{ background: "#475569", color: "white", border: "none", padding: "6px 12px", borderRadius: 6 }}>
//               🔼 Collapse All
//             </button>
//             <span style={{ color: "#94a3b8" }}>
//               {Object.keys(groupedByUser || {}).length} users
//             </span>
//           </>
//         )}
        
//         {(groupByUser || groupByDate) && (
//           <button onClick={resetGrouping} style={{ background: "#64748b", color: "white", border: "none", padding: "6px 12px", borderRadius: 6 }}>
//             ✖ Clear Grouping
//           </button>
//         )}
//       </div>

//       {/* 📊 STATS BAR */}
//       {!loading && filtered.length > 0 && (
//         <div style={{ 
//           background: "#1e1e2e", 
//           padding: "8px 16px", 
//           borderRadius: 8, 
//           marginBottom: 16,
//           display: "flex",
//           gap: 20,
//           flexWrap: "wrap",
//           color: "#cbd5e1"
//         }}>
//           <span>📊 Total: <strong>{filtered.length}</strong> bets</span>
//           <span>💰 Total Pwen: <strong>{filtered.reduce((sum, b) => sum + Number(b.pwen || 0), 0)}</strong></span>
//           <span>⏳ Pending: <strong>{filtered.filter(b => (b.status || 'pending').toLowerCase() === 'pending').length}</strong></span>
//           <span>✅ Won: <strong>{filtered.filter(b => (b.status || '').toLowerCase() === 'won').length}</strong></span>
//           <span>❌ Lost: <strong>{filtered.filter(b => (b.status || '').toLowerCase() === 'lost').length}</strong></span>
//           <span>💸 Paid: <strong>{filtered.filter(b => (b.status || '').toLowerCase() === 'paid').length}</strong></span>
//         </div>
//       )}

//       {loading ? (
//         <p>Loading…</p>
//       ) : filtered.length === 0 ? (
//         <p>No bets found.</p>
//       ) : (
//         <div style={{ display: "grid", gap: 12 }}>
          
//           {/* 👥 GROUP BY USER VIEW */}
//           {groupByUser && groupedByUser && (
//             Object.values(groupedByUser).map((group) => {
//               const isExpanded = expandedUsers[group.userId];
//               return (
//                 <div key={group.userId} style={{ 
//                   background: "#1e1e2e", 
//                   borderRadius: 12, 
//                   border: "1px solid #334155",
//                   overflow: "hidden"
//                 }}>
//                   {/* User Header - Click to expand/collapse */}
//                   <div 
//                     onClick={() => toggleUser(group.userId)}
//                     style={{ 
//                       background: "#2d3a4f", 
//                       padding: "12px 16px",
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       cursor: "pointer",
//                       borderBottom: isExpanded ? "1px solid #475569" : "none"
//                     }}
//                   >
//                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                       <span style={{ fontSize: 18 }}>{isExpanded ? "📂" : "📁"}</span>
//                       <div>
//                         <strong style={{ fontSize: 16 }}>{group.phone}</strong>
//                         <span style={{ marginLeft: 12, color: "#94a3b8", fontSize: 14 }}>
//                           🎲 {group.bets.length} bets • 💰 {group.totalPwen} pwen
//                         </span>
//                       </div>
//                     </div>
//                     <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                       {group.pendingCount > 0 && (
//                         <span style={{ background: "#9ca3af", color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
//                           ⏳ {group.pendingCount}
//                         </span>
//                       )}
//                       {group.wonCount > 0 && (
//                         <span style={{ background: "#16a34a", color: "white", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>
//                           ✅ {group.wonCount}
//                         </span>
//                       )}
//                       <span>{isExpanded ? "▼" : "▶"}</span>
//                     </div>
//                   </div>
                  
//                   {/* User Bets - Collapsible */}
//                   {isExpanded && (
//                     <div style={{ padding: "16px" }}>
//                       {group.bets.map(bet => renderBetCard(bet))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )}
          
//           {/* 📅 GROUP BY DATE VIEW */}
//           {groupByDate && groupedByDate && (
//             Object.values(groupedByDate).map((group) => {
//               const isExpanded = expandedDates[group.date];
//               return (
//                 <div key={group.date} style={{ 
//                   background: "#1e1e2e", 
//                   borderRadius: 12, 
//                   border: "1px solid #334155",
//                   overflow: "hidden"
//                 }}>
//                   {/* Date Header - Click to expand/collapse */}
//                   <div 
//                     onClick={() => toggleDate(group.date)}
//                     style={{ 
//                       background: "#2d3a4f", 
//                       padding: "12px 16px",
//                       display: "flex",
//                       justifyContent: "space-between",
//                       alignItems: "center",
//                       cursor: "pointer",
//                       borderBottom: isExpanded ? "1px solid #475569" : "none"
//                     }}
//                   >
//                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                       <span style={{ fontSize: 18 }}>{isExpanded ? "📆" : "📅"}</span>
//                       <div>
//                         <strong style={{ fontSize: 16 }}>{group.date}</strong>
//                         <span style={{ marginLeft: 12, color: "#94a3b8", fontSize: 14 }}>
//                           🎲 {group.bets.length} bets • 💰 {group.totalPwen} pwen
//                         </span>
//                       </div>
//                     </div>
//                     <span>{isExpanded ? "▼" : "▶"}</span>
//                   </div>
                  
//                   {/* Date Bets - Collapsible */}
//                   {isExpanded && (
//                     <div style={{ padding: "16px" }}>
//                       {group.bets.map(bet => renderBetCard(bet))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })
//           )}
          
//           {/* DEFAULT FLAT VIEW */}
//           {!groupByUser && !groupByDate && filtered.map(b => renderBetCard(b))}
          
//         </div>
//       )}
//     </div>
//   );
// }

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminBets.css";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001";

const GAME_LABELS = {
  yonchif: "Yon Chif",
  dechif: "Bòlèt",
  twachif: "Loto 3",
  katchif: "Loto 4",
  maryaj: "Maryaj",
};

const GAME_ORDER = [
  "dechif",
  "twachif",
  "maryaj",
  "katchif",
  "yonchif",
];

const STATUS_LABELS = {
  pending: "PENDING",
  won: "WON",
  lost: "LOST",
  paid: "PAID",
};

const normalizeType = (type = "") =>
  String(type).toLowerCase().replace(/\s+/g, "");

const fmtDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
};

const fmtTime = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLocation = (bet) =>
  bet.draw ||
  bet.location ||
  bet.lot ||
  bet.city ||
  "Unknown";

const getNumbers = (bet) => {
  const type = normalizeType(bet.type);

  if (type === "maryaj") {
    if (bet.part1 && bet.part2) {
      return `${bet.part1} x ${bet.part2}`;
    }

    if (bet.numbers) {
      return String(bet.numbers).replace("-", " x ");
    }
  }

  return bet.numbers || bet.number || "-";
};

const getPwen = (bet) =>
  Number(bet.pwen || bet.amount || 0);

const getCustomerName = (bet) =>
  bet.name ||
  bet.username ||
  bet.customerName ||
  bet.userName ||
  bet.type ||
  "Customer";

const getPhone = (bet) =>
  bet.phone || bet.customerPhone || `user:${bet.userId}`;

const groupReceipts = (items) => {
  const receipts = {};

  items.forEach((bet) => {
    const receiptId =
      bet.receiptId || `single-${bet.type}-${bet.id}`;

    if (!receipts[receiptId]) {
      receipts[receiptId] = {
        receiptId,
        location: getLocation(bet),
        createdAt: bet.createdAt,
        status: bet.status || "pending",
        customerName: getCustomerName(bet),
        phone: getPhone(bet),
        bets: [],
      };
    }

    receipts[receiptId].bets.push(bet);
  });

  return Object.values(receipts).sort(
    (a, b) =>
      new Date(b.createdAt) -
      new Date(a.createdAt)
  );
};
function ReceiptCard({
  receipt,
  rowBusy,
  onStatusChange,
}) {
  const grouped = {};

  receipt.bets.forEach((bet) => {
    const type = normalizeType(bet.type);

    if (!grouped[type]) {
      grouped[type] = [];
    }

    grouped[type].push(bet);
  });

  const receiptTotal = receipt.bets.reduce(
    (sum, bet) => sum + getPwen(bet),
    0
  );

  const mainBet = receipt.bets[0];
  const busy =
    rowBusy === `${mainBet.type}-${mainBet.id}`;

  const status =
    String(receipt.status || "pending").toLowerCase();

  return (
    <div className="adminReceiptWrap">
      <div className="receiptPaper">
        <div className="receiptTitle">
          {receipt.location}
        </div>

        <div className="receiptSub">
          Receipt #{String(receipt.receiptId).slice(0, 8)}
        </div>

        <div className={`receiptStatus status-${status}`}>
          {STATUS_LABELS[status] || "PENDING"}
        </div>

        <div className="receiptDash" />

        {GAME_ORDER.map((type) => {
          const bets = grouped[type] || [];

          if (bets.length === 0) return null;

          return (
            <div key={type}>
              <div className="gameLabelBox">
                <span>{GAME_LABELS[type]}</span>
              </div>

              {bets.map((bet) => (
                <div
                  key={`${bet.type}-${bet.id}`}
                  className="receiptRow"
                >
                  <span>{getNumbers(bet)}</span>
                  <span>=</span>
                  <strong>{getPwen(bet)}</strong>
                </div>
              ))}
            </div>
          );
        })}

        <div className="receiptDash" />

        <div className="receiptTotal">
          *Total {receiptTotal}*
        </div>

        <div className="receiptDash" />

        <div className="receiptInfo">
          <div>
            Customer:{" "}
            <strong>{receipt.customerName}</strong>
          </div>

          <div>
            Phone: <strong>{receipt.phone}</strong>
          </div>

          <div>{fmtDate(receipt.createdAt)}</div>
          <div>{fmtTime(receipt.createdAt)}</div>
          <div>LoteNetsoft</div>
        </div>
      </div>

      <div className="adminActions">
        <button
          className="actionBtn wonBtn"
          onClick={() => onStatusChange(mainBet, "won")}
          disabled={busy}
        >
          {busy ? "..." : "✅ WON"}
        </button>

        <button
          className="actionBtn lostBtn"
          onClick={() => onStatusChange(mainBet, "lost")}
          disabled={busy}
        >
          {busy ? "..." : "❌ LOST"}
        </button>

        <button
          className="actionBtn paidBtn"
          onClick={() => onStatusChange(mainBet, "paid")}
          disabled={busy}
        >
          {busy ? "..." : "💸 PAID"}
        </button>

        <button
          className="actionBtn pendingBtn"
          onClick={() =>
            onStatusChange(mainBet, "pending")
          }
          disabled={busy}
        >
          {busy ? "..." : "🕓 PENDING"}
        </button>
      </div>
    </div>
  );
}
export default function AdminBets() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowBusy, setRowBusy] = useState(null);

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token") || "";

  const auth = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  async function load() {
    setLoading(true);

    try {
      const params = {};

      if (type !== "all")
        params.type = type;

      if (status !== "all")
        params.status = status;

      const res = await axios.get(
        `${API}/api/admin/bets`,
        {
          ...auth,
          params,
        }
      );

      setItems(
        Array.isArray(res.data)
          ? res.data
          : res.data.items || []
      );
    } catch (err) {
      console.error(err);
      alert("Unable to load bets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [type, status]);

  async function updateStatus(
    bet,
    newStatus
  ) {
    const key = `${bet.type}-${bet.id}`;

    setRowBusy(key);

    try {
      await axios.patch(
        `${API}/api/admin/bets/${bet.type}/${bet.id}/status`,
        {
          status: newStatus,
        },
        auth
      );

      await load();
    } catch (err) {
      console.error(err);
      alert("Unable to update bet.");
    }

    setRowBusy(null);
  }

  const filtered = useMemo(() => {
    const txt = search
      .trim()
      .toLowerCase();

    if (!txt) return items;

    return items.filter((b) => {
      return (
        String(b.phone || "")
          .toLowerCase()
          .includes(txt) ||
        String(b.numbers || "")
          .toLowerCase()
          .includes(txt) ||
        String(b.type || "")
          .toLowerCase()
          .includes(txt)
      );
    });
  }, [items, search]);

  const receipts = useMemo(
    () => groupReceipts(filtered),
    [filtered]
  );

  return (
    <div className="adminPage">

      <div className="topBar">

        <h1>
          🎰 Admin Bets
        </h1>

        <button
          className="refreshBtn"
          onClick={load}
        >
          Refresh
        </button>

      </div>

      <div className="filters">

        <select
          value={type}
          onChange={(e) =>
            setType(e.target.value)
          }
        >
          <option value="all">
            All Games
          </option>

          <option value="yonchif">
            Yon Chif
          </option>

          <option value="dechif">
            Bòlèt
          </option>

          <option value="maryaj">
            Maryaj
          </option>

          <option value="twachif">
            Loto 3
          </option>

          <option value="katchif">
            Loto 4
          </option>

        </select>

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >

          <option value="all">
            All Status
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="won">
            Won
          </option>

          <option value="lost">
            Lost
          </option>

          <option value="paid">
            Paid
          </option>

        </select>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

      </div>

      <div className="stats">

        <div>
          Total Receipts
          <strong>
            {receipts.length}
          </strong>
        </div>

        <div>
          Total Bets
          <strong>
            {filtered.length}
          </strong>
        </div>

        <div>
          Pending
          <strong>
            {
              filtered.filter(
                (b) =>
                  b.status === "pending"
              ).length
            }
          </strong>
        </div>

        <div>
          Won
          <strong>
            {
              filtered.filter(
                (b) =>
                  b.status === "won"
              ).length
            }
          </strong>
        </div>

        <div>
          Lost
          <strong>
            {
              filtered.filter(
                (b) =>
                  b.status === "lost"
              ).length
            }
          </strong>
        </div>

        <div>
          Paid
          <strong>
            {
              filtered.filter(
                (b) =>
                  b.status === "paid"
              ).length
            }
          </strong>
        </div>

      </div>

      {loading ? (

        <div className="loading">
          Loading...
        </div>

      ) : receipts.length === 0 ? (

        <div className="loading">
          No Bets Found
        </div>

      ) : (

        <div className="receiptGrid">

          {receipts.map((receipt) => (

            <ReceiptCard
              key={receipt.receiptId}
              receipt={receipt}
              rowBusy={rowBusy}
              onStatusChange={updateStatus}
            />

          ))}

        </div>

      )}

    </div>
  );
}
