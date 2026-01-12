// src/components/DeuxChif.jsx
import React, { useState, useEffect } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext.jsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API =
  import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

/* ---------------- Helpers ---------------- */
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
const DeuxChif = () => {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("New York");
  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");

  const { bets, addBet, deleteBet, total } = useBet();
  const navigate = useNavigate();

  /* ---------------- Clock ---------------- */
  useEffect(() => {
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
    const { points } = getUserAndPoints();

    if (!number || number.length !== 2 || !betAmount) {
      return alert("Tanpri antre **2 chif egzak** ak pwen.");
    }

    if (total + betAmount > points) {
      alert("Ou pa gen ase pwen.");
      navigate("/buy-credits");
      return;
    }

    addBet({
      number,
      amount: betAmount,
      type: "De Chif",
      location,
    });

    setNumber("");
    setAmount("");
  };

  /* ---------------- Edit Bet ---------------- */
  const handleEdit = (id) => {
    const b = bets.find((bet) => bet.id === id);
    if (b && b.type === "De Chif") {
      setNumber(b.number);
      setAmount(b.amount);
      setLocation(b.location);
      deleteBet(id);
    }
  };

  /* ---------------- Submit Bets ---------------- */
  const handleSubmit = async () => {
    const { id: userId, points } = getUserAndPoints();
    const deChifBets = bets.filter((b) => b.type === "De Chif");

    if (deChifBets.length === 0) {
      alert("Pa gen okenn pari De Chif.");
      return;
    }

    const totalBet = deChifBets.reduce(
      (sum, b) => sum + Number(b.amount),
      0
    );

    if (totalBet > points) {
      alert("Pwen pa sifi.");
      navigate("/buy-credits");
      return;
    }

    try {
      for (const bet of deChifBets) {
        await axios.post(
          `${API}/api/deuxchif`,
          {
            number: bet.number,
            pwen: bet.amount,
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

      const remaining = points - totalBet;
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, points: remaining })
      );
      localStorage.setItem("userPoints", remaining);
      window.dispatchEvent(new Event("pointsUpdated"));

      alert("Pari De Chif soumèt avèk siksè!");
    } catch (err) {
      console.error(err);
      alert("Erè pandan soumèt pari.");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.entryRow}>
        <input
          type="text"
          placeholder="XX"
          maxLength={2}
          value={number}
          onChange={(e) =>
            setNumber(e.target.value.replace(/\D/g, ""))
          }
        />

        <input
          type="number"
          placeholder="Pwen"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="New York">New York</option>
          <option value="Florida">Florida</option>
        </select>

        <button className={styles.plusBtn} onClick={handleAdd}>
          +
        </button>
      </div>

      <div className={styles.timeRow}>
        <p>🕐 New York: {nyTime}</p>
        <p>🕐 Florida: {flTime}</p>
      </div>

      <ul className={styles.betsList}>
        {bets
          .filter((b) => b.type === "De Chif")
          .map((b) => (
            <li key={b.id}>
              <span className={styles.num}>{b.number}</span>
              <span className={styles.amt}>{b.amount} p</span>
              <span>{b.location}</span>
              <div className={styles.actions}>
                <button onClick={() => handleEdit(b.id)}>
                  <FaEdit />
                </button>
                <button onClick={() => deleteBet(b.id)}>
                  <FaTrash />
                </button>
              </div>
            </li>
          ))}
      </ul>

      <div className={styles.footer}>
        <span>Total: {total} p</span>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={
            bets.filter((b) => b.type === "De Chif").length === 0
          }
        >
          Soumèt Pari
        </button>
      </div>
    </div>
  );
};

export default DeuxChif;
