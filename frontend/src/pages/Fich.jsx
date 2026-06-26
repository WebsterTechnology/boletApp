

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import axios from "axios";

// const API =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:3001";

// const GAME_LABELS = {
//   yonchif: "Yon Chif",
//   dechif: "Bòlèt",
//   twachif: "Loto 3",
//   katchif: "Loto 4",
//   maryaj: "Maryaj",
// };

// const GAME_ORDER = [
//   "dechif",
//   "twachif",
//   "maryaj",
//   "katchif",
//   "yonchif",
// ];

// const normalizeType = (type = "") =>
//   String(type)
//     .toLowerCase()
//     .replace(/\s+/g, "");

// const fmtDate = (d) => {
//   if (!d) return "-";
//   return new Date(d).toLocaleDateString();
// };

// const fmtTime = (d) => {
//   if (!d) return "-";
//   return new Date(d).toLocaleTimeString([], {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// };

// const getLocation = (bet) =>
//   bet.draw ||
//   bet.location ||
//   bet.lot ||
//   bet.city ||
//   "Unknown";

// const getNumbers = (bet) => {
//   const type = normalizeType(bet.type);

//   if (type === "maryaj") {
//     if (bet.part1 && bet.part2) {
//       return `${bet.part1} x ${bet.part2}`;
//     }

//     if (bet.numbers) {
//       return String(bet.numbers).replace(
//         "-",
//         " x "
//       );
//     }
//   }

//   return bet.numbers || bet.number || "-";
// };

// const getPwen = (bet) =>
//   Number(bet.pwen || bet.amount || 0);

// const groupReceipts = (items) => {
//   const receipts = {};

//   items.forEach((bet) => {
//     const receiptId =
//       bet.receiptId || "old-receipt";

//     if (!receipts[receiptId]) {
//       receipts[receiptId] = {
//         receiptId,
//         location: getLocation(bet),
//         createdAt: bet.createdAt,
//         bets: [],
//       };
//     }

//     receipts[receiptId].bets.push(bet);
//   });

//   return Object.values(receipts).sort(
//     (a, b) =>
//       new Date(b.createdAt) -
//       new Date(a.createdAt)
//   );
// };

// export default function Fich() {
//   const [loading, setLoading] = useState(true);
//   const [items, setItems] = useState([]);
//   const [totalPwen, setTotalPwen] = useState(0);

//   const mounted = useRef(true);

//   useEffect(() => {
//     return () => {
//       mounted.current = false;
//     };
//   }, []);

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

//       const res = await axios.get(
//         `${API}/api/bets/me`,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       const data = res.data || {};

//       if (mounted.current) {
//         setItems(
//           Array.isArray(data.items)
//             ? data.items
//             : []
//         );

//         setTotalPwen(
//           Number(data.totalPwen || 0)
//         );
//       }
//     } catch (err) {
//       console.error(err);

//       if (mounted.current) {
//         setItems([]);
//         setTotalPwen(0);
//       }
//     } finally {
//       if (!silent && mounted.current) {
//         setLoading(false);
//       }
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   useEffect(() => {
//     const tick = () => {
//       if (document.visibilityState === "visible") {
//         load({ silent: true });
//       }
//     };

//     const interval = setInterval(
//       tick,
//       7000
//     );

//     window.addEventListener(
//       "focus",
//       tick
//     );

//     document.addEventListener(
//       "visibilitychange",
//       tick
//     );

//     return () => {
//       clearInterval(interval);
//       window.removeEventListener(
//         "focus",
//         tick
//       );
//       document.removeEventListener(
//         "visibilitychange",
//         tick
//       );
//     };
//   }, []);

//   const receipts = useMemo(
//     () => groupReceipts(items),
//     [items]
//   );
//     return (
//     <div
//       style={{
//         padding: "16px",
//         background: "#000",
//         minHeight: "100vh",
//       }}
//     >
//       <h2
//         style={{
//           color: "#fff",
//           textAlign: "center",
//           marginBottom: 14,
//         }}
//       >
//         Fich Pari Mwen Yo
//       </h2>

//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           gap: 12,
//           marginBottom: 20,
//         }}
//       >
//         <button
//           onClick={() => load()}
//           disabled={loading}
//           style={{
//             background: "#ffc107",
//             border: "none",
//             borderRadius: 10,
//             padding: "10px 16px",
//             fontWeight: "bold",
//             cursor: "pointer",
//           }}
//         >
//           {loading ? "Chajman..." : "Rafrechi"}
//         </button>

//         <div
//           style={{
//             background: "#1f2937",
//             color: "#fff",
//             padding: "10px 16px",
//             borderRadius: 10,
//             fontWeight: "bold",
//           }}
//         >
//           Total: {totalPwen} p
//         </div>
//       </div>

//       {loading ? (
//         <p style={{ color: "#fff", textAlign: "center" }}>
//           Chajman...
//         </p>
//       ) : receipts.length === 0 ? (
//         <p style={{ color: "#fff", textAlign: "center" }}>
//           Pa gen pari ankò.
//         </p>
//       ) : (
//         <div
//           style={{
//             display: "grid",
//             gap: 24,
//             justifyContent: "center",
//           }}
//         >
//           {receipts.map((receipt) => {
//             const grouped = {};

//             receipt.bets.forEach((bet) => {
//               const type = normalizeType(bet.type);

//               if (!grouped[type]) {
//                 grouped[type] = [];
//               }

//               grouped[type].push(bet);
//             });

//             const receiptTotal = receipt.bets.reduce(
//               (sum, bet) => sum + getPwen(bet),
//               0
//             );

//             return (
//               <div
//                 key={receipt.receiptId}
//                 style={{
//                   width: "320px",
//                   background: "#fff",
//                   color: "#000",
//                   padding: "14px 16px",
//                   borderRadius: 6,
//                   fontFamily: "monospace",
//                   boxShadow:
//                     "0 8px 25px rgba(0,0,0,.35)",
//                 }}
//               >
//                 <div
//                   style={{
//                     textAlign: "center",
//                     fontWeight: "bold",
//                     fontSize: 24,
//                   }}
//                 >
//                   {receipt.location}
//                 </div>

//                 <div
//                   style={{
//                     textAlign: "center",
//                     fontSize: 12,
//                     color: "#666",
//                     marginBottom: 8,
//                   }}
//                 >
//                   Receipt #{receipt.receiptId.slice(0,8)}
//                 </div>

//                 <div
//                   style={{
//                     borderTop: "2px dashed #000",
//                     margin: "8px 0",
//                   }}
//                 />
//                                 {GAME_ORDER.map((type) => {
//                   const bets = grouped[type] || [];

//                   if (bets.length === 0) return null;

//                   return (
//                     <div key={type}>
//                       <div
//                         style={{
//                           textAlign: "center",
//                           margin: "8px 0",
//                         }}
//                       >
//                         <span
//                           style={{
//                             background: "#102a63",
//                             color: "#fff",
//                             padding: "3px 12px",
//                             borderRadius: 4,
//                             fontWeight: "bold",
//                           }}
//                         >
//                           {GAME_LABELS[type]}
//                         </span>
//                       </div>

//                       {bets.map((bet) => (
//                         <div
//                           key={bet.id}
//                           style={{
//                             display: "grid",
//                             gridTemplateColumns: "1fr auto auto",
//                             columnGap: 10,
//                             lineHeight: "22px",
//                           }}
//                         >
//                           <span>{getNumbers(bet)}</span>
//                           <span>=</span>
//                           <strong>{getPwen(bet)}</strong>
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 })}

//                 <div
//                   style={{
//                     borderTop: "2px dashed #000",
//                     margin: "10px 0",
//                   }}
//                 />

//                 <div
//                   style={{
//                     textAlign: "center",
//                     fontWeight: "bold",
//                     fontSize: 28,
//                   }}
//                 >
//                   *Total {receiptTotal}*
//                 </div>

//                 <div
//                   style={{
//                     borderTop: "2px dashed #000",
//                     margin: "10px 0",
//                   }}
//                 />

//                 <div
//                   style={{
//                     textAlign: "center",
//                     fontSize: 12,
//                   }}
//                 >
//                   <div>{fmtDate(receipt.createdAt)}</div>
//                   <div>{fmtTime(receipt.createdAt)}</div>
//                   <div>LoteNetsoft</div>
//                 </div>
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

/* ================= STATUS ================= */

const STATUS_LABELS = {
  pending: "ANNATANT",
  won: "GENYEN",
  lost: "PÈDI",
  paid: "PEYE",
  void: "ANILE",
  cancelled: "ANILE",
};

const STATUS_COLORS = {
  pending: "#f59e0b",
  won: "#16a34a",
  lost: "#dc2626",
  paid: "#2563eb",
  void: "#6b7280",
  cancelled: "#6b7280",
};

const normalizeType = (type = "") =>
  String(type)
    .toLowerCase()
    .replace(/\s+/g, "");

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

/* ================= GROUP RECEIPTS ================= */

const groupReceipts = (items) => {
  const receipts = {};

  items.forEach((bet) => {
    const receiptId =
      bet.receiptId || `old-${bet.id}`;

    if (!receipts[receiptId]) {
      receipts[receiptId] = {
        receiptId,
        location: getLocation(bet),
        createdAt: bet.createdAt,
        status: bet.status || "pending",
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

      const res = await axios.get(
        `${API}/api/bets/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = res.data || {};

      if (mounted.current) {
        setItems(
          Array.isArray(data.items)
            ? data.items
            : []
        );

        setTotalPwen(
          Number(data.totalPwen || 0)
        );
      }
    } catch (err) {
      console.error(err);

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
      if (
        document.visibilityState === "visible"
      ) {
        load({ silent: true });
      }
    };

    const interval = setInterval(
      tick,
      7000
    );

    window.addEventListener(
      "focus",
      tick
    );

    document.addEventListener(
      "visibilitychange",
      tick
    );

    return () => {
      clearInterval(interval);

      window.removeEventListener(
        "focus",
        tick
      );

      document.removeEventListener(
        "visibilitychange",
        tick
      );
    };
  }, []);

  const receipts = useMemo(
    () => groupReceipts(items),
    [items]
  );

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
          {loading
            ? "Chajman..."
            : "Rafrechi"}
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
        <p
          style={{
            color: "#fff",
            textAlign: "center",
          }}
        >
          Chajman...
        </p>
      ) : receipts.length === 0 ? (
        <p
          style={{
            color: "#fff",
            textAlign: "center",
          }}
        >
          Pa gen pari ankò.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 24,
            justifyContent: "center",
          }}
        >
          {receipts.map((receipt) => {
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

            return (
              <div
                key={receipt.receiptId}
                style={{
                  width: "320px",
                  background: "#fff",
                  color: "#000",
                  padding: "14px 16px",
                  borderRadius: 6,
                  fontFamily: "monospace",
                  boxShadow:
                    "0 8px 25px rgba(0,0,0,.35)",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: 24,
                  }}
                >
                  {receipt.location}
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "#666",
                    marginBottom: 8,
                  }}
                >
                  Receipt #{receipt.receiptId.slice(0, 8)}
                </div>

                {/* ===== STATUS ===== */}

                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "5px 16px",
                      borderRadius: 20,
                      background:
                        STATUS_COLORS[
                        receipt.status
                        ] || "#6b7280",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 13,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {STATUS_LABELS[
                      receipt.status
                    ] || "ANNATANT"}
                  </span>
                </div>

                <div
                  style={{
                    borderTop:
                      "2px dashed #000",
                    margin: "8px 0",
                  }}
                />

                {GAME_ORDER.map((type) => {
                  const bets =
                    grouped[type] || [];

                  if (bets.length === 0)
                    return null;

                  return (
                    <div key={type}>
                      <div
                        style={{
                          textAlign: "center",
                          margin: "8px 0",
                        }}
                      >
                        <span
                          style={{
                            background:
                              "#102a63",
                            color: "#fff",
                            padding:
                              "3px 12px",
                            borderRadius: 4,
                            fontWeight:
                              "bold",
                          }}
                        >
                          {GAME_LABELS[type]}
                        </span>
                      </div>

                      {bets.map((bet) => (
                        <div
                          key={bet.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "1fr auto auto",
                            columnGap: 10,
                            lineHeight:
                              "22px",
                          }}
                        >
                          <span>
                            {getNumbers(bet)}
                          </span>

                          <span>=</span>

                          <strong>
                            {getPwen(bet)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div
                  style={{
                    borderTop:
                      "2px dashed #000",
                    margin: "10px 0",
                  }}
                />

                <div
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: 28,
                  }}
                >
                  *Total {receiptTotal}*
                </div>

                <div
                  style={{
                    borderTop:
                      "2px dashed #000",
                    margin: "10px 0",
                  }}
                />                <div
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  <div>
                    {fmtDate(receipt.createdAt)}
                  </div>

                  <div>
                    {fmtTime(receipt.createdAt)}
                  </div>

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