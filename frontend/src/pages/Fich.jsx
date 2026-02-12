// // src/pages/Fich.jsx
// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// const badgeColor = (status) => {
//   switch ((status || "").toLowerCase()) {
//     case "won": return "#16a34a";
//     case "lost": return "#dc2626";
//     case "paid": return "#2563eb";
//     case "pending": return "#9ca3af";
//     default: return "#6b7280";
//   }
// };

// const fmt = (d) => {
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
//   const [claimBusy, setClaimBusy] = useState({});     // key => boolean
//   const [claimed, setClaimed] = useState({});         // key => true (optimistic UI)
//   const mounted = useRef(true);

//   useEffect(() => () => { mounted.current = false; }, []);

//   // Convert grouped API shape to a flat list if needed
//   const flattenIfNeeded = (data) => {
//     if (Array.isArray(data.items)) return data.items;

//     const safeArr = (arr) => (Array.isArray(arr) ? arr : []);
//     const Y = safeArr(data.yonchif).map((b) => ({
//       id: b.id,
//       type: "yonchif",
//       numbers: b.nimewo ?? b.numbers ?? b.number ?? "-",
//       pwen: Number(b.pwen || 0),
//       draw: b.ville ?? b.city ?? b.lokal ?? b.draw ?? null,
//       status: b.status || "pending",
//       createdAt: b.createdAt,
//     }));
//     const M = safeArr(data.maryaj).map((b) => ({
//       id: b.id,
//       type: "maryaj",
//       numbers: b.maryaj ?? b.numbers ?? b.number ?? "-",
//       pwen: Number(b.pwen || 0),
//       draw: b.ville ?? b.city ?? b.lokal ?? b.draw ?? null,
//       status: b.status || "pending",
//       createdAt: b.createdAt,
//     }));
//     const T = safeArr(data.twachif).map((b) => ({
//       id: b.id,
//       type: "twachif",
//       numbers: b.twachif ?? b.numbers ?? b.number ?? "-",
//       pwen: Number(b.pwen || 0),
//       draw: b.ville ?? b.city ?? b.lokal ?? b.draw ?? null,
//       status: b.status || "pending",
//       createdAt: b.createdAt,
//     }));

//     return [...Y, ...M, ...T].sort(
//       (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//     );
//   };

//   // load bets (silent = true means no spinner; used by auto-refresh)
//   const load = async ({ silent = false } = {}) => {
//     if (!silent) setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         if (!silent) alert("Access denied: No token provided");
//         if (mounted.current) {
//           setItems([]);
//           setTotalPwen(0);
//         }
//         return;
//       }
//       const headers = { Authorization: `Bearer ${token}` };

//       // Try /me first; if not present, fall back to /shared
//       let res;
//       try {
//         res = await axios.get(`${API}/api/bets/me`, { headers });
//       } catch (err) {
//         if (err?.response?.status === 404) {
//           res = await axios.get(`${API}/api/bets/shared`, { headers });
//         } else {
//           throw err;
//         }
//       }

//       const data = res?.data || {};
//       if (mounted.current) {
//         setTotalPwen(Number(data.totalPwen || 0));
//         setItems(flattenIfNeeded(data));
//       }
//     } catch (e) {
//       if (!silent) alert(e.response?.data?.message || "Could not load your bets");
//       if (mounted.current) {
//         setItems([]);
//         setTotalPwen(0);
//       }
//     } finally {
//       if (!silent && mounted.current) setLoading(false);
//     }
//   };

//   // initial load
//   useEffect(() => {
//     load();
//   }, []);

//   // auto-refresh: every 7s, and on focus/visibility change
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

//   // Creates a claim (points or pix). If your backend doesn't yet have POST /api/claims,
//   // you'll see an alert with the server error; once added, this works out of the box.
//   const submitClaim = async (b, method) => {
//     const token = localStorage.getItem("token");
//     if (!token) return alert("Please sign in again.");

//     const key = claimKey(b);
//     if (claimBusy[key]) return;

//     // Determine the amount to claim.
//     // If your API already computes payouts, you can omit winAmount.
//     // Here we default to pwen==amount, but let user override.
//     let winAmount = Number(b.winAmount || b.pwen || 0);
//     if (!Number.isFinite(winAmount) || winAmount <= 0) {
//       const inp = window.prompt("Antre kantite lajan/pwen pou reklame:", "0");
//       if (!inp) return;
//       winAmount = parseInt(inp, 10);
//       if (!Number.isFinite(winAmount) || winAmount <= 0) {
//         return alert("Kantite pa valab.");
//       }
//     }

//     let pixKey = null;
//     if (method === "pix") {
//       pixKey = window.prompt("Antre PIX key ou (email/CPF/telefone/chave aleatória):", "");
//       if (!pixKey) return;
//     }

//     try {
//       setClaimBusy((m) => ({ ...m, [key]: true }));
//       await axios.post(
//         `${API}/api/claims`,
//         {
//           betType: b.type,       // "yonchif" | "maryaj" | "twachif"
//           betId: b.id,
//           winAmount,             // integer
//           payoutMethod: method,  // "points" | "pix"
//           pixKey,                // only for pix method
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       // Optimistic: hide actions for this bet and notify
//       setClaimed((m) => ({ ...m, [key]: true }));
//       alert(
//         method === "points"
//           ? "Demann pou ajoute pwen voye bay admin lan. Mèsi!"
//           : "Demann pou resevwa lajan via PIX voye bay admin lan. Mèsi!"
//       );
//     } catch (e) {
//       const msg =
//         e.response?.data?.message ||
//         e.response?.data?.error ||
//         e.message ||
//         "Failed to create claim";
//       alert(msg);
//     } finally {
//       if (mounted.current) {
//         setClaimBusy((m) => ({ ...m, [key]: false }));
//       }
//     }
//   };

//   return (
//     <div style={{ padding: "16px" }}>
//       <h2>🧾 Fich — Mes paris</h2>

//       <div
//         style={{
//           margin: "8px 0 16px",
//           display: "flex",
//           gap: 12,
//           alignItems: "center",
//         }}
//       >
//         <button onClick={() => load()} disabled={loading}>
//           {loading ? "Loading..." : "Refresh"}
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
//         <p>Loading...</p>
//       ) : items.length === 0 ? (
//         <p>No bets yet.</p>
//       ) : (
//         <div style={{ display: "grid", gap: 12 }}>
//           {items.map((b) => {
//             const key = claimKey(b);
//             const won = (b.status || "").toLowerCase() === "won";
//             const disabled = !!claimBusy[key];
//             const alreadyClaimed = !!claimed[key];

//             return (
//               <div
//                 key={key}
//                 style={{
//                   background: "#0f172a",
//                   color: "#e5e7eb",
//                   borderRadius: 12,
//                   padding: "12px 14px",
//                   border: "1px solid #1f2937",
//                 }}
//               >
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     gap: 8,
//                   }}
//                 >
//                   <strong>
//                     #{b.id} • {b.type}
//                   </strong>
//                   <span
//                     style={{
//                       background: badgeColor(b.status),
//                       color: "#fff",
//                       padding: "2px 10px",
//                       borderRadius: 999,
//                       fontSize: 12,
//                       textTransform: "uppercase",
//                     }}
//                   >
//                     {b.status || "pending"}
//                   </span>
//                 </div>

//                 <div style={{ marginTop: 6, opacity: 0.9 }}>
//                   <div>
//                     Numbers: <strong>{b.numbers}</strong>
//                   </div>
//                   <div>
//                     Pwen: <strong>{b.pwen}</strong>
//                   </div>
//                   {b.draw && (
//                     <div>
//                       Draw: <strong>{b.draw}</strong>
//                     </div>
//                   )}
//                   <div style={{ opacity: 0.7, marginTop: 4 }}>
//                     {fmt(b.createdAt)}
//                   </div>
//                 </div>

//                 {/* Win actions */}
//                 {won && !alreadyClaimed && (
//                   <div
//                     style={{
//                       display: "flex",
//                       gap: 10,
//                       marginTop: 10,
//                       flexWrap: "wrap",
//                     }}
//                   >
//                     <button
//                       onClick={() => submitClaim(b, "points")}
//                       disabled={disabled}
//                       style={{
//                         background: "#16a34a",
//                         color: "#fff",
//                         border: "none",
//                         padding: "8px 12px",
//                         borderRadius: 10,
//                         cursor: disabled ? "not-allowed" : "pointer",
//                       }}
//                       title="Krediye pwen sou kont mwen"
//                     >
//                       {disabled ? "..." : "➕ Add to Points"}
//                     </button>
//                     <button
//                       onClick={() => submitClaim(b, "pix")}
//                       disabled={disabled}
//                       style={{
//                         background: "#2563eb",
//                         color: "#fff",
//                         border: "none",
//                         padding: "8px 12px",
//                         borderRadius: 10,
//                         cursor: disabled ? "not-allowed" : "pointer",
//                       }}
//                       title="Mande lajan via PIX"
//                     >
//                       {disabled ? "..." : "💸 Cashout via PIX"}
//                     </button>
//                   </div>
//                 )}

//                 {won && alreadyClaimed && (
//                   <div
//                     style={{
//                       marginTop: 10,
//                       fontSize: 12,
//                       color: "#93c5fd",
//                       background: "#1e293b",
//                       padding: "6px 10px",
//                       borderRadius: 8,
//                     }}
//                   >
//                     Demann ou an voye bay admin lan. N ap fè w konnen lè li rezoud. ✅
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
// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// const badgeColor = (status) => {
//   switch ((status || "").toLowerCase()) {
//     case "won": return "#16a34a";
//     case "lost": return "#dc2626";
//     case "paid": return "#2563eb";
//     case "pending": return "#9ca3af";
//     default: return "#6b7280";
//   }
// };

// const fmt = (d) => {
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

//   useEffect(() => () => { mounted.current = false; }, []);

//   /* ---------------- FIXED FLATTEN ---------------- */
//   const flattenIfNeeded = (data) => {
//     if (Array.isArray(data.items)) return data.items;

//     const safeArr = (arr) => (Array.isArray(arr) ? arr : []);

//     const mapBet = (arr, type) =>
//       safeArr(arr).map((b) => ({
//         id: b.id,
//         type,
//         numbers: b.nimewo ?? b.numbers ?? b.number ?? b.maryaj ?? "-",
//         pwen: Number(b.pwen || 0),
//         draw: b.ville ?? b.city ?? b.lokal ?? b.draw ?? null,
//         status: b.status || "pending",
//         createdAt: b.createdAt,
//       }));

//     const Y = mapBet(data.yonchif, "yonchif");
//     const M = mapBet(data.maryaj, "maryaj");
//     const T = mapBet(data.twachif, "twachif");
//     const K = mapBet(data.katchif, "katchif"); // ✅ ADDED

//     return [...Y, ...M, ...T, ...K].sort(
//       (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//     );
//   };

//   /* ---------------- LOAD ---------------- */
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
//       let res;

//       try {
//         res = await axios.get(`${API}/api/bets/me`, { headers });
//       } catch (err) {
//         if (err?.response?.status === 404) {
//           res = await axios.get(`${API}/api/bets/shared`, { headers });
//         } else {
//           throw err;
//         }
//       }

//       const data = res?.data || {};
//       if (mounted.current) {
//         setTotalPwen(Number(data.totalPwen || 0));
//         setItems(flattenIfNeeded(data));
//       }
//     } catch (e) {
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
//       const inp = window.prompt("Antre kantite lajan/pwen pou reklame:", "0");
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
//       <h2>🧾 Fich — Mes paris</h2>

//       <div style={{ margin: "8px 0 16px", display: "flex", gap: 12 }}>
//         <button onClick={() => load()} disabled={loading}>
//           {loading ? "Loading..." : "Refresh"}
//         </button>
//         <div style={{ background: "#1f2937", color: "#d1d5db", padding: "6px 10px", borderRadius: 8 }}>
//           Total pwen parye: <strong style={{ color: "#fff" }}>{totalPwen}</strong>
//         </div>
//       </div>

//       {loading ? (
//         <p>Loading...</p>
//       ) : items.length === 0 ? (
//         <p>No bets yet.</p>
//       ) : (
//         <div style={{ display: "grid", gap: 12 }}>
//           {items.map((b) => {
//             const key = claimKey(b);
//             const won = (b.status || "").toLowerCase() === "won";

//             return (
//               <div key={`${key}-${b.createdAt}`} style={{
//                 background: "#0f172a",
//                 color: "#e5e7eb",
//                 borderRadius: 12,
//                 padding: "12px 14px",
//                 border: "1px solid #1f2937",
//               }}>
//                 <strong>#{b.id} • {b.type}</strong>
//                 <div>Numbers: <strong>{b.numbers}</strong></div>
//                 <div>Pwen: <strong>{b.pwen}</strong></div>
//                 <div style={{ opacity: 0.7 }}>{fmt(b.createdAt)}</div>

//                 {won && !claimed[key] && (
//                   <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
//                     <button onClick={() => submitClaim(b, "points")}>➕ Add to Points</button>
//                     <button onClick={() => submitClaim(b, "pix")}>💸 Cashout PIX</button>
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
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ---------------- HELPERS ---------------- */

const badgeColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "won":
      return "#16a34a";
    case "lost":
      return "#dc2626";
    case "paid":
      return "#2563eb";
    case "pending":
      return "#9ca3af";
    default:
      return "#6b7280";
  }
};

const fmt = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function Fich() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalPwen, setTotalPwen] = useState(0);
  const [claimBusy, setClaimBusy] = useState({});
  const [claimed, setClaimed] = useState({});
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  /* ---------------- FLATTEN (SAFE) ---------------- */
  const flattenIfNeeded = (data) => {
    // ✅ If backend already sends unified items, just use it
    if (Array.isArray(data.items)) return data.items;

    const safeArr = (arr) => (Array.isArray(arr) ? arr : []);

  //  const mapBet = (arr, type) =>
  // safeArr(arr).map((b) => ({
  //   id: b.id,
  //   type,
  //   numbers:
  //     type === "maryaj"
  //       ? `${b.part1 ?? ""} ${b.part2 ?? ""}`.trim() || "-"
  //       : b.nimewo ??
  //         b.number ??
  //         b.numbers ??
  //         "-",
  //   pwen: Number(b.pwen || 0),
  //   draw: b.ville ?? b.city ?? b.lokal ?? null,
  //   status: b.status || "pending",
  //   createdAt: b.createdAt,
  // }));

 const mapBet = (arr, type) =>
  safeArr(arr).map((b) => {
    let numbers = "-";

    // ✅ FIX FOR MARYAJ
    if (type === "maryaj" && b.part1 && b.part2) {
      numbers = `${b.part1}${b.part2}`;
    } else {
      numbers =
        b.nimewo ??
        b.maryaj ??
        b.number ??
        b.numbers ??
        "-";
    }

    return {
      id: b.id,
      type,
      numbers,
      pwen: Number(b.pwen || 0),
      draw: b.ville ?? b.city ?? b.lokal ?? null,
      status: b.status || "pending",
      createdAt: b.createdAt,
    };
  });


//new
    const Y = mapBet(data.yonchif, "yonchif");
    const D = mapBet(data.dechif, "dechif");
    const M = mapBet(data.maryaj, "maryaj");
    const T = mapBet(data.twachif, "twachif");
    const K = mapBet(data.katchif, "katchif");

    return [...Y, ...D, ...M, ...T, ...K].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  };

  /* ---------------- LOAD DATA ---------------- */
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

      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get(`${API}/api/bets/me`, { headers });
      const data = res?.data || {};

      if (mounted.current) {
        setTotalPwen(Number(data.totalPwen || 0));
        setItems(flattenIfNeeded(data));
      }
    } catch (err) {
      console.error("Fich load error:", err);
      if (mounted.current) {
        setItems([]);
        setTotalPwen(0);
      }
    } finally {
      if (!silent && mounted.current) setLoading(false);
    }
  };

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };
    const iv = setInterval(tick, 7000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const claimKey = (b) => `${b.type}-${b.id}`;

  /* ---------------- CLAIM ---------------- */
  const submitClaim = async (b, method) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please sign in again.");

    const key = claimKey(b);
    if (claimBusy[key]) return;

    let winAmount = Number(b.winAmount || b.pwen || 0);
    if (!Number.isFinite(winAmount) || winAmount <= 0) {
      const inp = window.prompt("Antre kantite pwen:", "0");
      if (!inp) return;
      winAmount = parseInt(inp, 10);
      if (!Number.isFinite(winAmount) || winAmount <= 0) {
        return alert("Kantite pa valab.");
      }
    }

    let pixKey = null;
    if (method === "pix") {
      pixKey = window.prompt("Antre PIX key ou:", "");
      if (!pixKey) return;
    }

    try {
      setClaimBusy((m) => ({ ...m, [key]: true }));

      await axios.post(
        `${API}/api/claims`,
        {
          betType: b.type,
          betId: b.id,
          winAmount,
          payoutMethod: method,
          pixKey,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setClaimed((m) => ({ ...m, [key]: true }));
      alert("Demann lan voye bay admin lan. Mèsi!");
    } catch (e) {
      alert(e.response?.data?.message || "Claim failed");
    } finally {
      if (mounted.current) {
        setClaimBusy((m) => ({ ...m, [key]: false }));
      }
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div style={{ padding: "16px" }}>
      <h2>🧾 Fich — Mes paris</h2>

      <div style={{ margin: "8px 0 16px", display: "flex", gap: 12 }}>
        <button onClick={() => load()} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>

        <div
          style={{
            background: "#1f2937",
            color: "#d1d5db",
            padding: "6px 10px",
            borderRadius: 8,
          }}
        >
          Total pwen parye:{" "}
          <strong style={{ color: "#fff" }}>{totalPwen}</strong>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No bets yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((b) => {
            const key = claimKey(b);
            const won = (b.status || "").toLowerCase() === "won";

            return (
              <div
                key={key}
                style={{
                  background: "#0f172a",
                  color: "#e5e7eb",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid #1f2937",
                }}
              >
                <strong>
                  #{b.id} • {b.type}
                </strong>
                <div>Numbers: <strong>{b.numbers}</strong></div>
                <div>Pwen: <strong>{b.pwen}</strong></div>
                <div style={{ opacity: 0.7 }}>{fmt(b.createdAt)}</div>

                {won && !claimed[key] && (
                  <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                    <button onClick={() => submitClaim(b, "points")}>
                      ➕ Add to Points
                    </button>
                    <button onClick={() => submitClaim(b, "pix")}>
                      💸 Cashout PIX
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
