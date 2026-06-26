
// // import React, { useState, useEffect } from "react";
// // import styles from "../style/BetForm.module.css";
// // import { FaEdit, FaTrash } from "react-icons/fa";
// // import { useBet } from "../context/BetContext.jsx";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";

// // const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// // /* 🔒 AJOUT: LIMIT TOTAL KATCHIF */
// // // const MAX_KATCHIF_POINTS = 10;

// // /* ---------------- Helpers ---------------- */
// // async function syncUserFromServer() {
// //   const token = localStorage.getItem("token");
// //   if (!token) return null;
// //   const res = await fetch(`${API}/api/users/me`, {
// //     headers: { Authorization: `Bearer ${token}` },
// //   });
// //   if (!res.ok) return null;
// //   const user = await res.json();
// //   localStorage.setItem("user", JSON.stringify(user));
// //   localStorage.setItem("userId", String(user.id));
// //   localStorage.setItem("userPoints", String(user.points || 0));
// //   return user;
// // }

// // function getUserAndPoints() {
// //   try {
// //     const u = JSON.parse(localStorage.getItem("user") || "{}");
// //     return {
// //       id: u.id ?? localStorage.getItem("userId"),
// //       points: Number(u.points ?? localStorage.getItem("userPoints") ?? 0),
// //     };
// //   } catch {
// //     return {
// //       id: localStorage.getItem("userId"),
// //       points: Number(localStorage.getItem("userPoints") || 0),
// //     };
// //   }
// // }

// // /* ---------------- Component ---------------- */
// // const Katchif = () => {
// //   const [nums, setNums] = useState("");
// //   const [amount, setAmount] = useState("");
// //   const [location, setLocation] = useState("New York");
// //   const [nyTime, setNyTime] = useState("");
// //   const [flTime, setFlTime] = useState("");
// //   const [gaTime, setGaTime] = useState("");
// //   const [disabledNumbers, setDisabledNumbers] = useState([]);
// //   const [disabledLocations, setDisabledLocations] = useState([]);
// //   const [remaining, setRemaining] = useState(null);
// //   const { bets, addBet, deleteBet, total } = useBet();
// //   const navigate = useNavigate();

// //   /* ---------------- Effects ---------------- */

// //   useEffect(() => {
// //     if (nums.length === 4) {
// //       axios.get(`${API}/api/katchif/remaining`, {
// //         params: { number: nums, location }
// //       })
// //         .then(res => {
// //           setRemaining(res.data.remaining);
// //         })
// //         .catch(() => {
// //           setRemaining(null);
// //         });
// //     } else {
// //       setRemaining(null);
// //     }
// //   }, [nums, location]);

// //   useEffect(() => {
// //     syncUserFromServer();

// //     Promise.all([
// //       axios.get(`${API}/api/admin/public-disabled-numbers`),
// //       axios.get(`${API}/api/admin/public-disabled-locations`),
// //     ])
// //       .then(([numRes, locRes]) => {
// //         const nums = (numRes.data || []).map((n) => String(n).trim());
// //         const locs = (locRes.data || []).map((l) =>
// //           String(l).trim().toLowerCase()
// //         );
// //         setDisabledNumbers(nums);
// //         setDisabledLocations(locs);
// //       })
// //       .catch((err) => console.error("Failed to load disabled data:", err));

// //     const updateTimes = () => {
// //       const now = new Date();
// //       const options = {
// //         timeZone: "America/New_York",
// //         hour: "2-digit",
// //         minute: "2-digit",
// //         second: "2-digit",
// //         hour12: false,
// //       };

// //       const eastern = new Intl.DateTimeFormat("en-US", options).format(now);

// //       setNyTime(eastern);
// //       setFlTime(eastern);   // Eastern Florida
// //       setGaTime(eastern);   // Georgia
// //     };
// //     updateTimes();
// //     const interval = setInterval(updateTimes, 1000);
// //     return () => clearInterval(interval);
// //   }, []);

// //   /* ---------------- Add Bet ---------------- */
// //   const handleAdd = () => {
// //     const betAmount = parseInt(amount, 10);
// //     const { points: userPoints } = getUserAndPoints();
// //     const pendingTotal = Number(total) || 0;
// //     const numTrim = nums.trim();
// //     const locNorm = location.trim().toLowerCase();

// //     if (!numTrim || numTrim.length !== 4) {
// //       return alert("Tanpri antre 4 chif.");
// //     }

// //     if (!betAmount || betAmount <= 0) {
// //       return alert("Tanpri antre kantite pwen.");
// //     }

// //     // 🔥 REAL LIMIT (PER NUMBER)
// //     if (remaining !== null && betAmount > remaining) {
// //       return alert(`❌  pou kounya ka jwe sèlman ${remaining} pwen pou ${numTrim}.`);
// //     }

// //     if (disabledNumbers.includes(numTrim)) {
// //       return alert(`Nimewo ${numTrim} dezaktive.`);
// //     }

// //     if (disabledLocations.includes(locNorm)) {
// //       return alert(`Lokasyon ${location} dezaktive.`);
// //     }

// //     const willBeTotal = pendingTotal + betAmount;
// //     if (willBeTotal > userPoints) {
// //       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
// //       if (confirmBuy) window.location.href = "/buy-credits";
// //       return;
// //     }

// //     addBet({
// //       number: numTrim,
// //       amount: betAmount,
// //       type: "Katchif",
// //       location
// //     });

// //     setNums("");
// //     setAmount("");
// //   };

// //   /* ---------------- Edit Bet ---------------- */
// //   const handleEdit = (id) => {
// //     const b = bets.find((x) => x.id === id);
// //     if (b && b.type === "Katchif") {
// //       setNums(b.number);
// //       setAmount(b.amount);
// //       setLocation(b.location || "New York");
// //       deleteBet(id);
// //     }
// //   };

// //   /* ---------------- Submit Bets ---------------- */
// //   const handleSubmit = async () => {
// //     const { id: userId, points: currentPoints } = getUserAndPoints();
// //     const katchifBets = bets.filter((b) => b.type === "Katchif");

// //     if (katchifBets.length === 0) {
// //       alert("Ou pa mete okenn pari pou 'Katchif'.");
// //       return;
// //     }

// //     const totalKatchif = katchifBets.reduce(
// //       (sum, b) => sum + parseInt(b.amount, 10),
// //       0
// //     );

// //     const userRemainingPoints = currentPoints - totalKatchif;

// //     if (userRemainingPoints < 0) {
// //       alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
// //       navigate("/buy-credits");
// //       return;
// //     }

// //     try {
// //       for (const bet of katchifBets) {
// //         const betNum = bet.number.trim();
// //         const locNorm = bet.location.trim().toLowerCase();

// //         if (disabledNumbers.includes(betNum)) {
// //           alert(`Nimewo ${betNum} dezaktive. Pari sa a sote.`);
// //           continue;
// //         }

// //         if (disabledLocations.includes(locNorm)) {
// //           alert(`Lokasyon ${bet.location} dezaktive. Pari sa a sote.`);
// //           continue;
// //         }

// //         await axios.post(
// //           `${API}/api/katchif`,
// //           {
// //             number: betNum,
// //             pwen: parseInt(bet.amount, 10),
// //             location: bet.location,
// //             userId,
// //           },
// //           {
// //             headers: {
// //               Authorization: `Bearer ${localStorage.getItem("token")}`,
// //             },
// //           }
// //         );
// //       }

// //       const userObj = JSON.parse(localStorage.getItem("user") || "{}");

// //       const updatedUser = {
// //         ...userObj,
// //         points: userRemainingPoints // ✅ correct value
// //       };

// //       localStorage.setItem("user", JSON.stringify(updatedUser));
// //       localStorage.setItem("userPoints", String(userRemainingPoints));

// //       window.dispatchEvent(new Event("pointsUpdated"));

// //       alert("Pari 'Katchif' soumèt ak siksè!");
// //     } catch (error) {
// //       console.error("Submit error:", error.response?.data || error.message);
// //       alert(
// //         "Erè soumèt pari: " +
// //         (error.response?.data?.message || error.message)
// //       );
// //     }
// //   };

// //   /* ---------------- UI ---------------- */
// //   return (
// //     <div className={styles.container}>
// //       <div className={styles.entryRow}>
// //         <input
// //           type="text"
// //           placeholder="XXXX"
// //           maxLength={4}
// //           value={nums}
// //           onChange={(e) => setNums(e.target.value.replace(/\D/g, ""))}
// //         />
// //         <input
// //           type="number"
// //           placeholder="Pwen"
// //           min="0"
// //           value={amount}
// //           onChange={(e) => setAmount(e.target.value)}
// //         />

// //         <div style={{ minHeight: "30px" }}>
// //           {remaining !== null && (
// //             <p>{nums} → {remaining} pwen rete</p>
// //           )}
// //         </div>
// //         <select value={location} onChange={(e) => setLocation(e.target.value)}>
// //           <option value="New York">New York</option>
// //           <option value="Florida">Florida</option>
// //           <option value="Georgia">Georgia</option>
// //         </select>
// //         <button className={styles.plusBtn} onClick={handleAdd}>
// //           +
// //         </button>
// //       </div>

// //       <div className={styles.timeRow}>
// //         <p>
// //           <strong>🕐 New York:</strong> {nyTime}
// //         </p>
// //         <p>
// //           <strong>🕐 Florida:</strong> {flTime}
// //         </p>

// //         <p>
// //           <strong>🕐 Georgia:</strong> {gaTime}
// //         </p>
// //       </div>

// //       <ul className={styles.betsList}>
// //         {bets
// //           .filter((b) => b.type === "Katchif")
// //           .map((b) => (
// //             <li key={b.id}>
// //               <span className={styles.num}>{b.number}</span>
// //               <span className={styles.amt}>{b.amount} p</span>
// //               <span className={styles.location}>{b.location}</span>
// //               <div className={styles.actions}>
// //                 <button onClick={() => handleEdit(b.id)}>
// //                   <FaEdit />
// //                 </button>
// //                 <button onClick={() => deleteBet(b.id)}>
// //                   <FaTrash />
// //                 </button>
// //               </div>
// //             </li>
// //           ))}
// //       </ul>

// //       <div className={styles.footer}>
// //         <span>Total: {total} p</span>
// //         <button
// //           className={styles.submitBtn}
// //           onClick={handleSubmit}
// //           disabled={bets.filter((b) => b.type === "Katchif").length === 0}
// //         >
// //           Soumèt Pari
// //         </button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default Katchif;

// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import BetSlip from "../components/BetSlip";

// const API =
//   import.meta.env.VITE_API_URL ||
//   "http://localhost:3001";

// const LOCATIONS = [
//   "New York",
//   "Florida",
//   "Georgia",
// ];

// async function syncUserFromServer() {
//   const token = localStorage.getItem("token");
//   if (!token) return null;

//   const res = await fetch(`${API}/api/users/me`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   });

//   if (!res.ok) return null;

//   const user = await res.json();

//   localStorage.setItem(
//     "user",
//     JSON.stringify(user)
//   );

//   localStorage.setItem(
//     "userId",
//     String(user.id)
//   );

//   localStorage.setItem(
//     "userPoints",
//     String(user.points || 0)
//   );

//   return user;
// }

// function getUserAndPoints() {
//   try {
//     const u = JSON.parse(
//       localStorage.getItem("user") || "{}"
//     );

//     return {
//       id:
//         u.id ??
//         localStorage.getItem("userId"),

//       points: Number(
//         u.points ??
//           localStorage.getItem("userPoints") ??
//           0
//       ),
//     };
//   } catch {
//     return {
//       id: localStorage.getItem("userId"),
//       points: Number(
//         localStorage.getItem("userPoints") || 0
//       ),
//     };
//   }
// }

// const Katchif = () => {
//   const [nums, setNums] = useState("");
//   const [amount, setAmount] = useState("");

//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");

//   const [remaining, setRemaining] =
//     useState(null);

//   const [disabledNumbers, setDisabledNumbers] =
//     useState([]);

//   const [disabledLocations, setDisabledLocations] =
//     useState([]);

//   const [showLocationModal, setShowLocationModal] =
//     useState(false);

//   const [selectedLocations, setSelectedLocations] =
//     useState([]);

//   const {
//     bets,
//     addBet,
//     deleteBet,
//     total,
//   } = useBet();

//   const navigate = useNavigate();

//   useEffect(() => {
//     if (nums.length !== 4) {
//       setRemaining(null);
//       return;
//     }

//     axios
//       .get(`${API}/api/katchif/remaining`, {
//         params: {
//           number: nums,
//           location: "New York",
//         },
//       })
//       .then((res) =>
//         setRemaining(res.data.remaining)
//       )
//       .catch(() => setRemaining(null));
//   }, [nums]);

//   useEffect(() => {
//     syncUserFromServer();

//     Promise.all([
//       axios.get(
//         `${API}/api/admin/public-disabled-numbers`
//       ),
//       axios.get(
//         `${API}/api/admin/public-disabled-locations`
//       ),
//     ])
//       .then(([numRes, locRes]) => {
//         setDisabledNumbers(
//           (numRes.data || []).map((n) =>
//             String(n).trim()
//           )
//         );

//         setDisabledLocations(
//           (locRes.data || []).map((l) =>
//             String(l).trim().toLowerCase()
//           )
//         );
//       });

//     const updateTimes = () => {
//       const eastern =
//         new Intl.DateTimeFormat("en-US", {
//           timeZone: "America/New_York",
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit",
//           hour12: false,
//         }).format(new Date());

//       setNyTime(eastern);
//       setFlTime(eastern);
//       setGaTime(eastern);
//     };

//     updateTimes();

//     const interval = setInterval(updateTimes, 1000);

//     return () => clearInterval(interval);
//   }, []);

//   const katchifBets = bets.filter(
//     (b) => b.type === "Katchif"
//   );

//   const baseTotal = katchifBets.reduce(
//     (sum, b) => sum + Number(b.amount || 0),
//     0
//   );

//   const finalTotal =
//     baseTotal * selectedLocations.length;


//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);

//     const { points: userPoints } = getUserAndPoints();

//     const pendingTotal = Number(total) || 0;

//     const numTrim = nums.trim();

//     if (numTrim.length !== 4) {
//       return alert("Tanpri antre 4 chif.");
//     }

//     if (!betAmount || betAmount <= 0) {
//       return alert("Tanpri antre kantite pwen.");
//     }

//     if (
//       remaining !== null &&
//       betAmount > remaining
//     ) {
//       return alert(
//         `❌ Pou kounya ka jwe sèlman ${remaining} pwen pou ${numTrim}.`
//       );
//     }

//     if (disabledNumbers.includes(numTrim)) {
//       return alert(`Nimewo ${numTrim} dezaktive.`);
//     }

//     if (pendingTotal + betAmount > userPoints) {
//       const confirmBuy = window.confirm(
//         "Ou pa gen ase pwen. Ou vle achte plis?"
//       );

//       if (confirmBuy) {
//         window.location.href = "/buy-credits";
//       }

//       return;
//     }

//     addBet({
//       number: numTrim,
//       amount: betAmount,
//       type: "Katchif",
//     });

//     setNums("");
//     setAmount("");
//   };

//   const handleEdit = (id) => {
//     const bet = bets.find((b) => b.id === id);

//     if (!bet) return;

//     setNums(bet.number);
//     setAmount(bet.amount);

//     deleteBet(id);
//   };

//   const handleSubmit = () => {
//     if (!katchifBets.length) {
//       return alert("Ou pa mete okenn pari.");
//     }

//     setSelectedLocations([]);
//     setShowLocationModal(true);
//   };

//   const toggleLocation = (loc) => {
//     setSelectedLocations((prev) =>
//       prev.includes(loc)
//         ? prev.filter((x) => x !== loc)
//         : [...prev, loc]
//     );
//   };

//   const handlePlayMore = () => {
//     setShowLocationModal(false);
//     setSelectedLocations([]);
//   };

//   const handleFinalizeBet = async () => {
//     const {
//       id: userId,
//       points: currentPoints,
//     } = getUserAndPoints();

//     if (selectedLocations.length === 0) {
//       return alert("Tanpri chwazi omwen yon lokasyon.");
//     }

//     if (currentPoints - finalTotal < 0) {
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of katchifBets) {
//         if (
//           disabledNumbers.includes(
//             bet.number.trim()
//           )
//         )
//           continue;

//         for (const location of selectedLocations) {
//           if (
//             disabledLocations.includes(
//               location.toLowerCase()
//             )
//           )
//             continue;

//           await axios.post(
//             `${API}/api/katchif`,
//             {
//               number: bet.number,
//               pwen: parseInt(bet.amount, 10),
//               location,
//               userId,
//             },
//             {
//               headers: {
//                 Authorization: `Bearer ${localStorage.getItem(
//                   "token"
//                 )}`,
//               },
//             }
//           );
//         }
//       }


//       const userObj = JSON.parse(localStorage.getItem("user") || "{}");

//       const updatedUser = {
//         ...userObj,
//         points: currentPoints - finalTotal,
//       };

//       localStorage.setItem("user", JSON.stringify(updatedUser));
//       localStorage.setItem("userPoints", String(updatedUser.points));

//       window.dispatchEvent(new Event("pointsUpdated"));

//       katchifBets.forEach((bet) => deleteBet(bet.id));

//       setNums("");
//       setAmount("");
//       setRemaining(null);

//       setSelectedLocations([]);
//       setShowLocationModal(false);

//       alert("Pari Katchif soumèt avèk siksè!");

//     } catch (error) {
//       console.error(error);

//       alert(
//         error.response?.data?.message ||
//         error.message
//       );
//     }
//   };

//   return (
//     <div className={styles.container}>

//       <div className={styles.entryRow}>

//         <input
//           type="text"
//           placeholder="XXXX"
//           maxLength={4}
//           value={nums}
//           onChange={(e) =>
//             setNums(e.target.value.replace(/\D/g, ""))
//           }
//         />

//         <input
//           type="number"
//           placeholder="Pwen"
//           value={amount}
//           onChange={(e) =>
//             setAmount(e.target.value)
//           }
//         />

//         <div style={{ minHeight: 30 }}>
//           {remaining !== null && (
//             <p>
//               {nums} → {remaining} pwen rete
//             </p>
//           )}
//         </div>

//         <button
//           className={styles.plusBtn}
//           onClick={handleAdd}
//         >
//           +
//         </button>

//       </div>

//       <div className={styles.timeRow}>
//         <p><strong>NY:</strong> {nyTime}</p>
//         <p><strong>FL:</strong> {flTime}</p>
//         <p><strong>GA:</strong> {gaTime}</p>
//       </div>

//       <ul className={styles.betsList}>

//         {katchifBets.map((b) => (

//           <li key={b.id}>

//             <span className={styles.num}>
//               {b.number}
//             </span>

//             <span className={styles.amt}>
//               {b.amount} p
//             </span>

//             <div className={styles.actions}>

//               <button
//                 onClick={() => handleEdit(b.id)}
//               >
//                 <FaEdit />
//               </button>

//               <button
//                 onClick={() => deleteBet(b.id)}
//               >
//                 <FaTrash />
//               </button>

//             </div>

//           </li>

//         ))}

//       </ul>

//       <div className={styles.footer}>

//         <span>Total: {baseTotal} p</span>

//         <button
//           className={styles.submitBtn}
//           onClick={handleSubmit}
//         >
//           Soumèt Pari
//         </button>

//       </div>


//       {showLocationModal && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,.75)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             padding: 16,
//             zIndex: 9999,
//           }}
//         >
//           <div
//             style={{
//               width: "100%",
//               maxWidth: 420,
//               background: "#1f1f1f",
//               color: "#fff",
//               borderRadius: 18,
//               padding: 22,
//             }}
//           >
//             <h2
//               style={{
//                 textAlign: "center",
//                 marginBottom: 20,
//               }}
//             >
//               Chwazi kote pou jwe
//             </h2>

//             {LOCATIONS.map((loc) => {
//               const disabled = disabledLocations.includes(
//                 loc.toLowerCase()
//               );

//               return (
//                 <label
//                   key={loc}
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     padding: 14,
//                     marginBottom: 10,
//                     borderRadius: 12,
//                     background: selectedLocations.includes(loc)
//                       ? "#ffc107"
//                       : "#333",
//                     color: selectedLocations.includes(loc)
//                       ? "#000"
//                       : "#fff",
//                     opacity: disabled ? 0.4 : 1,
//                     cursor: disabled
//                       ? "not-allowed"
//                       : "pointer",
//                     fontWeight: "bold",
//                   }}
//                 >
//                   <span>{loc}</span>

//                   <input
//                     type="checkbox"
//                     checked={selectedLocations.includes(loc)}
//                     disabled={disabled}
//                     onChange={() => toggleLocation(loc)}
//                     style={{
//                       width: 22,
//                       height: 22,
//                     }}
//                   />
//                 </label>
//               );
//             })}

//             <div
//               style={{
//                 background: "#2b2b2b",
//                 padding: 15,
//                 borderRadius: 12,
//                 marginTop: 15,
//               }}
//             >
//               <p>
//                 Total baz:
//                 <strong> {baseTotal} p</strong>
//               </p>

//               <p>
//                 Lokasyon:
//                 <strong> {selectedLocations.length}</strong>
//               </p>

//               <p
//                 style={{
//                   borderTop: "1px solid #555",
//                   paddingTop: 12,
//                   marginTop: 12,
//                   color: "#ffc107",
//                   fontSize: 22,
//                   fontWeight: "bold",
//                 }}
//               >
//                 Total Final: {finalTotal} p
//               </p>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 gap: 10,
//                 marginTop: 20,
//               }}
//             >
//               <button
//                 onClick={handlePlayMore}
//                 style={{
//                   flex: 1,
//                   background: "#666",
//                   color: "#fff",
//                   border: "none",
//                   borderRadius: 12,
//                   padding: 14,
//                   cursor: "pointer",
//                   fontWeight: "bold",
//                 }}
//               >
//                 Play More
//               </button>

//               <button
//                 onClick={handleFinalizeBet}
//                 style={{
//                   flex: 1,
//                   background: "#28a745",
//                   color: "#fff",
//                   border: "none",
//                   borderRadius: 12,
//                   padding: 14,
//                   cursor: "pointer",
//                   fontWeight: "bold",
//                 }}
//               >
//                 Finalize Bet
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default Katchif;

import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import BetSlip from "../components/BetSlip";
import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "https://boletapp-production.up.railway.app";

const LOCATIONS = [
  "New York",
  "Florida",
  "Georgia",
];

async function syncUserFromServer() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  const res = await fetch(`${API}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return null;

  const user = await res.json();

  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("userId", String(user.id));
  localStorage.setItem("userPoints", String(user.points || 0));

  return user;
}

function getUserAndPoints() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");


    return {
      id: u.id ?? localStorage.getItem("userId"),
      points: Number(
        u.points ??
        localStorage.getItem("userPoints") ??
        0
      ),
    };


  } catch {
    return {
      id: localStorage.getItem("userId"),
      points: Number(
        localStorage.getItem("userPoints") || 0
      ),
    };
  }
}

const Katchif = () => {
  const [nums, setNums] = useState("");
  const [amount, setAmount] = useState("");

  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");

  const [remaining, setRemaining] =
    useState(null);

  const [disabledNumbers, setDisabledNumbers] =
    useState([]);

  const [disabledLocations, setDisabledLocations] =
    useState([]);

  const [showLocationModal, setShowLocationModal] =
    useState(false);

  const [selectedLocations, setSelectedLocations] =
    useState([]);

  const {
    bets,
    addBet,
    deleteBet,
    total,
  } = useBet();

  const navigate = useNavigate();

  useEffect(() => {
    if (nums.length === 4) {
      axios
        .get(`${API}/api/katchif/remaining`, {
          params: {
            number: nums,
            location: "New York",
          },
        })
        .then((res) =>
          setRemaining(res.data.remaining)
        )
        .catch(() => setRemaining(null));
    } else {
      setRemaining(null);
    }
  }, [nums]);

  useEffect(() => {
    syncUserFromServer();


    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ]).then(([numRes, locRes]) => {
      setDisabledNumbers(
        (numRes.data || []).map((n) =>
          String(n).trim()
        )
      );

      setDisabledLocations(
        (locRes.data || []).map((l) =>
          String(l).trim().toLowerCase()
        )
      );
    });

    const updateTimes = () => {
      const eastern =
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date());

      setNyTime(eastern);
      setFlTime(eastern);
      setGaTime(eastern);
    };

    updateTimes();

    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);


  }, []);

  const katchifBets = bets.filter(
    (b) => b.type === "Katchif"
  );

const baseTotal = total;

  const finalTotal =
    baseTotal * selectedLocations.length;
  const handleAdd = () => {
    const betAmount = parseInt(amount, 10);

    const { points: userPoints } = getUserAndPoints();

    const pendingTotal = Number(total) || 0;

    const numTrim = nums.trim();

    if (numTrim.length !== 4) {
      return alert("Tanpri antre 4 chif.");
    }

    if (!betAmount || betAmount <= 0) {
      return alert("Tanpri antre kantite pwen.");
    }

    if (
      remaining !== null &&
      betAmount > remaining
    ) {
      return alert(
        `Ou ka jwe sèlman ${remaining} pwen pou ${numTrim}.`
      );
    }

    if (disabledNumbers.includes(numTrim)) {
      return alert(`Nimewo ${numTrim} dezaktive.`);
    }

    if (pendingTotal + betAmount > userPoints) {
      const confirmBuy = window.confirm(
        "Ou pa gen ase pwen. Ou vle achte plis?"
      );


      if (confirmBuy) {
        window.location.href = "/buy-credits";
      }

      return;


    }

    addBet({
      number: numTrim,
      amount: betAmount,
      type: "Katchif",
    });

    setNums("");
    setAmount("");
  };

  const handleEdit = (bet) => {
    if (bet.type !== "Katchif") return;

    setNums(bet.number);
    setAmount(bet.amount);

    deleteBet(bet.id);
  };

  const handleSubmit = () => {
    if (!katchifBets.length) {
      return alert("Ou pa mete okenn pari.");
    }

    setSelectedLocations([]);
    setShowLocationModal(true);
  };

  const toggleLocation = (loc) => {
    setSelectedLocations((prev) =>
      prev.includes(loc)
        ? prev.filter((x) => x !== loc)
        : [...prev, loc]
    );
  };

  const handlePlayMore = () => {
    setShowLocationModal(false);
    setSelectedLocations([]);
  };

  const handleFinalizeBet = async () => {
    const {
      id: userId,
      points: currentPoints,
    } = getUserAndPoints();

    if (selectedLocations.length === 0) {
      return alert("Tanpri chwazi omwen yon lokasyon.");
    }

    if (currentPoints - finalTotal < 0) {
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of katchifBets) {
        if (disabledNumbers.includes(bet.number.trim()))
          continue;


        for (const location of selectedLocations) {
          if (
            disabledLocations.includes(
              location.toLowerCase()
            )
          )
            continue;

          await axios.post(
            `${API}/api/katchif`,
            {
              number: bet.number,
              pwen: parseInt(bet.amount, 10),
              location,
              userId,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem(
                  "token"
                )}`,
              },
            }
          );
        }
      }


      const userObj = JSON.parse(localStorage.getItem("user") || "{}");

      const updatedUser = {
        ...userObj,
        points: currentPoints - finalTotal,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      localStorage.setItem(
        "userPoints",
        String(updatedUser.points)
      );

      window.dispatchEvent(
        new Event("pointsUpdated")
      );

      katchifBets.forEach((bet) =>
        deleteBet(bet.id)
      );

      setNums("");
      setAmount("");
      setRemaining(null);

      setSelectedLocations([]);
      setShowLocationModal(false);

      alert("Pari Katchif soumèt avèk siksè!");

    } catch (error) {
      alert(
        error.response?.data?.message ||
        error.message
      );
    }


  };

  return (<div className={styles.container}>

    <div className={styles.entryRow}>

      <input
        type="text"
        placeholder="XXXX"
        maxLength={4}
        value={nums}
        onChange={(e) =>
          setNums(e.target.value.replace(/\D/g, ""))
        }
      />

      <input
        type="number"
        placeholder="Pwen"
        value={amount}
        onChange={(e) =>
          setAmount(e.target.value)
        }
      />

      {remaining !== null && (
        <p>
          {nums} → {remaining} pwen rete
        </p>
      )}

      <button
        className={styles.plusBtn}
        onClick={handleAdd}
      >
        +
      </button>

    </div>

    <div className={styles.timeRow}>
      <p><strong>NY:</strong> {nyTime}</p>
      <p><strong>FL:</strong> {flTime}</p>
      <p><strong>GA:</strong> {gaTime}</p>
    </div>

    <BetSlip
      onEdit={handleEdit}
      onSubmit={handleSubmit}
    />

    {showLocationModal && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#1f1f1f",
            color: "#fff",
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h2
            style={{
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            Chwazi kote pou jwe
          </h2>

          {LOCATIONS.map((loc) => {
            const disabled = disabledLocations.includes(
              loc.toLowerCase()
            );

            return (
              <label
                key={loc}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 12,
                  background: selectedLocations.includes(loc)
                    ? "#ffc107"
                    : "#333",
                  color: selectedLocations.includes(loc)
                    ? "#000"
                    : "#fff",
                  opacity: disabled ? 0.4 : 1,
                  cursor: disabled
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "bold",
                }}
              >
                <span>{loc}</span>

                <input
                  type="checkbox"
                  checked={selectedLocations.includes(loc)}
                  disabled={disabled}
                  onChange={() => toggleLocation(loc)}
                  style={{
                    width: 22,
                    height: 22,
                  }}
                />
              </label>
            );
          })}

          <div
            style={{
              background: "#2b2b2b",
              padding: 15,
              borderRadius: 12,
              marginTop: 15,
            }}
          >
            <p>
              Total baz:
              <strong> {baseTotal} p</strong>
            </p>

            <p>
              Lokasyon:
              <strong> {selectedLocations.length}</strong>
            </p>

            <p
              style={{
                borderTop: "1px solid #555",
                paddingTop: 12,
                marginTop: 12,
                color: "#ffc107",
                fontSize: 22,
                fontWeight: "bold",
              }}
            >
              Total Final: {finalTotal} p
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              onClick={handlePlayMore}
              style={{
                flex: 1,
                background: "#666",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 14,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Play More
            </button>

            <button
              onClick={handleFinalizeBet}
              style={{
                flex: 1,
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 14,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Finalize Bet
            </button>
          </div>
        </div>
      </div>
    )}

  </div>


  );
};

export default Katchif;
