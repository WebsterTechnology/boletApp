
// // import React, { useState, useEffect } from "react";
// // import styles from "../style/BetForm.module.css";
// // import { FaEdit, FaTrash } from "react-icons/fa";
// // import { useBet } from "../context/BetContext.jsx";
// // import { useNavigate } from "react-router-dom";
// // import axios from "axios";

// // const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

// // /* ---------------- Helper functions ---------------- */
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
// // const TwaChif = () => {
// //   const [nums, setNums] = useState("");
// //   const [amount, setAmount] = useState("");
// //   const [location, setLocation] = useState("New York");
// //   const [nyTime, setNyTime] = useState("");
// //   const [flTime, setFlTime] = useState("");
// //   const [gaTime, setGaTime] = useState("");
// //   const [disabledNumbers, setDisabledNumbers] = useState([]);
// //   const [disabledLocations, setDisabledLocations] = useState([]);

// //   const { bets, addBet, deleteBet, total } = useBet();
// //   const navigate = useNavigate();

// //   /* ---------------- Effects ---------------- */
// //   useEffect(() => {
// //     syncUserFromServer();

// //     // fetch disabled numbers & locations
// //     Promise.all([
// //       axios.get(`${API}/api/admin/public-disabled-numbers`),
// //       axios.get(`${API}/api/admin/public-disabled-locations`),
// //     ])
// //       .then(([numsRes, locRes]) => {
// //         const nums = (numsRes.data || []).map((n) => String(n).trim());
// //         const locs = (locRes.data || []).map((l) =>
// //           String(l).trim().toLowerCase()
// //         );
// //         setDisabledNumbers(nums);
// //         setDisabledLocations(locs);
// //       })
// //       .catch((err) => console.error("Failed to load disabled data:", err));

// //     // clock
// //       const updateTimes = () => {
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

// //     if (!numTrim || !betAmount || numTrim.length !== 3) {
// //       return alert("Tanpri antre 3 chif ak kantite pwen.");
// //     }

// //     // 🚫 Disabled number check
// //     if (disabledNumbers.includes(numTrim)) {
// //       return alert(`Nimewo ${numTrim} dezaktive. Ou pa ka parye sou li.`);
// //     }

// //     // 🚫 Disabled location check
// //     if (disabledLocations.includes(locNorm)) {
// //       return alert(`Lokasyon ${location} dezaktive. Ou pa ka parye la a.`);
// //     }

// //     // points check
// //     const willBeTotal = pendingTotal + betAmount;
// //     if (willBeTotal > userPoints) {
// //       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
// //       if (confirmBuy) window.location.href = "/buy-credits";
// //       return;
// //     }

// //     addBet({ number: numTrim, amount: betAmount, type: "Twa Chif", location });
// //     setNums("");
// //     setAmount("");
// //   };

// //   /* ---------------- Edit Bet ---------------- */
// //   const handleEdit = (id) => {
// //     const b = bets.find((x) => x.id === id);
// //     if (b && b.type === "Twa Chif") {
// //       setNums(b.number);
// //       setAmount(b.amount);
// //       setLocation(b.location || "New York");
// //       deleteBet(id);
// //     }
// //   };

// //   /* ---------------- Submit Bets ---------------- */
// //   const handleSubmit = async () => {
// //     const { id: userId, points: currentPoints } = getUserAndPoints();
// //     const twaChifBets = bets.filter((b) => b.type === "Twa Chif");
// //     const totalTwaChif = twaChifBets.reduce(
// //       (sum, b) => sum + parseInt(b.amount),
// //       0
// //     );
// //     const remaining = currentPoints - totalTwaChif;

// //     if (twaChifBets.length === 0) {
// //       alert("Ou pa mete okenn pari pou 'Twa Chif'.");
// //       return;
// //     }
// //     if (remaining < 0) {
// //       alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
// //       navigate("/buy-credits");
// //       return;
// //     }

// //     try {
// //       for (const bet of twaChifBets) {
// //         const betNum = bet.number.trim();
// //         const locNorm = bet.location.trim().toLowerCase();

// //         // skip disabled number
// //         if (disabledNumbers.includes(betNum)) {
// //           alert(`Nimewo ${betNum} dezaktive. Pari sa a sote.`);
// //           continue;
// //         }
// //         // skip disabled location
// //         if (disabledLocations.includes(locNorm)) {
// //           alert(`Lokasyon ${bet.location} dezaktive. Pari sa a sote.`);
// //           continue;
// //         }

// //         await axios.post(
// //           `${API}/api/twachif`,
// //           {
// //             number: betNum,
// //             pwen: parseInt(bet.amount),
// //             location: bet.location,
// //             userId,
// //           },
// //           { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
// //         );
// //       }

// //       // update points locally
// //       const userObj = JSON.parse(localStorage.getItem("user") || "{}");
// //       const updatedUser = { ...userObj, points: remaining };
// //       localStorage.setItem("user", JSON.stringify(updatedUser));
// //       localStorage.setItem("userPoints", String(remaining));
// //       window.dispatchEvent(new Event("pointsUpdated"));

// //       alert("Pari 'Twa Chif' soumèt ak siksè!");
// //     } catch (error) {
// //       console.error("Submit error:", error.response?.data || error.message);
// //       alert("Erè soumèt pari: " + (error.response?.data?.message || error.message));
// //     }
// //   };

// //   /* ---------------- Render ---------------- */
// //   return (
// //     <div className={styles.container}>
// //       <div className={styles.entryRow}>
// //         <input
// //           type="text"
// //           placeholder="XXX"
// //           maxLength={3}
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
// //         <select value={location} onChange={(e) => setLocation(e.target.value)}>
// //           <option value="New York">New York</option>
// //           <option value="Florida">Florida</option>
// //           <option value="Georgia">Georgia</option>
// //         </select>
// //         <button className={styles.plusBtn} onClick={handleAdd}>+</button>
// //       </div>

// //       <div className={styles.timeRow}>
// //         <p><strong>🕐 New York:</strong> {nyTime}</p>
// //         <p><strong>🕐 Florida:</strong> {flTime}</p>
// //         <p><strong>🕐 Georgia:</strong> {gaTime}</p>
// //       </div>

// //       <ul className={styles.betsList}>
// //         {bets
// //           .filter((b) => b.type === "Twa Chif")
// //           .map((b) => (
// //             <li key={b.id}>
// //               <span className={styles.num}>{b.number}</span>
// //               <span className={styles.amt}>{b.amount} p</span>
// //               <span className={styles.location}>{b.location}</span>
// //               <div className={styles.actions}>
// //                 <button onClick={() => handleEdit(b.id)}><FaEdit /></button>
// //                 <button onClick={() => deleteBet(b.id)}><FaTrash /></button>
// //               </div>
// //             </li>
// //           ))}
// //       </ul>

// //       <div className={styles.footer}>
// //         <span>Total: {total} p</span>
// //         <button
// //           className={styles.submitBtn}
// //           onClick={handleSubmit}
// //           disabled={bets.filter((b) => b.type === "Twa Chif").length === 0}
// //         >
// //           Soumèt Pari
// //         </button>
// //       </div>
// //     </div>
// //   );
// // };

// // export default TwaChif;
// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import BetSlip from "../components/BetSlip";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

// async function syncUserFromServer() {
//   const token = localStorage.getItem("token");
//   if (!token) return null;

//   const res = await fetch(`${API}/api/users/me`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });

//   if (!res.ok) return null;

//   const user = await res.json();

//   localStorage.setItem("user", JSON.stringify(user));
//   localStorage.setItem("userId", String(user.id));
//   localStorage.setItem("userPoints", String(user.points || 0));

//   return user;
// }

// function getUserAndPoints() {
//   try {
//     const u = JSON.parse(localStorage.getItem("user") || "{}");

//     return {
//       id: u.id ?? localStorage.getItem("userId"),
//       points: Number(u.points ?? localStorage.getItem("userPoints") ?? 0),
//     };
//   } catch {
//     return {
//       id: localStorage.getItem("userId"),
//       points: Number(localStorage.getItem("userPoints") || 0),
//     };
//   }
// }

// const LOCATIONS = ["New York", "Florida", "Georgia"];

// const TwaChif = () => {
//   const [nums, setNums] = useState("");
//   const [amount, setAmount] = useState("");

//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");

//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);

//   const [showLocationModal, setShowLocationModal] = useState(false);
//   const [selectedLocations, setSelectedLocations] = useState([]);

//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();

//   useEffect(() => {
//     syncUserFromServer();

//     Promise.all([
//       axios.get(`${API}/api/admin/public-disabled-numbers`),
//       axios.get(`${API}/api/admin/public-disabled-locations`),
//     ])
//       .then(([numsRes, locRes]) => {
//         const nums = (numsRes.data || []).map((n) => String(n).trim());
//         const locs = (locRes.data || []).map((l) =>
//           String(l).trim().toLowerCase()
//         );

//         setDisabledNumbers(nums);
//         setDisabledLocations(locs);
//       })
//       .catch((err) => console.error("Failed to load disabled data:", err));

//     const updateTimes = () => {
//       const now = new Date();

//       const options = {
//         timeZone: "America/New_York",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//         hour12: false,
//       };

//       const eastern = new Intl.DateTimeFormat("en-US", options).format(now);

//       setNyTime(eastern);
//       setFlTime(eastern);
//       setGaTime(eastern);
//     };

//     updateTimes();

//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   const twaChifBets = bets.filter((b) => b.type === "Twa Chif");

//   const baseTotal = twaChifBets.reduce(
//     (sum, b) => sum + Number(b.amount || 0),
//     0
//   );

//   const finalTotal = baseTotal * selectedLocations.length;

//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);
//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;
//     const numTrim = nums.trim();

//     if (!numTrim || !betAmount || numTrim.length !== 3) {
//       return alert("Tanpri antre 3 chif ak kantite pwen.");
//     }

//     if (disabledNumbers.includes(numTrim)) {
//       return alert(`Nimewo ${numTrim} dezaktive. Ou pa ka parye sou li.`);
//     }

//     if (pendingTotal + betAmount > userPoints) {
//       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     addBet({
//       number: numTrim,
//       amount: betAmount,
//       type: "Twa Chif",
//     });

//     setNums("");
//     setAmount("");
//   };

//   const handleEdit = (id) => {
//     const b = bets.find((x) => x.id === id);

//     if (b && b.type === "Twa Chif") {
//       setNums(b.number);
//       setAmount(b.amount);
//       deleteBet(id);
//     }
//   };

//   const handleSubmit = () => {
//     if (twaChifBets.length === 0) {
//       return alert("Ou pa mete okenn pari pou 'Twa Chif'.");
//     }

//     setSelectedLocations([]);
//     setShowLocationModal(true);
//   };

//   const toggleLocation = (loc) => {
//     setSelectedLocations((prev) => {
//       if (prev.includes(loc)) {
//         return prev.filter((l) => l !== loc);
//       }

//       return [...prev, loc];
//     });
//   };

//   const handlePlayMore = () => {
//     setShowLocationModal(false);
//     setSelectedLocations([]);
//   };

//   const handleFinalizeBet = async () => {
//     const { id: userId, points: currentPoints } = getUserAndPoints();

//     if (selectedLocations.length === 0) {
//       return alert("Tanpri chwazi omwen yon lokasyon.");
//     }

//     if (currentPoints - finalTotal < 0) {
//       alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of twaChifBets) {
//         const betNum = String(bet.number).trim();

//         if (disabledNumbers.includes(betNum)) {
//           alert(`Nimewo ${betNum} dezaktive. Pari sa a sote.`);
//           continue;
//         }

//         for (const loc of selectedLocations) {
//           const locNorm = loc.trim().toLowerCase();

//           if (disabledLocations.includes(locNorm)) {
//             alert(`Lokasyon ${loc} dezaktive. Pari sa a sote.`);
//             continue;
//           }

//           await axios.post(
//             `${API}/api/twachif`,
//             {
//               number: betNum,
//               pwen: parseInt(bet.amount, 10),
//               location: loc,
//               userId,
//             },
//             {
//               headers: {
//                 Authorization: `Bearer ${localStorage.getItem("token")}`,
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

//       twaChifBets.forEach((bet) => {
//         deleteBet(bet.id);
//       });

//       setNums("");
//       setAmount("");
//       setSelectedLocations([]);
//       setShowLocationModal(false);

//       alert("Pari 'Twa Chif' soumèt ak siksè!");
//     } catch (error) {
//       console.error("Submit error:", error.response?.data || error.message);
//       alert("Erè soumèt pari: " + (error.response?.data?.message || error.message));
//     }
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.entryRow}>
//         <input
//           type="text"
//           placeholder="XXX"
//           maxLength={3}
//           value={nums}
//           onChange={(e) => setNums(e.target.value.replace(/\D/g, ""))}
//         />

//         <input
//           type="number"
//           placeholder="Pwen"
//           min="0"
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//         />

//         <button className={styles.plusBtn} onClick={handleAdd}>
//           +
//         </button>
//       </div>

//       <div className={styles.timeRow}>
//         <p>
//           <strong>🕐 New York:</strong> {nyTime}
//         </p>
//         <p>
//           <strong>🕐 Florida:</strong> {flTime}
//         </p>
//         <p>
//           <strong>🕐 Georgia:</strong> {gaTime}
//         </p>
//       </div>

//       <ul className={styles.betsList}>
//         {twaChifBets.map((b) => (
//           <li key={b.id}>
//             <span className={styles.num}>{b.number}</span>
//             <span className={styles.amt}>{b.amount}</span>

//             <div className={styles.actions}>
//               <button onClick={() => handleEdit(b.id)}>
//                 <FaEdit />
//               </button>

//               <button onClick={() => deleteBet(b.id)}>
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
//           disabled={twaChifBets.length === 0}
//         >
//           Soumèt Pari
//         </button>
//       </div>

//       {showLocationModal && (
//         <div
//           style={{
//             position: "fixed",
//             inset: 0,
//             background: "rgba(0,0,0,0.75)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             padding: "16px",
//             zIndex: 9999,
//           }}
//         >
//           <div
//             style={{
//               width: "100%",
//               maxWidth: "420px",
//               background: "#1f1f1f",
//               color: "#fff",
//               borderRadius: "18px",
//               padding: "22px",
//               boxShadow: "0 10px 35px rgba(0,0,0,0.4)",
//             }}
//           >
//             <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
//               Chwazi kote pou jwe
//             </h2>

//             {LOCATIONS.map((loc) => {
//               const disabled = disabledLocations.includes(loc.toLowerCase());

//               return (
//                 <label
//                   key={loc}
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     background: selectedLocations.includes(loc)
//                       ? "#ffc107"
//                       : "#333",
//                     color: selectedLocations.includes(loc) ? "#000" : "#fff",
//                     padding: "14px",
//                     borderRadius: "12px",
//                     marginBottom: "10px",
//                     opacity: disabled ? 0.4 : 1,
//                     cursor: disabled ? "not-allowed" : "pointer",
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
//                       width: "22px",
//                       height: "22px",
//                     }}
//                   />
//                 </label>
//               );
//             })}

//             <div
//               style={{
//                 background: "#2b2b2b",
//                 padding: "14px",
//                 borderRadius: "12px",
//                 marginTop: "16px",
//               }}
//             >
//               <p style={{ margin: "0 0 8px" }}>
//                 Total baz: <strong>{baseTotal} p</strong>
//               </p>

//               <p style={{ margin: "0 0 8px" }}>
//                 Lokasyon chwazi: <strong>{selectedLocations.length}</strong>
//               </p>

//               <p
//                 style={{
//                   margin: "12px 0 0",
//                   paddingTop: "12px",
//                   borderTop: "1px solid #555",
//                   color: "#ffc107",
//                   fontSize: "22px",
//                   fontWeight: "bold",
//                 }}
//               >
//                 Total final: {finalTotal} p
//               </p>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 gap: "10px",
//                 marginTop: "18px",
//               }}
//             >
//               <button
//                 onClick={handlePlayMore}
//                 style={{
//                   flex: 1,
//                   border: "none",
//                   borderRadius: "12px",
//                   padding: "14px",
//                   background: "#555",
//                   color: "#fff",
//                   fontWeight: "bold",
//                   cursor: "pointer",
//                 }}
//               >
//                 Play More
//               </button>

//               <button
//                 onClick={handleFinalizeBet}
//                 style={{
//                   flex: 1,
//                   border: "none",
//                   borderRadius: "12px",
//                   padding: "14px",
//                   background: "#28a745",
//                   color: "#fff",
//                   fontWeight: "bold",
//                   cursor: "pointer",
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

// export default TwaChif;


import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import BetSlip from "../components/BetSlip";
import submitAllBets from "../utils/submitAllBets";
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

const TwaChif = () => {
  const [nums, setNums] = useState("");
  const [amount, setAmount] = useState("");

  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");

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
    syncUserFromServer();

    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ])
      .then(([numsRes, locRes]) => {
        setDisabledNumbers(
          (numsRes.data || []).map((n) =>
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

  const twaChifBets = bets.filter(
    (b) => b.type === "Twa Chif"
  );

 const baseTotal = total;

  const finalTotal =
    baseTotal * selectedLocations.length;

const handleAdd = () => {
const betAmount = parseInt(amount, 10);

const { points: userPoints } = getUserAndPoints();

const pendingTotal = Number(total) || 0;

const numTrim = nums.trim();

if (!numTrim || numTrim.length !== 3) {
return alert("Tanpri antre 3 chif.");
}

if (!betAmount || betAmount <= 0) {
return alert("Tanpri antre kantite pwen.");
}

if (disabledNumbers.includes(numTrim)) {
return alert(`Nimewo ${numTrim} dezaktive.`);
}

if (pendingTotal + betAmount > userPoints) {
const confirmBuy = window.confirm(
"Ou pa gen ase pwen. Ou vle achte plis?"
);

```
if (confirmBuy) {
  window.location.href = "/buy-credits";
}

return;
```

}

addBet({
number: numTrim,
amount: betAmount,
type: "Twa Chif",
});

setNums("");
setAmount("");
};

const handleEdit = (bet) => {
if (bet.type !== "Twa Chif") return;

setNums(bet.number);
setAmount(bet.amount);

deleteBet(bet.id);
};

const handleSubmit = () => {
if (!twaChifBets.length) {
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
  if (selectedLocations.length === 0) {
    return alert("Tanpri chwazi omwen yon lokasyon.");
  }

  try {
    await submitAllBets({
      bets,
      selectedLocations,
      deleteBet,
    });

    setSelectedLocations([]);
    setShowLocationModal(false);

    setNumber("");
    setAmount("");

    alert("Tout pari yo soumèt avèk siksè!");

  } catch (err) {
    alert(err.message);
  }
};
return ( <div className={styles.container}>


  <div className={styles.entryRow}>

    <input
      type="text"
      placeholder="XXX"
      maxLength={3}
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

```
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

export default TwaChif;
