
// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// /* ---------------- HELPERS ---------------- */
// const fmt = (d) => {
//   if (!d) return "-";
//   const dt = new Date(d);
//   return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   })}`;
// };

// export default function Fich() {
//   const [loading, setLoading] = useState(true);
//   const [items, setItems] = useState([]);
//   const [totalPwen, setTotalPwen] = useState(0);
//   const [claimBusy, setClaimBusy] = useState({});
//   const [claimed, setClaimed] = useState({});
//   const mounted = useRef(true);

//   useEffect(() => () => {
//     mounted.current = false;
//   }, []);

//   /* ---------------- LOAD DATA ---------------- */
//   const load = async ({ silent = false } = {}) => {
//     if (!silent) setLoading(true);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         if (mounted.current) {
//           setItems([]);
//           setTotalPwen(0);
//         }
//         return;
//       }

//       const headers = { Authorization: `Bearer ${token}` };

//       const res = await axios.get(`${API}/api/bets/me`, { headers });
//       const data = res?.data || {};

//       if (mounted.current) {
//         setTotalPwen(Number(data.totalPwen || 0));
//         // ✅ Use the 'items' array directly from backend
//         setItems(Array.isArray(data.items) ? data.items : []);
//       }
//     } catch (err) {
//       console.error("Fich load error:", err);
//       if (mounted.current) {
//         setItems([]);
//         setTotalPwen(0);
//       }
//     } finally {
//       if (!silent && mounted.current) setLoading(false);
//     }
//   };

//   /* ---------------- EFFECTS ---------------- */
//   useEffect(() => {
//     load();
//   }, []);

//   useEffect(() => {
//     const tick = () => {
//       if (document.visibilityState === "visible") {
//         load({ silent: true });
//       }
//     };
//     const iv = setInterval(tick, 7000);
//     window.addEventListener("focus", tick);
//     document.addEventListener("visibilitychange", tick);
//     return () => {
//       clearInterval(iv);
//       window.removeEventListener("focus", tick);
//       document.removeEventListener("visibilitychange", tick);
//     };
//   }, []);

//   const claimKey = (b) => `${b.type}-${b.id}`;

//   /* ---------------- CLAIM ---------------- */
//   const submitClaim = async (b, method) => {
//     const token = localStorage.getItem("token");
//     if (!token) return alert("Please sign in again.");

//     const key = claimKey(b);
//     if (claimBusy[key]) return;

//     let winAmount = Number(b.winAmount || b.pwen || 0);
//     if (!Number.isFinite(winAmount) || winAmount <= 0) {
//       const inp = window.prompt("Antre kantite pwen:", "0");
//       if (!inp) return;
//       winAmount = parseInt(inp, 10);
//       if (!Number.isFinite(winAmount) || winAmount <= 0) {
//         return alert("Kantite pa valab.");
//       }
//     }

//     let pixKey = null;
//     if (method === "pix") {
//       pixKey = window.prompt("Antre PIX key ou:", "");
//       if (!pixKey) return;
//     }

//     try {
//       setClaimBusy((m) => ({ ...m, [key]: true }));

//       await axios.post(
//         `${API}/api/claims`,
//         {
//           betType: b.type,
//           betId: b.id,
//           winAmount,
//           payoutMethod: method,
//           pixKey,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       setClaimed((m) => ({ ...m, [key]: true }));
//       alert("Demann lan voye bay admin lan. Mèsi!");
//     } catch (e) {
//       alert(e.response?.data?.message || "Claim failed");
//     } finally {
//       if (mounted.current) {
//         setClaimBusy((m) => ({ ...m, [key]: false }));
//       }
//     }
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div style={{ padding: "16px" }}>
//       <h2>🧾 Fich — Pari mwen yo</h2>

//       <div style={{ margin: "8px 0 16px", display: "flex", gap: 12 }}>
//         <button onClick={() => load()} disabled={loading}>
//           {loading ? "Chajman..." : "Rafrechi"}
//         </button>

//         <div
//           style={{
//             background: "#1f2937",
//             color: "#d1d5db",
//             padding: "6px 10px",
//             borderRadius: 8,
//           }}
//         >
//           Total pwen parye:{" "}
//           <strong style={{ color: "#fff" }}>{totalPwen}</strong>
//         </div>
//       </div>

//       {loading ? (
//         <p>Chajman...</p>
//       ) : items.length === 0 ? (
//         <p>Pa gen pari ankò.</p>
//       ) : (
//         <div style={{ display: "grid", gap: 12 }}>
//           {items.map((b) => {
//             const key = claimKey(b);
//             const status = (b.status || "pending").toLowerCase();
//             const won = status === "won";
//             const lost = status === "lost";
//             const paid = status === "paid";

//             // For Maryaj, format numbers specially
//             let displayNumbers = b.numbers;
//             if (b.type === "maryaj" && b.part1 && b.part2) {
//               displayNumbers = `${b.part1} ${b.part2}`;
//             }

//             // Status badge colors
//             const getStatusColor = () => {
//               switch(status) {
//                 case "won": return "#16a34a";
//                 case "lost": return "#dc2626";
//                 case "paid": return "#2563eb";
//                 case "pending": return "#9ca3af";
//                 default: return "#6b7280";
//               }
//             };

//             // Translate status for display
//             const getStatusText = () => {
//               switch(status) {
//                 case "won": return "GENYEN";
//                 case "lost": return "PÈDI";
//                 case "paid": return "PÈYE";
//                 case "pending": return "ANNATANT";
//                 default: return status;
//               }
//             };

//             return (
//               <div
//                 key={key}
//                 style={{
//                   background: "#0f172a",
//                   color: "#e5e7eb",
//                   borderRadius: 12,
//                   padding: "12px 14px",
//                   border: "1px solid #1f2937",
//                   opacity: lost || paid ? 0.8 : 1,
//                 }}
//               >
//                 {/* Header with ID, type AND status badge */}
//                 <div style={{ 
//                   display: "flex", 
//                   justifyContent: "space-between", 
//                   alignItems: "center",
//                   marginBottom: 8 
//                 }}>
//                   <strong>
//                     #{b.id} • {b.type}
//                   </strong>
                  
//                   <span
//                     style={{
//                       background: getStatusColor(),
//                       color: "#fff",
//                       padding: "4px 12px",
//                       borderRadius: 999,
//                       fontSize: 12,
//                       fontWeight: "bold",
//                       textTransform: "uppercase",
//                       letterSpacing: "0.5px"
//                     }}
//                   >
//                     {getStatusText()}
//                   </span>
//                 </div>

//                 <div>Nimewo: <strong>{displayNumbers || b.numbers || "-"}</strong></div>
//                 <div>Pwen: <strong>{b.pwen}</strong></div>
                
//                 {/* ✅ THIS IS THE FIX - Location now shows! */}
//                 {b.draw && b.draw !== "-" && (
//                   <div>Lokasyon: <strong>{b.draw}</strong></div>
//                 )}
                
//                 <div style={{ opacity: 0.7 }}>{fmt(b.createdAt)}</div>

//                 {/* Show loss message for lost bets */}
//                 {lost && (
//                   <div style={{ 
//                     marginTop: 10, 
//                     color: "#dc2626", 
//                     fontSize: 14,
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 4
//                   }}>
//                     ❌ Pari sa a pèdi
//                   </div>
//                 )}

//                 {/* Show paid message for paid bets */}
//                 {paid && (
//                   <div style={{ 
//                     marginTop: 10, 
//                     color: "#2563eb", 
//                     fontSize: 14,
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 4
//                   }}>
//                     💰 Pri pèye
//                   </div>
//                 )}

//                 {/* Claim buttons only for won bets */}
//                 {won && !claimed[key] && (
//                   <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
//                     <button onClick={() => submitClaim(b, "points")}>
//                       ➕ Ajoute nan Pwen
//                     </button>
//                     <button onClick={() => submitClaim(b, "pix")}>
//                       💸 Retire lajan PIX
//                     </button>
//                   </div>
//                 )}

//                 {/* Show message for already claimed bets */}
//                 {won && claimed[key] && (
//                   <div style={{ 
//                     marginTop: 10, 
//                     color: "#9ca3af", 
//                     fontSize: 14 
//                   }}>
//                     ✓ Reklamasyon voye
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const GAME_LABELS = {
  yonchif: "Yon Chif",
  dechif: "Bòlèt",
  twachif: "Loto 3",
  katchif: "Loto 4",
  maryaj: "Maryaj",
};

const GAME_ORDER = ["dechif", "twachif", "maryaj", "katchif", "yonchif"];

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
  bet.draw || bet.location || bet.lot || bet.city || "Unknown";

const getNumbers = (bet) => {
  const type = normalizeType(bet.type);

  if (type === "maryaj") {
    if (bet.part1 && bet.part2) return `${bet.part1} x ${bet.part2}`;
    if (bet.numbers) return String(bet.numbers).replace("-", " x ");
  }

  return bet.numbers || bet.number || "-";
};

const getPwen = (bet) => Number(bet.pwen || bet.amount || 0);

const groupByLocationAndType = (items) => {
  const result = {};

  items.forEach((bet) => {
    const location = getLocation(bet);
    const type = normalizeType(bet.type);

    if (!result[location]) result[location] = {};
    if (!result[location][type]) result[location][type] = [];

    result[location][type].push(bet);
  });

  return result;
};

export default function Fich() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalPwen, setTotalPwen] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        if (mounted.current) {
          setItems([]);
          setTotalPwen(0);
        }
        return;
      }

      const res = await axios.get(`${API}/api/bets/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = res?.data || {};

      if (mounted.current) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalPwen(Number(data.totalPwen || 0));
      }
    } catch (err) {
      console.error("Fich load error:", err);

      if (mounted.current) {
        setItems([]);
        setTotalPwen(0);
      }
    } finally {
      if (!silent && mounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };

    const interval = setInterval(tick, 7000);

    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const grouped = useMemo(() => groupByLocationAndType(items), [items]);

  const locations = Object.keys(grouped).sort();

  return (
    <div
      style={{
        padding: "16px",
        background: "#000",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          color: "#fff",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        Fich Pari Mwen Yo
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => load()}
          disabled={loading}
          style={{
            background: "#ffc107",
            border: "none",
            borderRadius: 10,
            padding: "10px 16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Chajman..." : "Rafrechi"}
        </button>

        <div
          style={{
            background: "#1f2937",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 10,
            fontWeight: "bold",
          }}
        >
          Total: {totalPwen} p
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#fff", textAlign: "center" }}>Chajman...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#fff", textAlign: "center" }}>Pa gen pari ankò.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {locations.map((location) => {
            const groups = grouped[location];

            const locationTotal = Object.values(groups)
              .flat()
              .reduce((sum, bet) => sum + getPwen(bet), 0);

            const newestDate =
              Object.values(groups)
                .flat()
                .sort(
                  (a, b) =>
                    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                )[0]?.createdAt || null;

            return (
              <div
                key={location}
                style={{
                  width: "320px",
                  maxWidth: "100%",
                  background: "#fff",
                  color: "#000",
                  padding: "14px 16px",
                  fontFamily: "monospace",
                  borderRadius: 6,
                  boxShadow: "0 8px 25px rgba(0,0,0,.35)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 24,
                    fontWeight: "bold",
                    marginBottom: 6,
                  }}
                >
                  {location}
                </div>

                <div style={{ borderTop: "2px dashed #000", margin: "8px 0" }} />

                {GAME_ORDER.map((type) => {
                  const bets = groups[type] || [];
                  if (bets.length === 0) return null;

                  return (
                    <div key={type}>
                      <div
                        style={{
                          textAlign: "center",
                          margin: "8px 0 6px",
                        }}
                      >
                        <span
                          style={{
                            background: "#102a63",
                            color: "#fff",
                            padding: "3px 12px",
                            borderRadius: 4,
                            fontWeight: "bold",
                            fontSize: 18,
                          }}
                        >
                          {GAME_LABELS[type] || type}
                        </span>
                      </div>

                      {bets.map((bet) => (
                        <div
                          key={`${type}-${bet.id}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto",
                            columnGap: 10,
                            fontSize: 16,
                            lineHeight: "22px",
                            padding: "1px 0",
                          }}
                        >
                          <span>{getNumbers(bet)}</span>
                          <span>=</span>
                          <strong>{getPwen(bet)}</strong>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 30,
                    fontWeight: "bold",
                  }}
                >
                  *Total {locationTotal}*
                </div>

                <div style={{ borderTop: "2px dashed #000", margin: "10px 0" }} />

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    lineHeight: "17px",
                  }}
                >
                  <div>Dat imprimission</div>
                  <div>{fmtDate(newestDate)}</div>
                  <div>{fmtTime(newestDate)}</div>
                  <div>LoteNetsoft</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}