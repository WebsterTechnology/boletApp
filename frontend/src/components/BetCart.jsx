// src/components/BetCart.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import { useBet } from "../context/BetContext.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

export default function BetCart() {
  const { bets, deleteBet, total } = useBet();
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const g = { "Yon Chif": [], Maryaj: [], "Twa Chif": [] };
    for (const b of bets) (g[b.type] ||= []).push(b);
    return g;
  }, [bets]);

  const submitAll = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Ou bezwen konekte.");

    const { id: userId, points: currentPoints } = getUserAndPoints();
    if (!userId) return alert("Pa jwenn ID itilizatè.");
    if (bets.length === 0 || total <= 0) return alert("Panyen an vid.");
    if (total > currentPoints) {
      if (confirm("Ou pa gen ase pwen. Ou vle achte plis?")) {
        window.location.href = "/buy-credits";
      }
      return;
    }

    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      for (const bet of bets) {
        if (bet.type === "Yon Chif") {
          await axios.post(
            `${API}/api/yonchif`,
            { number: bet.number, pwen: parseInt(bet.amount, 10), location: bet.location, userId },
            { headers }
          );
        } else if (bet.type === "Maryaj") {
          const p1 = bet.number.slice(0, 2);
          const p2 = bet.number.slice(2, 4);
          await axios.post(
            `${API}/api/maryaj`,
            { part1: p1, part2: p2, pwen: parseInt(bet.amount, 10), location: bet.location, userId },
            { headers }
          );
        } else if (bet.type === "Twa Chif") {
          await axios.post(
            `${API}/api/twachif`,
            { number: bet.number, pwen: parseInt(bet.amount, 10), location: bet.location, userId },
            { headers }
          );
        }
      }

      // update local balance & clear cart
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const remaining = (Number(userObj.points) || 0) - Number(total || 0);
      const updatedUser = { ...userObj, points: remaining < 0 ? 0 : remaining };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("userPoints", String(updatedUser.points));
      window.dispatchEvent(new Event("pointsUpdated"));

      for (const b of bets) deleteBet(b.id);

      alert("Tout parye yo soumèt ak siksè!");
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || "Echèk soumèt parye yo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "#0b1020", color: "#e5e7eb", border: "1px solid #1f2937" }}>
      <h3 style={{ marginBottom: 12 }}>🛒 Panyen — Tout parye yo</h3>

      {bets.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Panyen an vid.</p>
      ) : (
        <>
          {["Yon Chif", "Maryaj", "Twa Chif"].map((t) =>
            (grouped[t] && grouped[t].length > 0) ? (
              <div key={t} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{t}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {grouped[t].map((b) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "#0f172a", border: "1px solid #1f2937" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{t === "Maryaj" ? (b.display || b.number) : b.number}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{b.amount} p • {b.location}</div>
                      </div>
                      <button
                        onClick={() => deleteBet(b.id)}
                        style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}
                      >
                        Retire
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ background: "#111827", padding: "6px 10px", borderRadius: 8 }}>
              Total: <b style={{ color: "#fff" }}>{total} p</b>
            </div>
            <button
              onClick={submitAll}
              disabled={submitting}
              style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
            >
              {submitting ? "Ap soumèt…" : "✅ Soumèt tout parye yo"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
