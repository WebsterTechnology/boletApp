import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const saved = JSON.parse(localStorage.getItem("user") || "{}");
  const [fullName, setFullName] = useState(saved.fullName || "");
  const [email, setEmail] = useState(saved.email || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return alert("Nome e e-mail são obrigatórios.");
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/auth/complete-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Não foi possível completar a conta.");
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("userLoggedIn"));
      navigate("/game", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{maxWidth:520,margin:"40px auto",padding:24}}>
      <h1>Complete seu cadastro</h1>
      <p>Para continuar, precisamos do seu nome e e-mail.</p>
      <form onSubmit={submit}>
        <input value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Nome completo *" style={{width:"100%",padding:12,marginBottom:12}} />
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-mail *" style={{width:"100%",padding:12,marginBottom:12}} />
        <input value={saved.phone || localStorage.getItem("userPhone") || ""} disabled style={{width:"100%",padding:12,marginBottom:12}} />
        <button type="submit" disabled={saving} style={{width:"100%",padding:12}}>
          {saving ? "SALVANDO..." : "SALVAR E CONTINUAR"}
        </button>
      </form>
    </main>
  );
}
