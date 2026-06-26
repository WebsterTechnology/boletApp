// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const API =
//   import.meta.env.VITE_API_URL || "https://boletapp-production.up.railway.app";

// /* ---------------- Helpers ---------------- */
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

// /* ---------------- Component ---------------- */
// const DeChif = () => {
//   const [number, setNumber] = useState("");
//   const [amount, setAmount] = useState("");
//   const [location, setLocation] = useState("New York");
//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");
//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);

//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();

//   /* ---------------- Effects ---------------- */
//   useEffect(() => {
//     syncUserFromServer();

//     Promise.all([
//       axios.get(`${API}/api/admin/public-disabled-numbers`),
//       axios.get(`${API}/api/admin/public-disabled-locations`),
//     ])
//       .then(([numRes, locRes]) => {
//         const nums = (numRes.data || []).map((n) => String(n).trim());
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
//       setFlTime(eastern);   // Eastern Florida
//       setGaTime(eastern);   // Georgia
//     };
//     updateTimes();
//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   /* ---------------- Add Bet ---------------- */
//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);
//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;

//     if (!/^\d{2}$/.test(number) || !betAmount) {
//       return alert("Tanpri antre yon nimewo 2 chif (00–99) ak pwen.");
//     }

//     if (disabledNumbers.map((n) => n.trim()).includes(number.trim())) {
//       return alert(`Nimewo ${number} dezaktive.`);
//     }

//     const locNorm = location.trim().toLowerCase();
//     if (disabledLocations.includes(locNorm)) {
//       return alert(`Lokasyon ${location} dezaktive.`);
//     }

//     if (pendingTotal + betAmount > userPoints) {
//       const confirmBuy = window.confirm(
//         "Ou pa gen ase pwen. Ou vle achte plis?"
//       );
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     addBet({ number, amount: betAmount, type: "De Chif", location });
//     setNumber("");
//     setAmount("");
//   };

//   /* ---------------- Edit Bet ---------------- */
//   const handleEdit = (id) => {
//     const b = bets.find((bet) => bet.id === id);
//     if (b && b.type === "De Chif") {
//       setNumber(b.number);
//       setAmount(b.amount);
//       setLocation(b.location);
//       deleteBet(id);
//     }
//   };

//   /* ---------------- Submit Bets ---------------- */
//   const handleSubmit = async () => {
//     const { id: userId, points: currentPoints } = getUserAndPoints();
//     const deChifBets = bets.filter((b) => b.type === "De Chif");
//     const totalDeChif = deChifBets.reduce(
//       (sum, b) => sum + parseInt(b.amount),
//       0
//     );

//     if (deChifBets.length === 0)
//       return alert("Ou pa mete okenn pari pou 'De Chif'.");

//     const remaining = currentPoints - totalDeChif;
//     if (remaining < 0) {
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of deChifBets) {
//         if (disabledNumbers.includes(bet.number.trim())) continue;
//         if (disabledLocations.includes(bet.location.trim().toLowerCase()))
//           continue;

//         await axios.post(
//           `${API}/api/dechif`,
//           {
//             number: bet.number,
//             pwen: parseInt(bet.amount),
//             location: bet.location,
//             userId,
//           },
//           {
//             headers: {
//               Authorization: `Bearer ${localStorage.getItem("token")}`,
//             },
//           }
//         );
//       }

//       const userObj = JSON.parse(localStorage.getItem("user") || "{}");
//       const updatedUser = { ...userObj, points: remaining };
//       localStorage.setItem("user", JSON.stringify(updatedUser));
//       localStorage.setItem("userPoints", String(remaining));
//       window.dispatchEvent(new Event("pointsUpdated"));

//       alert("Pari 'De Chif' soumèt ak siksè!");
//     } catch (error) {
//       alert(error.response?.data?.message || error.message);
//     }
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div className={styles.container}>
//       <div className={styles.entryRow}>
//         <input
//           type="text"
//           placeholder="XX"
//           maxLength={2}
//           value={number}
//           onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
//         />
//         <input
//           type="number"
//           placeholder="Pwen"
//           min="0"
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//         />
//         <select value={location} onChange={(e) => setLocation(e.target.value)}>
//           <option value="New York">New York</option>
//           <option value="Florida">Florida</option>
//           <option value="Georgia">Georgia</option>
//         </select>
//         <button className={styles.plusBtn} onClick={handleAdd}>
//           +
//         </button>
//       </div>

//       <div className={styles.timeRow}>
//         <p><strong>🕐 New York:</strong> {nyTime}</p>
//         <p><strong>🕐 Florida:</strong> {flTime}</p>
//         <p><strong>🕐 Georgia:</strong> {gaTime}</p>
//       </div>

//       <ul className={styles.betsList}>
//         {bets
//           .filter((b) => b.type === "De Chif")
//           .map((b) => (
//             <li key={b.id}>
//               <span className={styles.num}>{b.number}</span>
//               <span className={styles.amt}>{b.amount} p</span>
//               <span className={styles.location}>{b.location}</span>
//               <div className={styles.actions}>
//                 <button onClick={() => handleEdit(b.id)}>
//                   <FaEdit />
//                 </button>
//                 <button onClick={() => deleteBet(b.id)}>
//                   <FaTrash />
//                 </button>
//               </div>
//             </li>
//           ))}
//       </ul>

//       <div className={styles.footer}>
//         <span>Total: {total} p</span>
//         <button
//           className={styles.submitBtn}
//           onClick={handleSubmit}
//           disabled={bets.filter((b) => b.type === "De Chif").length === 0}
//         >
//           Soumèt Pari
//         </button>
//       </div>
//     </div>
//   );
// };

// export default DeChif;

// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import BetSlip from "../components/BetSlip";
// import axios from "axios";

// const API =
//   import.meta.env.VITE_API_URL ||
//   "https://boletapp-production.up.railway.app";

// const LOCATIONS = ["New York", "Florida", "Georgia"];

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

// const DeChif = () => {
//   const [number, setNumber] = useState("");
//   const [amount, setAmount] = useState("");

//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");

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
//       })
//       .catch(console.error);

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

//   const deChifBets = bets.filter(
//     (b) => b.type === "De Chif"
//   );

//   const baseTotal = deChifBets.reduce(
//     (sum, b) => sum + Number(b.amount || 0),
//     0
//   );

//   const finalTotal =
//     baseTotal * selectedLocations.length;

//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);

//     const { points: userPoints } = getUserAndPoints();

//     const pendingTotal = Number(total) || 0;

//     if (!/^\d{2}$/.test(number) || !betAmount) {
//       return alert("Tanpri antre yon nimewo 2 chif ak pwen.");
//     }

//     if (disabledNumbers.includes(number.trim())) {
//       return alert(`Nimewo ${number} dezaktive.`);
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
//       number,
//       amount: betAmount,
//       type: "De Chif",
//     });

//     setNumber("");
//     setAmount("");
//   };

//   const handleEdit = (id) => {
//     const bet = bets.find((b) => b.id === id);

//     if (!bet) return;

//     setNumber(bet.number);
//     setAmount(bet.amount);

//     deleteBet(id);
//   };

//   const handleSubmit = () => {
//     if (!deChifBets.length) {
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
//       for (const bet of deChifBets) {
//         if (disabledNumbers.includes(bet.number.trim()))
//           continue;

//         for (const location of selectedLocations) {
//           if (
//             disabledLocations.includes(
//               location.toLowerCase()
//             )
//           )
//             continue;

//           await axios.post(
//             `${API}/api/dechif`,
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

//       deChifBets.forEach((bet) => deleteBet(bet.id));

//       setNumber("");
//       setAmount("");
//       setSelectedLocations([]);
//       setShowLocationModal(false);

//       alert("Pari 'De Chif' soumèt ak siksè!");

//     } catch (error) {
//       alert(error.response?.data?.message || error.message);
//     }
//   };

//   return (
//     <div className={styles.container}>

//       <div className={styles.entryRow}>

//         <input
//           type="text"
//           placeholder="XX"
//           maxLength={2}
//           value={number}
//           onChange={(e) =>
//             setNumber(e.target.value.replace(/\D/g, ""))
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

//         {deChifBets.map((b) => (

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

// export default DeChif;

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

const DeChif = () => {
const [number, setNumber] = useState("");
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

const deChifBets = bets.filter(
(b) => b.type === "De Chif"
);

const baseTotal = total;

const finalTotal =
baseTotal * selectedLocations.length;
const handleAdd = () => {
const betAmount = parseInt(amount, 10);

const { points: userPoints } = getUserAndPoints();

const pendingTotal = Number(total) || 0;

if (!/^\d{2}$/.test(number)) {
return alert("Tanpri antre yon nimewo 2 chif.");
}

if (!betAmount || betAmount <= 0) {
return alert("Tanpri antre kantite pwen.");
}

if (disabledNumbers.includes(number.trim())) {
return alert(`Nimewo ${number} dezaktive.`);
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
number,
amount: betAmount,
type: "De Chif",
});

setNumber("");
setAmount("");
};

const handleEdit = (bet) => {
if (bet.type !== "De Chif") return;

setNumber(bet.number);
setAmount(bet.amount);

deleteBet(bet.id);
};

const handleSubmit = () => {
if (!deChifBets.length) {
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
      placeholder="XX"
      maxLength={2}
      value={number}
      onChange={(e) =>
        setNumber(
          e.target.value.replace(/\D/g, "")
        )
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

export default DeChif;
