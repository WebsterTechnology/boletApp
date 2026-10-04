import React, { useState, useEffect, useRef } from "react";
import styles from "../style/BetForm.module.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useBet } from "../context/BetContext";
import BetSlip from "../components/BetSlip";
import submitAllBets from "../utils/submitAllBets";
import type { CartBet } from "../types/bet";
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
      ),,
      withdrawablePoints: Number(u.withdrawablePoints ?? 0),
    };

  } catch {
    return {
      id: localStorage.getItem("userId"),
      points: Number(
        localStorage.getItem("userPoints") || 0
      ),,
      withdrawablePoints: 0,
    };
  }
}

const Maryaj = () => {
  const [part1, setPart1] = useState("");
  const part1Ref = useRef<HTMLInputElement>(null);
  const part2Ref = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [part2, setPart2] = useState("");
  const [amount, setAmount] = useState("");

  const [nyTime, setNyTime] = useState("");
  const [flTime, setFlTime] = useState("");
  const [gaTime, setGaTime] = useState("");

  const [remaining, setRemaining] =
    useState(null);

  const [disabledNumbers, setDisabledNumbers] =
    useState<string[]>([]);

  const [disabledLocations, setDisabledLocations] =
    useState<string[]>([]);

  const [showLocationModal, setShowLocationModal] =
    useState(false);

  const [selectedLocations, setSelectedLocations] =
    useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    bets,
    addBet,
    deleteBet,
    total,
  } = useBet();

  useEffect(() => {
    if (part1.length === 2 && part2.length === 2) {
      axios
        .get(`${API}/api/maryaj/remaining`, {
          params: {
            part1,
            part2,
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
  }, [part1, part2]);

  useEffect(() => {
    syncUserFromServer();

    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ]).then(([numRes, locRes]) => {
      setDisabledNumbers(
        (numRes.data || []).map((n: unknown) =>
          String(n).trim()
        )
      );

      setDisabledLocations(
        (locRes.data || []).map((l: unknown) =>
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

  const maryajBets = bets.filter(
    (b) => b.type === "Maryaj"
  );

  const baseTotal = total;

  const finalTotal =
    baseTotal * selectedLocations.length;

  const handleAdd = () => {
    const betAmount = parseInt(amount, 10);

    const { points: userPoints, withdrawablePoints } = getUserAndPoints();
    const availableToBet = userPoints + withdrawablePoints;

    const pendingTotal = Number(total) || 0;

    if (
      part1.length !== 2 ||
      part2.length !== 2
    ) {
      return alert("Antre 2 chif + 2 chif.");
    }

    if (!betAmount || betAmount <= 0) {
      return alert("Antre kantite pwen.");
    }

    if (
      remaining !== null &&
      betAmount > remaining
    ) {
      return alert(
        `Ou ka jwe sèlman ${remaining} pwen.`
      );
    }

    const display = `${part1}-${part2}`;

    if (
      disabledNumbers.includes(part1) ||
      disabledNumbers.includes(part2)
    ) {
      return alert("Youn nan chif yo dezaktive.");
    }

    if (pendingTotal + betAmount > availableToBet) {
      const confirmBuy = window.confirm(
        "Ou pa gen ase pwen. Ou vle achte plis?"
      );

      if (confirmBuy) {
        window.location.href = "/buy-credits";
      }

      return;

    }

    addBet({
      number: display,
      display,
      part1,
      part2,
      amount: betAmount,
      type: "Maryaj",
    });

    setPart1("");
    setPart2("");
    setAmount("");
  part1Ref.current?.focus();
  };

  const handleEdit = (bet: CartBet) => {
    if (bet.type !== "Maryaj") return;

    setPart1(bet.part1 as string);
    setPart2(bet.part2 as string);
    setAmount(String(bet.amount));

    deleteBet(bet.id);
  };

  const handleSubmit = () => {
    if (!maryajBets.length) {
      return alert("Ou pa mete okenn pari.");
    }

    setSelectedLocations([]);
    setShowLocationModal(true);
  };

  const toggleLocation = (loc: string) => {
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


  if (isSubmitting) return;
  setIsSubmitting(true);
    try {
      await submitAllBets({
        bets,
        selectedLocations,
        deleteBet,
      });

      setSelectedLocations([]);
      setShowLocationModal(false);

      setPart1("");
      setPart2("");
      setAmount("");

      alert("Tout pari yo soumèt avèk siksè!");

    } catch (err) {
    setIsSubmitting(false);
      alert((err as Error).message);
    }
  };
  return (<div className={styles.container}>

    <div className={styles.entryRow}>

      <div className={styles.doubleInput}>
        <input
          ref={part1Ref}
          type="text"
          maxLength={2}
          placeholder="XX"
          value={part1}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setPart1(value);
            if (value.length === 2) part2Ref.current?.focus();
          }}
        />

        <input
          ref={part2Ref}
          type="text"
          maxLength={2}
          placeholder="XX"
          value={part2}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setPart2(value);
            if (value.length === 2) amountRef.current?.focus();
          }}
        />
      </div>

      <input
      ref={amountRef}
        type="number"
        min="1"
        step="1"
        placeholder="Pwen"
        value={amount}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "" || /^\d+$/.test(value)) setAmount(value);
        }}
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
              Jwe Ankò
            </button>

            <button
              onClick={handleFinalizeBet}
              disabled={isSubmitting}
              style={{
                flex: 1,
                background: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: 14,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "bold",
                  opacity: isSubmitting ? 0.65 : 1,
              }}
            >
              {isSubmitting ? "Ap finalize..." : "Finalize Paryaj ou"}
            </button>
          </div>
        </div>
      </div>
    )}

  </div>

  );
};

export default Maryaj;

