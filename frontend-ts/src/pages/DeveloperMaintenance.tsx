import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const sessionKey = "htnova_developer_session";

export default function DeveloperMaintenance() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(() => sessionStorage.getItem(sessionKey) || "");
  const [offline, setOffline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const response = await fetch(`${API}/api/developer/status`, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to check status");
    const data = await response.json();
    setOffline(!!data.maintenance);
  };
  useEffect(() => { void refresh().catch(() => setError("Unable to check website status.")); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/api/developer/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      if (!response.ok) throw new Error("Invalid developer credentials");
      const data = await response.json();
      sessionStorage.setItem(sessionKey, data.token);
      setToken(data.token); setPassword("");
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setBusy(false); }
  };

  const toggle = async () => {
    if (offline === null || !window.confirm(offline ? "Turn HTNovaTech ON?" : "Turn HTNovaTech OFF for customers?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${API}/api/developer/maintenance`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !offline }),
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          sessionStorage.removeItem(sessionKey); setToken("");
        }
        throw new Error("Action rejected. Sign in again if your session expired.");
      }
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Action failed"); }
    finally { setBusy(false); }
  };

  return <main style={{ minHeight: "100vh", background: "#101827", color: "white", padding: "48px 16px", fontFamily: "system-ui" }}>
    <section style={{ maxWidth: 440, margin: "auto", padding: 24, background: "#1d293b", borderRadius: 16 }}>
      <h1>HTNovaTech · Developer</h1>
      <p>Website: <strong style={{ color: offline === null ? "#facc15" : offline ? "#f87171" : "#4ade80" }}>{offline === null ? "Checking…" : offline ? "OFFLINE" : "ONLINE"}</strong></p>
      {!token ? <form onSubmit={login}>
        <label htmlFor="dev-phone">Phone number</label>
        <input id="dev-phone" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="username" required style={{ display: "block", width: "100%", padding: 12, margin: "8px 0 16px", boxSizing: "border-box" }} />
        <label htmlFor="dev-password">Developer password</label>
        <input id="dev-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required style={{ display: "block", width: "100%", padding: 12, margin: "8px 0 16px", boxSizing: "border-box" }} />
        <button type="submit" disabled={busy} style={{ padding: 14, width: "100%" }}>Developer sign in</button>
      </form> : <>
        <button onClick={() => void toggle()} disabled={busy || offline === null} style={{ padding: 16, width: "100%", fontWeight: 700, background: offline ? "#22c55e" : "#ef4444", color: "white", border: 0, borderRadius: 8 }}>
          {busy ? "Please wait…" : offline ? "TURN WEBSITE ON" : "TURN WEBSITE OFF"}
        </button>
        <button onClick={() => { sessionStorage.removeItem(sessionKey); setToken(""); }} style={{ marginTop: 20 }}>Sign out</button>
      </>}
      {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
    </section>
  </main>;
}
