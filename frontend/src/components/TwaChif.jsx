
import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

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
const TwaChif = () => {
  const [nums, setNums] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("New York");
  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");
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

    // clock
      const updateTimes = () => {
      const now = new Date();
      const options = {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };

      const eastern = new Intl.DateTimeFormat("en-US", options).format(now);

      setNyTime(eastern);
      setFlTime(eastern);   // Eastern Florida
      setGaTime(eastern);   // Georgia
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
    const numTrim = nums.trim();
    const locNorm = location.trim().toLowerCase();

    if (!numTrim || !betAmount || numTrim.length !== 3) {
      return alert("Tanpri antre 3 chif ak kantite pwen.");
    }

    // 🚫 Disabled number check
    if (disabledNumbers.includes(numTrim)) {
      return alert(`Nimewo ${numTrim} dezaktive. Ou pa ka parye sou li.`);
    }

    // 🚫 Disabled location check
    if (disabledLocations.includes(locNorm)) {
      return alert(`Lokasyon ${location} dezaktive. Ou pa ka parye la a.`);
    }

    // points check
    const willBeTotal = pendingTotal + betAmount;
    if (willBeTotal > userPoints) {
      const confirmBuy = window.confirm("Ou pa gen ase pwen. Ou vle achte plis?");
      if (confirmBuy) window.location.href = "/buy-credits";
      return;
    }

    addBet({ number: numTrim, amount: betAmount, type: "Twa Chif", location });
    setNums("");
    setAmount("");
  };

  /* ---------------- Edit Bet ---------------- */
  const handleEdit = (id) => {
    const b = bets.find((x) => x.id === id);
    if (b && b.type === "Twa Chif") {
      setNums(b.number);
      setAmount(b.amount);
      setLocation(b.location || "New York");
      deleteBet(id);
    }
  };

  /* ---------------- Submit Bets ---------------- */
  const handleSubmit = async () => {
    const { id: userId, points: currentPoints } = getUserAndPoints();
    const twaChifBets = bets.filter((b) => b.type === "Twa Chif");
    const totalTwaChif = twaChifBets.reduce(
      (sum, b) => sum + parseInt(b.amount),
      0
    );
    const remaining = currentPoints - totalTwaChif;

    if (twaChifBets.length === 0) {
      alert("Ou pa mete okenn pari pou 'Twa Chif'.");
      return;
    }
    if (remaining < 0) {
      alert("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of twaChifBets) {
        const betNum = bet.number.trim();
        const locNorm = bet.location.trim().toLowerCase();

        // skip disabled number
        if (disabledNumbers.includes(betNum)) {
          alert(`Nimewo ${betNum} dezaktive. Pari sa a sote.`);
          continue;
        }
        // skip disabled location
        if (disabledLocations.includes(locNorm)) {
          alert(`Lokasyon ${bet.location} dezaktive. Pari sa a sote.`);
          continue;
        }

        await axios.post(
          `${API}/api/twachif`,
          {
            number: betNum,
            pwen: parseInt(bet.amount),
            location: bet.location,
            userId,
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
      }

      // update points locally
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = { ...userObj, points: remaining };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("userPoints", String(remaining));
      window.dispatchEvent(new Event("pointsUpdated"));

      alert("Pari 'Twa Chif' soumèt ak siksè!");
    } catch (error) {
      console.error("Submit error:", error.response?.data || error.message);
      alert("Erè soumèt pari: " + (error.response?.data?.message || error.message));
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.entryRow}>
        <input
          type="text"
          placeholder="XXX"
          maxLength={3}
          value={nums}
          onChange={(e) => setNums(e.target.value.replace(/\D/g, ""))}
        />
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
          <option value="Georgia">Georgia</option>
        </select>
        <button className={styles.plusBtn} onClick={handleAdd}>+</button>
      </div>

      <div className={styles.timeRow}>
        <p><strong>🕐 New York:</strong> {nyTime}</p>
        <p><strong>🕐 Florida:</strong> {flTime}</p>
        <p><strong>🕐 Georgia:</strong> {gaTime}</p>
      </div>

      <ul className={styles.betsList}>
        {bets
          .filter((b) => b.type === "Twa Chif")
          .map((b) => (
            <li key={b.id}>
              <span className={styles.num}>{b.number}</span>
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
        <span>Total: {total} p</span>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={bets.filter((b) => b.type === "Twa Chif").length === 0}
        >
          Soumèt Pari
        </button>
      </div>
    </div>
  );
};

export default TwaChif;
