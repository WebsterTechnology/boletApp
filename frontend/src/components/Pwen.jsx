// src/components/Pwen.jsx
import React, { useEffect, useState } from "react";
import { useBet } from "../context/BetContext.jsx";
import styles from "../style/Header.module.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Read points from local cache safely
function readCachedPoints() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(u.points ?? localStorage.getItem("userPoints") ?? 0);
  } catch {
    return Number(localStorage.getItem("userPoints") || 0);
  }
}

export default function Pwen() {
  const { total = 0 } = useBet(); // pending total from cart/context
  const [basePoints, setBasePoints] = useState(readCachedPoints);

  // Fetch fresh points from backend and keep cache in sync
  const fetchBase = async () => {
    const token = localStorage.getItem("token");
    if (!token) return; // not logged in

    try {
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const user = await res.json();
      const pts = Number(user.points || 0);
      setBasePoints(pts);

      // keep local cache aligned for the rest of the app
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userPoints", String(pts));
      localStorage.setItem("userId", String(user.id));
      localStorage.setItem("userPhone", user.phone);
    } catch (e) {
      console.error("Failed to fetch base points:", e);
    }
  };

  useEffect(() => {
    fetchBase();

    const refreshFromCache = () => setBasePoints(readCachedPoints());

    // When login happens or points change elsewhere, refresh
    window.addEventListener("userLoggedIn", fetchBase);
    window.addEventListener("pointsUpdated", fetchBase);

    // Also react to localStorage changes (e.g., another tab)
    window.addEventListener("storage", (e) => {
      if (["user", "userPoints"].includes(e.key)) refreshFromCache();
    });

    return () => {
      window.removeEventListener("userLoggedIn", fetchBase);
      window.removeEventListener("pointsUpdated", fetchBase);
      // storage listener is anonymous above; fine to omit cleanup in most apps
    };
  }, []);

  // Available = server/base points minus current cart total
  const available = Math.max(0, Number(basePoints) - Number(total || 0));

  return <span className={styles.pointsBubble}>{available} P</span>;
}
