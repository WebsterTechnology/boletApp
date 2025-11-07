// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

import Header from "./components/Header";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import LoginModal from "./components/LoginModal";
import RegisterModal from "./components/RegisterModal";
import PlayPage from "./pages/PlayPage";
import BuyCreditPage from "./pages/BuyCreditPage";
import CreditCardForm from "./pages/CreditCardForm";
import PixPayment from "./pages/PixPayment";
import Fich from "./pages/Fich";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBets from "./pages/AdminBets";
import AdminClaims from "./pages/AdminClaims"; // ✅ NEW (admin claims manager)

// -------- Guard (supports admin-only) --------
function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem("token");
  const isAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("isAdmin") ?? "false") === true;
    } catch {
      return false;
    }
  })();

  if (!token) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Keep axios Authorization header in sync with localStorage token.
  useEffect(() => {
    const applyAuthHeader = () => {
      const t = localStorage.getItem("token");
      if (t) axios.defaults.headers.common.Authorization = `Bearer ${t}`;
      else delete axios.defaults.headers.common.Authorization;
    };
    applyAuthHeader();

    // Update when other tabs log in/out or when app dispatches a custom event.
    const onStorage = (e) => {
      if (e.key === "token") applyAuthHeader();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("authChanged", applyAuthHeader);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChanged", applyAuthHeader);
    };
  }, []);

  return (
    <>
      <Header openLogin={() => setShowLogin(true)} />

      <Routes>
        <Route path="/" element={<Home openLogin={() => setShowLogin(true)} />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <PlayPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buy-credits"
          element={
            <ProtectedRoute>
              <BuyCreditPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/credit-card"
          element={
            <ProtectedRoute>
              <CreditCardForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pix-payment"
          element={
            <ProtectedRoute>
              <PixPayment />
            </ProtectedRoute>
          }
        />

        {/* User bets (Fich) */}
        <Route
          path="/fich"
          element={
            <ProtectedRoute>
              <Fich />
            </ProtectedRoute>
          }
        />

        {/* Admin pages */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bets"
          element={
            <ProtectedRoute requireAdmin>
              <AdminBets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/claims"
          element={
            <ProtectedRoute requireAdmin>
              <AdminClaims />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          openRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}

      <div id="recaptcha-container" />
    </>
  );
}

export default App;
