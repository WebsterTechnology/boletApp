
// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "../utils/axios.js";

// const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

// /* ---------------- Helpers ---------------- */
// function getUserAndPoints() {
//   try {
//     const u = JSON.parse(localStorage.getItem("user") || "{}");
//     return {
//       points: Number(u.points ?? localStorage.getItem("userPoints") ?? 0),
//     };
//   } catch {
//     return {
//       points: Number(localStorage.getItem("userPoints") || 0),
//     };
//   }
// }

// /* ---------------- Component ---------------- */
// const YonChif = () => {
//   const [number, setNumber] = useState("");
//   const [amount, setAmount] = useState("");
//   const [location, setLocation] = useState("New York");
//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");
//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);
//   const [blocked, setBlocked] = useState(false);

//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();

//   /* ---------------- AUTH CHECK ---------------- */
//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       navigate("/");
//       return;
//     }

//     axios.get(`${API}/api/users/me`)
//       .catch(() => {
//         setBlocked(true);
//         alert("Kont lan pa egziste ankò.");

//         localStorage.removeItem("token");
//         localStorage.removeItem("user");

//         navigate("/");
//       });
//   }, []);

//   /* ---------------- OTHER EFFECTS ---------------- */
//   useEffect(() => {
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
//       setFlTime(eastern);
//       setGaTime(eastern);
//     };

//     updateTimes();
//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   /* ---------------- BLOCK UI ---------------- */
//   if (blocked) {
//     return <div>Kont lan efase</div>;
//   }

//   /* ---------------- Add Bet ---------------- */
//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);
//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;

//     if (!number || !betAmount) {
//       return alert("Tanpri antre nimewo ak pwen.");
//     }

//     if (disabledNumbers.includes(number.trim())) {
//       return alert(`Nimewo ${number} dezaktive.`);
//     }

//     const locNorm = location.trim().toLowerCase();
//     if (disabledLocations.includes(locNorm)) {
//       return alert(`Lokasyon ${location} dezaktive.`);
//     }

//     if (pendingTotal + betAmount > userPoints) {
//       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     addBet({ number, amount: betAmount, type: "Yon Chif", location });
//     setNumber("");
//     setAmount("");
//   };

//   /* ---------------- Edit ---------------- */
//   const handleEdit = (id) => {
//     const b = bets.find((bet) => bet.id === id);
//     if (b && b.type === "Yon Chif") {
//       setNumber(b.number);
//       setAmount(b.amount);
//       setLocation(b.location);
//       deleteBet(id);
//     }
//   };

//   /* ---------------- Submit ---------------- */
//   const handleSubmit = async () => {
//     const { points: currentPoints } = getUserAndPoints();
//     const yonChifBets = bets.filter((b) => b.type === "Yon Chif");

//     if (yonChifBets.length === 0) {
//       return alert("Ou pa mete okenn pari.");
//     }

//     const totalYonChif = yonChifBets.reduce(
//       (sum, b) => sum + parseInt(b.amount),
//       0
//     );

//     if (currentPoints - totalYonChif < 0) {
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of yonChifBets) {
//         const locNorm = bet.location.trim().toLowerCase();

//         if (disabledNumbers.includes(bet.number.trim())) continue;
//         if (disabledLocations.includes(locNorm)) continue;

//         await axios.post(`${API}/api/yonchif`, {
//           number: bet.number,
//           pwen: parseInt(bet.amount),
//           location: bet.location,
//         });
//       }

//       const userObj = JSON.parse(localStorage.getItem("user") || "{}");
//       const updatedUser = {
//         ...userObj,
//         points: currentPoints - totalYonChif,
//       };

//       localStorage.setItem("user", JSON.stringify(updatedUser));
//       localStorage.setItem("userPoints", String(updatedUser.points));
//       window.dispatchEvent(new Event("pointsUpdated"));

//       alert("Pari soumèt avèk siksè!");
//     } catch (error) {
//       if (error.response?.status === 401) {
//         alert("Session fini.");

//         localStorage.removeItem("token");
//         localStorage.removeItem("user");

//         navigate("/");
//         return;
//       }

//       alert("Erè: " + (error.response?.data?.message || error.message));
//     }
//   };

//   /* ---------------- UI ---------------- */
//   return (
//     <div className={styles.container}>
//       <div className={styles.entryRow}>
//         <input
//           type="text"
//           placeholder="X"
//           maxLength={1}
//           value={number}
//           onChange={(e) => setNumber(e.target.value.replace(/\D/, ""))}
//         />
//         <input
//           type="number"
//           placeholder="Pwen"
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//         />
//         <select value={location} onChange={(e) => setLocation(e.target.value)}>
//           <option>New York</option>
//           <option>Florida</option>
//           <option>Georgia</option>
//         </select>
//         <button className={styles.plusBtn} onClick={handleAdd}>+</button>
//       </div>

//       <div className={styles.timeRow}>
//         <p><strong>NY:</strong> {nyTime}</p>
//         <p><strong>FL:</strong> {flTime}</p>
//         <p><strong>GA:</strong> {gaTime}</p>
//       </div>

//       <ul className={styles.betsList}>
//         {bets.filter(b => b.type === "Yon Chif").map((b) => (
//           <li key={b.id}>
//             <span>{b.number}</span>
//             <span>{b.amount} p</span>
//             <span>{b.location}</span>
//             <button onClick={() => handleEdit(b.id)}><FaEdit /></button>
//             <button onClick={() => deleteBet(b.id)}><FaTrash /></button>
//           </li>
//         ))}
//       </ul>

//       <div className={styles.footer}>
//         <span>Total: {total} p</span>
//         <button onClick={handleSubmit}>Soumèt</button>
//       </div>
//     </div>
//   );
// };

// export default YonChif;

// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import BetSlip from "../components/BetSlip";
// import axios from "../utils/axios.js";

// const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

// function getUserAndPoints() {
//   try {
//     const u = JSON.parse(localStorage.getItem("user") || "{}");
//     return {
//       points: Number(u.points ?? localStorage.getItem("userPoints") ?? 0),
//     };
//   } catch {
//     return {
//       points: Number(localStorage.getItem("userPoints") || 0),
//     };
//   }
// }

// const LOCATIONS = ["New York", "Florida", "Georgia"];

// const YonChif = () => {
//   const [number, setNumber] = useState("");
//   const [amount, setAmount] = useState("");

//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");

//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);
//   const [blocked, setBlocked] = useState(false);

//   const [showLocationModal, setShowLocationModal] = useState(false);
//   const [selectedLocations, setSelectedLocations] = useState([]);

//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       navigate("/");
//       return;
//     }

//     axios.get(`${API}/api/users/me`).catch(() => {
//       setBlocked(true);
//       alert("Kont lan pa egziste ankò.");

//       localStorage.removeItem("token");
//       localStorage.removeItem("user");

//       navigate("/");
//     });
//   }, [navigate]);

//   useEffect(() => {
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
//       setFlTime(eastern);
//       setGaTime(eastern);
//     };

//     updateTimes();

//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   if (blocked) {
//     return <div>Kont lan efase</div>;
//   }

//   const yonChifBets = bets.filter((b) => b.type === "Yon Chif");

//   const baseTotal = yonChifBets.reduce(
//     (sum, b) => sum + Number(b.amount || 0),
//     0
//   );

//   const finalTotal = baseTotal * selectedLocations.length;

//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);
//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;

//     if (!number || !betAmount) {
//       return alert("Tanpri antre nimewo ak pwen.");
//     }

//     if (disabledNumbers.includes(number.trim())) {
//       return alert(`Nimewo ${number} dezaktive.`);
//     }

//     if (pendingTotal + betAmount > userPoints) {
//       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     addBet({
//       number,
//       amount: betAmount,
//       type: "Yon Chif",
//     });

//     setNumber("");
//     setAmount("");
//   };

// const handleEdit = (bet) => {
//   if (bet.type !== "Yon Chif") return;

//   setNumber(bet.number);
//   setAmount(bet.amount);

//   deleteBet(bet.id);
// };

//   const handleSubmit = () => {
//     if (yonChifBets.length === 0) {
//       return alert("Ou pa mete okenn pari.");
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
//     const { points: currentPoints } = getUserAndPoints();

//     if (selectedLocations.length === 0) {
//       return alert("Tanpri chwazi omwen yon lokasyon.");
//     }

//     if (currentPoints - finalTotal < 0) {
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of yonChifBets) {
//         if (disabledNumbers.includes(String(bet.number).trim())) continue;

//         for (const loc of selectedLocations) {
//           const locNorm = loc.trim().toLowerCase();

//           if (disabledLocations.includes(locNorm)) continue;

//           await axios.post(`${API}/api/yonchif`, {
//             number: bet.number,
//             pwen: parseInt(bet.amount, 10),
//             location: loc,
//           });
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

//       /* CLEAR ALL BETS */
//       yonChifBets.forEach((bet) => {
//         deleteBet(bet.id);
//       });

//       /* RESET FORM */
//       setNumber("");
//       setAmount("");
//       setSelectedLocations([]);
//       setShowLocationModal(false);

//       alert("Pari soumèt avèk siksè!");
//     } catch (error) {
//       if (error.response?.status === 401) {
//         alert("Session fini.");

//         localStorage.removeItem("token");
//         localStorage.removeItem("user");

//         navigate("/");
//         return;
//       }

//       alert("Erè: " + (error.response?.data?.message || error.message));
//     }
//   };

//   return (
//     <div className={styles.container}>
//       <div className={styles.entryRow}>
//         <input
//           type="text"
//           placeholder="X"
//           maxLength={1}
//           value={number}
//           onChange={(e) => setNumber(e.target.value.replace(/\D/, ""))}
//         />

//         <input
//           type="number"
//           placeholder="Pwen"
//           value={amount}
//           onChange={(e) => setAmount(e.target.value)}
//         />

//         <button className={styles.plusBtn} onClick={handleAdd}>
//           +
//         </button>
//       </div>

//       <div className={styles.timeRow}>
//         <p>
//           <strong>NY:</strong> {nyTime}
//         </p>
//         <p>
//           <strong>FL:</strong> {flTime}
//         </p>
//         <p>
//           <strong>GA:</strong> {gaTime}
//         </p>
//       </div>

   

//       <BetSlip
//     onEdit={handleEdit}
//     onSubmit={handleSubmit}
// />

    

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
//                 Jwe Ankò
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
//                 Finalize Paryaj ou
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default YonChif;


import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import BetSlip from "../components/BetSlip";
import axios from "../utils/axios.js";

const API =
  import.meta.env.VITE_API_URL ||
  "https://boletapp-production.up.railway.app";

const LOCATIONS = [
  "New York",
  "Florida",
  "Georgia",
];

function getUserAndPoints() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      points: Number(
        u.points ??
          localStorage.getItem("userPoints") ??
          0
      ),
    };
  } catch {
    return {
      points: Number(
        localStorage.getItem("userPoints") || 0
      ),
    };
  }
}

const YonChif = () => {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");

  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");

  const [disabledNumbers, setDisabledNumbers] =
    useState([]);

  const [disabledLocations, setDisabledLocations] =
    useState([]);

  const [blocked, setBlocked] =
    useState(false);

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
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
      return;
    }

    axios
      .get(`${API}/api/users/me`)
      .catch(() => {
        setBlocked(true);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");
      });
  }, [navigate]);

  useEffect(() => {
    Promise.all([
      axios.get(
        `${API}/api/admin/public-disabled-numbers`
      ),
      axios.get(
        `${API}/api/admin/public-disabled-locations`
      ),
    ])
      .then(([numRes, locRes]) => {
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

  if (blocked) {
    return <div>Kont lan efase</div>;
  }

  const yonChifBets = bets.filter(
    (b) => b.type === "Yon Chif"
  );

 const baseTotal = total;

  const finalTotal =
    baseTotal * selectedLocations.length;


  const handleAdd = () => {
    const betAmount = parseInt(amount, 10);

    const { points: userPoints } = getUserAndPoints();

    const pendingTotal = Number(total) || 0;

    if (!number || !betAmount) {
      return alert("Tanpri antre nimewo ak pwen.");
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
      type: "Yon Chif",
    });

    setNumber("");
    setAmount("");
  };

  const handleEdit = (bet) => {
    if (bet.type !== "Yon Chif") return;

    setNumber(bet.number);
    setAmount(bet.amount);

    deleteBet(bet.id);
  };

  const handleSubmit = () => {
    if (!yonChifBets.length) {
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
    const { points: currentPoints } =
      getUserAndPoints();

    if (selectedLocations.length === 0) {
      return alert(
        "Tanpri chwazi omwen yon lokasyon."
      );
    }

    if (currentPoints - finalTotal < 0) {
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of yonChifBets) {
        if (
          disabledNumbers.includes(
            String(bet.number).trim()
          )
        )
          continue;

        for (const location of selectedLocations) {
          if (
            disabledLocations.includes(
              location.toLowerCase()
            )
          )
            continue;

          await axios.post(
            `${API}/api/yonchif`,
            {
              number: bet.number,
              pwen: parseInt(
                bet.amount,
                10
              ),
              location,
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

      yonChifBets.forEach((bet) =>
        deleteBet(bet.id)
      );

      setNumber("");
      setAmount("");

      setSelectedLocations([]);
      setShowLocationModal(false);

      alert("Pari Yon Chif soumèt avèk siksè!");

    } catch (error) {
      alert(
        error.response?.data?.message ||
        error.message
      );
    }
  };

  return (
    <div className={styles.container}>

      <div className={styles.entryRow}>

        <input
          type="text"
          placeholder="X"
          maxLength={1}
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

export default YonChif;

