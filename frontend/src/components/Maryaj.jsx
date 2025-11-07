
// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// /* ----------------------- Helper Functions ----------------------- */
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

// /* ----------------------- Component ----------------------- */
// const Maryaj = () => {
//   const [part1, setPart1] = useState("");
//   const [part2, setPart2] = useState("");
//   const [amount, setAmount] = useState("");
//   const [location, setLocation] = useState("New York");
//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");

//   const [disabledNumbers, setDisabledNumbers] = useState([]); // 🆕 from admin
//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();

//   /* ----------------------- Effects ----------------------- */
//   useEffect(() => {
//     syncUserFromServer();

//     // fetch disabled numbers from backend
//     axios
//       .get(`${API}/api/admin/public-disabled-numbers`)
//       .then((res) => {
//         setDisabledNumbers(res.data.map(String)); // store as strings
//       })
//       .catch((err) => {
//         console.error("Failed to load disabled numbers:", err);
//       });

//     // clock
//     const updateTimes = () => {
//       const now = new Date();
//       const options = {
//         timeZone: "America/New_York",
//         hour: "2-digit",
//         minute: "2-digit",
//         second: "2-digit",
//         hour12: false,
//       };
//       const ny = new Intl.DateTimeFormat("en-US", options).format(now);
//       setNyTime(ny);
//       setFlTime(ny);
//     };
//     updateTimes();
//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   /* ----------------------- Add Bet ----------------------- */
//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);
//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;

//     if (part1.length !== 2 || part2.length !== 2 || !betAmount) {
//       return alert("Tanpri antre 2 chif nan chak bwat ak kantite pwen.");
//     }

//     // 🆕 check if any number is disabled
//     if (
//       disabledNumbers.includes(part1) ||
//       disabledNumbers.includes(part2)
//     ) {
//       return alert(`Nimewo ${part1} oswa ${part2} dezaktive. Ou pa ka parye sou li.`);
//     }

//     // check available points
//     const willBeTotal = pendingTotal + betAmount;
//     if (willBeTotal > userPoints) {
//       const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     const numbers = part1 + part2; // e.g., "1256"
//     const display = `${part1} ${part2}`;

//     addBet({ number: numbers, display, amount: betAmount, type: "Maryaj", location });

//     setPart1("");
//     setPart2("");
//     setAmount("");
//   };

//   /* ----------------------- Edit Bet ----------------------- */
//   const handleEdit = (id) => {
//     const b = bets.find((x) => x.id === id);
//     if (b && b.type === "Maryaj") {
//       setPart1(b.number.slice(0, 2));
//       setPart2(b.number.slice(2));
//       setAmount(b.amount);
//       setLocation(b.location || "New York");
//       deleteBet(id);
//     }
//   };

//   /* ----------------------- Submit Bets ----------------------- */
//   const handleSubmit = async () => {
//     const { id: userId, points: currentPoints } = getUserAndPoints();

//     // Only Maryaj items
//     const maryajBets = bets.filter((b) => b.type === "Maryaj");
//     const totalMaryaj = maryajBets.reduce((sum, b) => sum + parseInt(b.amount, 10), 0);

//     if (maryajBets.length === 0) {
//       alert("Ou pa mete okenn pari pou 'Maryaj'.");
//       return;
//     }

//     const remaining = currentPoints - totalMaryaj;
//     if (remaining < 0) {
//       alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of maryajBets) {
//         const p1 = bet.number.slice(0, 2);
//         const p2 = bet.number.slice(2, 4);

//         // 🆕 skip sending if disabled
//         if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) {
//           alert(`Nimewo ${p1} oswa ${p2} dezaktive. Pari sa a sote.`);
//           continue;
//         }

//         await axios.post(
//           `${API}/api/maryaj`,
//           {
//             part1: p1,
//             part2: p2,
//             pwen: parseInt(bet.amount, 10),
//             location: bet.location,
//             userId,
//           },
//           { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
//         );
//       }

//       // Deduct points locally
//       const userObj = JSON.parse(localStorage.getItem("user") || "{}");
//       const updatedUser = { ...userObj, points: remaining };
//       localStorage.setItem("user", JSON.stringify(updatedUser));
//       localStorage.setItem("userPoints", String(remaining));
//       window.dispatchEvent(new Event("pointsUpdated"));

//       alert("Pari 'Maryaj' soumèt ak siksè!");
//     } catch (error) {
//       console.error("Submit error:", error.response?.data || error.message);
//       alert("Erè soumèt pari: " + (error.response?.data?.message || error.message));
//     }
//   };

//   /* ----------------------- Render ----------------------- */
//   return (
//     <div className={styles.container}>
//       <div className={styles.entryRow}>
//         <div className={styles.doubleInput}>
//           <input
//             type="text"
//             placeholder="XX"
//             maxLength={2}
//             value={part1}
//             onChange={(e) => setPart1(e.target.value.replace(/\D/g, ""))}
//           />
//           <input
//             type="text"
//             placeholder="XX"
//             maxLength={2}
//             value={part2}
//             onChange={(e) => setPart2(e.target.value.replace(/\D/g, ""))}
//           />
//         </div>

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
//         </select>

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
//       </div>

//       <ul className={styles.betsList}>
//         {bets
//           .filter((b) => b.type === "Maryaj")
//           .map((b) => (
//             <li key={b.id}>
//               <span className={styles.num}>{b.display || b.number}</span>
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
//         <button
//           className={styles.submitBtn}
//           onClick={handleSubmit}
//           disabled={bets.filter((b) => b.type === "Maryaj").length === 0}
//         >
//           Soumèt Pari
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Maryaj;
import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ---------------- Helper functions ---------------- */
async function syncUserFromServer() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const res = await fetch(`${API}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
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
      points: Number(u.points ?? localStorage.getItem("userPoints") ?? 0),
    };
  } catch {
    return {
      id: localStorage.getItem("userId"),
      points: Number(localStorage.getItem("userPoints") || 0),
    };
  }
}

/* ---------------- Component ---------------- */
const Maryaj = () => {
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("New York");
  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");

  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);

  const { bets, addBet, deleteBet, total } = useBet();
  const navigate = useNavigate();

  /* ---------------- Effects ---------------- */
  useEffect(() => {
    syncUserFromServer();

    // fetch disabled numbers & locations
    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ])
      .then(([numsRes, locRes]) => {
        const nums = (numsRes.data || []).map((n) => String(n).trim());
        const locs = (locRes.data || []).map((l) =>
          String(l).trim().toLowerCase()
        );
        setDisabledNumbers(nums);
        setDisabledLocations(locs);
      })
      .catch((err) => console.error("Failed to load disabled data:", err));

    // live clock
    const updateTimes = () => {
      const now = new Date();
      const options = {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      const ny = new Intl.DateTimeFormat("en-US", options).format(now);
      setNyTime(ny);
      setFlTime(ny);
    };
    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- Add Bet ---------------- */
  const handleAdd = () => {
    const betAmount = parseInt(amount, 10);
    const { points: userPoints } = getUserAndPoints();
    const pendingTotal = Number(total) || 0;

    if (part1.length !== 2 || part2.length !== 2 || !betAmount) {
      return alert("Tanpri antre 2 chif nan chak bwat ak kantite pwen.");
    }

    const p1 = part1.trim();
    const p2 = part2.trim();
    const locNorm = location.trim().toLowerCase();

    // 🚫 block disabled numbers
    if (
      disabledNumbers.includes(p1) ||
      disabledNumbers.includes(p2)
    ) {
      return alert(`Nimewo ${p1} oswa ${p2} dezaktive. Ou pa ka parye sou li.`);
    }

    // 🚫 block disabled location
    if (disabledLocations.includes(locNorm)) {
      return alert(`Lokasyon ${location} dezaktive. Ou pa ka parye la a.`);
    }

    const willBeTotal = pendingTotal + betAmount;
    if (willBeTotal > userPoints) {
      const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
      if (confirmBuy) window.location.href = "/buy-credits";
      return;
    }

    const numbers = p1 + p2;
    const display = `${p1} ${p2}`;
    addBet({ number: numbers, display, amount: betAmount, type: "Maryaj", location });

    setPart1("");
    setPart2("");
    setAmount("");
  };

  /* ---------------- Edit Bet ---------------- */
  const handleEdit = (id) => {
    const b = bets.find((x) => x.id === id);
    if (b && b.type === "Maryaj") {
      setPart1(b.number.slice(0, 2));
      setPart2(b.number.slice(2));
      setAmount(b.amount);
      setLocation(b.location || "New York");
      deleteBet(id);
    }
  };

  /* ---------------- Submit Bets ---------------- */
  const handleSubmit = async () => {
    const { id: userId, points: currentPoints } = getUserAndPoints();
    const maryajBets = bets.filter((b) => b.type === "Maryaj");
    const totalMaryaj = maryajBets.reduce(
      (sum, b) => sum + parseInt(b.amount, 10),
      0
    );

    if (maryajBets.length === 0) {
      alert("Ou pa mete okenn pari pou 'Maryaj'.");
      return;
    }

    const remaining = currentPoints - totalMaryaj;
    if (remaining < 0) {
      alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of maryajBets) {
        const p1 = bet.number.slice(0, 2).trim();
        const p2 = bet.number.slice(2, 4).trim();
        const locNorm = bet.location.trim().toLowerCase();

        // skip disabled numbers
        if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) {
          alert(`Nimewo ${p1} oswa ${p2} dezaktive. Pari sa a sote.`);
          continue;
        }

        // skip disabled location
        if (disabledLocations.includes(locNorm)) {
          alert(`Lokasyon ${bet.location} dezaktive. Pari sa a sote.`);
          continue;
        }

        await axios.post(
          `${API}/api/maryaj`,
          {
            part1: p1,
            part2: p2,
            pwen: parseInt(bet.amount, 10),
            location: bet.location,
            userId,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      }

      // update user points
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = { ...userObj, points: remaining };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("userPoints", String(remaining));
      window.dispatchEvent(new Event("pointsUpdated"));

      alert("Pari 'Maryaj' soumèt ak siksè!");
    } catch (error) {
      console.error("Submit error:", error.response?.data || error.message);
      alert("Erè soumèt pari: " + (error.response?.data?.message || error.message));
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.entryRow}>
        <div className={styles.doubleInput}>
          <input
            type="text"
            placeholder="XX"
            maxLength={2}
            value={part1}
            onChange={(e) => setPart1(e.target.value.replace(/\D/g, ""))}
          />
          <input
            type="text"
            placeholder="XX"
            maxLength={2}
            value={part2}
            onChange={(e) => setPart2(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <input
          type="number"
          placeholder="Pwen"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="New York">New York</option>
          <option value="Florida">Florida</option>
        </select>

        <button className={styles.plusBtn} onClick={handleAdd}>+</button>
      </div>

      <div className={styles.timeRow}>
        <p><strong>🕐 New York:</strong> {nyTime}</p>
        <p><strong>🕐 Florida:</strong> {flTime}</p>
      </div>

      <ul className={styles.betsList}>
        {bets
          .filter((b) => b.type === "Maryaj")
          .map((b) => (
            <li key={b.id}>
              <span className={styles.num}>{b.display || b.number}</span>
              <span className={styles.amt}>{b.amount} p</span>
              <span className={styles.location}>{b.location}</span>
              <div className={styles.actions}>
                <button onClick={() => handleEdit(b.id)}><FaEdit /></button>
                <button onClick={() => deleteBet(b.id)}><FaTrash /></button>
              </div>
            </li>
          ))}
      </ul>

      <div className={styles.footer}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={bets.filter((b) => b.type === "Maryaj").length === 0}
        >
          Soumèt Pari
        </button>
      </div>
    </div>
  );
};

export default Maryaj;
