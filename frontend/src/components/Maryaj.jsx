
// import React, { useState, useEffect } from "react";
// import styles from "../style/BetForm.module.css";
// import { FaEdit, FaTrash } from "react-icons/fa";
// import { useBet } from "../context/BetContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// /* 🔒 AJOUT: LIMIT TOTAL MARYAJ */
// //const MAX_MARYAJ_POINTS = 10;

// /* ---------------- Helper functions ---------------- */
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
// const Maryaj = () => {
//   const [part1, setPart1] = useState("");
//   const [part2, setPart2] = useState("");
//   const [amount, setAmount] = useState("");
//   const [location, setLocation] = useState("New York");
//   const [nyTime, setNyTime] = useState("");
//   const [flTime, setFlTime] = useState("");
//   const [gaTime, setGaTime] = useState("");
//   const [disabledNumbers, setDisabledNumbers] = useState([]);
//   const [disabledLocations, setDisabledLocations] = useState([]);

//   const { bets, addBet, deleteBet, total } = useBet();
//   const navigate = useNavigate();
//   const [remaining, setRemaining] = useState(null);
//   /* ---------------- Effects ---------------- */


//   useEffect(() => {
//     if (part1.length === 2 && part2.length === 2) {
//       axios.get(`${API}/api/maryaj/remaining`, {
//         params: { part1, part2, location }
//       })
//         .then(res => {
//           setRemaining(res.data.remaining); // ✅ FIX
//         })
//         .catch(() => {
//           setRemaining(null);
//         });
//     } else {
//       setRemaining(null);
//     }
//   }, [part1, part2, location]);


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
//       setFlTime(eastern);   // Eastern Florida
//       setGaTime(eastern);   // Georgia
//     };
//     updateTimes();
//     const interval = setInterval(updateTimes, 1000);
//     return () => clearInterval(interval);
//   }, []);


 


//   const handleAdd = () => {
//     const betAmount = parseInt(amount, 10);

//     const { points: userPoints } = getUserAndPoints();
//     const pendingTotal = Number(total) || 0;

//     // ✅ Validate inputs
//     if (part1.length !== 2 || part2.length !== 2) {
//       return alert("Tanpri antre 2 chif nan chak bwat.");
//     }

//     if (!betAmount || betAmount <= 0) {
//       return alert("Tanpri antre yon kantite pwen valab.");
//     }

//     // 🔥 PAIR remaining check (FIXED)
//     if (remaining !== null && betAmount > remaining) {
//       return alert(
//         `❌ pou kounya ka jwe sèlman  ${remaining} pwen pou maryaj ${part1}-${part2} .`
//       );
//     }

//     const p1 = part1.trim();
//     const p2 = part2.trim();
//     const locNorm = location.trim().toLowerCase();

//     // ✅ Disabled checks
//     if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) {
//       return alert(`Nimewo ${p1} oswa ${p2} dezaktive.`);
//     }

//     if (disabledLocations.includes(locNorm)) {
//       return alert(`Lokasyon ${location} dezaktive.`);
//     }

//     // ✅ User balance check
//     const willBeTotal = pendingTotal + betAmount;
//     if (willBeTotal > userPoints) {
//       const confirmBuy = window.confirm(
//         "Ou pa gen ase pwen. Ou vle achte plis?"
//       );
//       if (confirmBuy) window.location.href = "/buy-credits";
//       return;
//     }

//     // ✅ Add bet
//     addBet({
//       number: p1 + p2,
//       display: `${p1} ${p2}`,
//       amount: betAmount,
//       type: "Maryaj",
//       location,
//     });

//     // ✅ Reset inputs
//     setPart1("");
//     setPart2("");
//     setAmount("");
//   };

//   /* ---------------- Edit Bet ---------------- */
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

//   /* ---------------- Submit Bets ---------------- */
//   const handleSubmit = async () => {
//     const { id: userId, points: currentPoints } = getUserAndPoints();
//     const maryajBets = bets.filter((b) => b.type === "Maryaj");
//     const totalMaryaj = maryajBets.reduce(
//       (sum, b) => sum + parseInt(b.amount, 10),
//       0
//     );

//     if (maryajBets.length === 0) {
//       alert("Ou pa mete okenn pari pou 'Maryaj'.");
//       return;
//     }

//     /* 🔒 AJOUT: BLOKE SI TOTAL > 10 */
//     // if (totalMaryaj > MAX_MARYAJ_POINTS) {
//     //   alert("❌ Ou pa ka jwe plis pase 10 pwen pou Maryaj.");
//     //   return;
//     // }

//     const remaining = currentPoints - totalMaryaj;
//     if (remaining < 0) {
//       alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
//       navigate("/buy-credits");
//       return;
//     }

//     try {
//       for (const bet of maryajBets) {
//         const p1 = bet.number.slice(0, 2).trim();
//         const p2 = bet.number.slice(2, 4).trim();
//         const locNorm = bet.location.trim().toLowerCase();

//         if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) {
//           alert(`Nimewo ${p1} oswa ${p2} dezaktive. Pari sa a sote.`);
//           continue;
//         }

//         if (disabledLocations.includes(locNorm)) {
//           alert(`Lokasyon ${bet.location} dezaktive. Pari sa a sote.`);
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

//       alert("Pari 'Maryaj' soumèt ak siksè!");
//     } catch (error) {
//       console.error("Submit error:", error.response?.data || error.message);
//       alert(
//         "Erè soumèt pari: " +
//         (error.response?.data?.message || error.message)
//       );
//     }
//   };

//   /* ---------------- UI ---------------- */
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

//         <div >
//           {remaining !== null && (
//             <p style={{ color: remaining <= 5 ? "red" : "white" }}>{part1}-{part2} → {remaining} pwen rete</p>
//           )}
//         </div>

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

const LOCATIONS = ["New York", "Florida", "Georgia"];

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
        u.points ?? localStorage.getItem("userPoints") ?? 0
      ),
    };
  } catch {
    return {
      id: localStorage.getItem("userId"),
      points: Number(localStorage.getItem("userPoints") || 0),
    };
  }
}

const Maryaj = () => {
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [amount, setAmount] = useState("");

  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");

  const [remaining, setRemaining] = useState(null);

  const [disabledNumbers, setDisabledNumbers] = useState([]);
  const [disabledLocations, setDisabledLocations] = useState([]);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([]);

  const { bets, addBet, deleteBet, total } = useBet();

  const navigate = useNavigate();

  useEffect(() => {
    syncUserFromServer();

    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ])
      .then(([numsRes, locRes]) => {
        setDisabledNumbers(
          (numsRes.data || []).map((n) => String(n).trim())
        );

        setDisabledLocations(
          (locRes.data || []).map((l) =>
            String(l).trim().toLowerCase()
          )
        );
      })
      .catch(console.error);

    const updateTimes = () => {
      const now = new Date();

      const eastern = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);

      setNyTime(eastern);
      setFlTime(eastern);
      setGaTime(eastern);
    };

    updateTimes();

    const interval = setInterval(updateTimes, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (part1.length !== 2 || part2.length !== 2) {
      setRemaining(null);
      return;
    }

    axios
      .get(`${API}/api/maryaj/remaining`, {
        params: {
          part1,
          part2,
          location: "New York",
        },
      })
      .then((res) => setRemaining(res.data.remaining))
      .catch(() => setRemaining(null));
  }, [part1, part2]);

  const maryajBets = bets.filter(
    (b) => b.type === "Maryaj"
  );

  const baseTotal = maryajBets.reduce(
    (sum, b) => sum + Number(b.amount || 0),
    0
  );

  const finalTotal =
    baseTotal * selectedLocations.length;


  const handleAdd = () => {
    const betAmount = parseInt(amount, 10);

    const { points: userPoints } = getUserAndPoints();

    const pendingTotal = Number(total) || 0;

    if (part1.length !== 2 || part2.length !== 2) {
      return alert("Tanpri antre 2 chif nan chak bwat.");
    }

    if (!betAmount || betAmount <= 0) {
      return alert("Tanpri antre yon kantite pwen valab.");
    }

    if (remaining !== null && betAmount > remaining) {
      return alert(
        `❌ pou kounya ka jwe sèlman ${remaining} pwen pou maryaj ${part1}-${part2}.`
      );
    }

    const p1 = part1.trim();
    const p2 = part2.trim();

    if (
      disabledNumbers.includes(p1) ||
      disabledNumbers.includes(p2)
    ) {
      return alert(`Nimewo ${p1} oswa ${p2} dezaktive.`);
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
      number: p1 + p2,
      display: `${p1} ${p2}`,
      amount: betAmount,
      type: "Maryaj",
    });

    setPart1("");
    setPart2("");
    setAmount("");
  };

  const handleEdit = (id) => {
    const bet = bets.find((b) => b.id === id);

    if (!bet) return;

    setPart1(bet.number.slice(0, 2));
    setPart2(bet.number.slice(2, 4));
    setAmount(bet.amount);

    deleteBet(id);
  };

  const handleSubmit = () => {
    if (maryajBets.length === 0) {
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
    const { id: userId, points: currentPoints } =
      getUserAndPoints();

    if (selectedLocations.length === 0) {
      return alert("Tanpri chwazi omwen yon lokasyon.");
    }

    if (currentPoints - finalTotal < 0) {
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of maryajBets) {
        const p1 = bet.number.slice(0, 2);
        const p2 = bet.number.slice(2, 4);

        for (const location of selectedLocations) {
          if (
            disabledLocations.includes(
              location.toLowerCase()
            )
          ) {
            continue;
          }

          await axios.post(
            `${API}/api/maryaj`,
            {
              part1: p1,
              part2: p2,
              pwen: parseInt(bet.amount),
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

      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("userPoints", String(updatedUser.points));

      window.dispatchEvent(new Event("pointsUpdated"));

      maryajBets.forEach((bet) => deleteBet(bet.id));

      setPart1("");
      setPart2("");
      setAmount("");
      setRemaining(null);

      setSelectedLocations([]);
      setShowLocationModal(false);

      alert("Pari Maryaj soumèt avèk siksè!");

    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          error.message
      );
    }
  };

  return (
    <div className={styles.container}>

      <div className={styles.entryRow}>

        <div className={styles.doubleInput}>
          <input
            type="text"
            maxLength={2}
            placeholder="XX"
            value={part1}
            onChange={(e) =>
              setPart1(
                e.target.value.replace(/\D/g, "")
              )
            }
          />

          <input
            type="text"
            maxLength={2}
            placeholder="XX"
            value={part2}
            onChange={(e) =>
              setPart2(
                e.target.value.replace(/\D/g, "")
              )
            }
          />
        </div>

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
            {part1}-{part2} → {remaining} pwen rete
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

      <ul className={styles.betsList}>

        {maryajBets.map((b) => (

          <li key={b.id}>

            <span className={styles.num}>
              {b.display}
            </span>

            <span className={styles.amt}>
              {b.amount} p
            </span>

            <div className={styles.actions}>

              <button
                onClick={() =>
                  handleEdit(b.id)
                }
              >
                <FaEdit />
              </button>

              <button
                onClick={() =>
                  deleteBet(b.id)
                }
              >
                <FaTrash />
              </button>

            </div>

          </li>

        ))}

      </ul>

      <div className={styles.footer}>

        <span>
          Total : {baseTotal} p
        </span>

        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
        >
          Soumèt
        </button>

      </div>


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
                    opacity: disabled ? .4 : 1,
                    cursor: disabled
                      ? "not-allowed"
                      : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  <span>{loc}</span>

                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(
                      loc
                    )}
                    disabled={disabled}
                    onChange={() =>
                      toggleLocation(loc)
                    }
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
                Total baz :
                <strong> {baseTotal} p</strong>
              </p>

              <p>
                Lokasyon :
                <strong>
                  {" "}
                  {selectedLocations.length}
                </strong>
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
                Total Final : {finalTotal} p
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

export default Maryaj;

