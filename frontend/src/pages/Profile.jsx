// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "boletapp-production.up.railway.app";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // 🔄 Fetch the latest profile from backend
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);

        // keep local cache in sync
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("userPhone", data.phone);
        localStorage.setItem("userPoints", String(data.points ?? 0));
        window.dispatchEvent(new Event("pointsUpdated"));
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userPoints");

    // notify app that logout happened
    window.dispatchEvent(new Event("pointsUpdated"));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("userLoggedOut"));

    navigate("/");
  };

  if (!user) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>👤 Profil Ou</h2>
        <p>Ou pa konekte.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Ale nan paj prensipal
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👤 Profil Ou</h2>
      <p>
        <strong>Nimewo:</strong> {user.phone}
      </p>
      <p>
        <strong>Pwen:</strong>{" "}
        <span style={{ color: "gold", fontWeight: "bold" }}>
          {user.points ?? 0}
        </span>
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={fetchUser}
          disabled={loading}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {loading ? "Ap rafrechi..." : "Rafrechi"}
        </button>

        <button
          onClick={handleLogout}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Dekonekte
        </button>
      </div>
    </div>
  );
}
