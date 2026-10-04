import React, { useState, useEffect } from "react";
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
    syncUserFromServer();

    Promise.all([
      axios.get(`${API}/api/admin/public-disabled-numbers`),
      axios.get(`${API}/api/admin/public-disabled-locations`),
    ])
      .then(([numsRes, locRes]) => {
        setDisabledNumbers(
          (numsRes.data || []).map((n: unknown) =>
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

// The JS original had stray ``` fences around this block, which made it throw a
// TypeError instead of redirecting. Restored to match the other games.
if (confirmBuy) {
  window.location.href = "/buy-credits";
}

return;

}

addBet({
number: numTrim,
amount: betAmount,
type: "Twa Chif",
});

setNums("");
setAmount("");
};

const handleEdit = (bet: CartBet) => {
if (bet.type !== "Twa Chif") return;

setNums(bet.number as string);
setAmount(String(bet.amount));

deleteBet(bet.id);
};

const handleSubmit = () => {
if (!twaChifBets.length) {
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

    setNums("");
    setAmount("");

    alert("Tout pari yo soumèt avèk siksè!");

  } catch (err) {
    setIsSubmitting(false);
    alert((err as Error).message);
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
      min="1"
      step="1"
      placeholder="Pwen"
      value={amount}
      onChange={(e) => {
        const value = e.target.value;
        if (value === "" || /^\d+$/.test(value)) setAmount(value);
      }}
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
            Jwe Anko
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

export default TwaChif;

