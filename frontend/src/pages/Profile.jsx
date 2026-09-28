import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://boletapp-production.up.railway.app";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("userPhone", data.phone);
        localStorage.setItem("userPoints", String(data.points ?? 0));
        window.dispatchEvent(new Event("pointsUpdated"));
        window.dispatchEvent(new Event("userLoggedIn"));
      }
    } catch (err) { console.error("Failed to fetch profile:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUser(); }, []);

  const handleLogout = () => {
    ["user","userId","userPhone","token","isAdmin","userPoints"].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("pointsUpdated"));
    window.dispatchEvent(new Event("authChanged"));
    window.dispatchEvent(new Event("userLoggedOut"));
    navigate("/", { replace: true });
  };

  if (!user) return <main style={page}><section style={card}><h2>👤 Profil Ou</h2><p>Ou pa konekte.</p><button onClick={()=>navigate("/")} style={primary}>Ale nan paj prensipal</button></section></main>;

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={{margin:"0 0 6px"}}>👤 Profil Ou</h1>
        <p style={{margin:"0 0 24px",color:"#666"}}>Enfòmasyon kont ou</p>
        <div style={row}><span style={label}>Non</span><strong>{user.fullName || "—"}</strong></div>
        <div style={row}><span style={label}>E-mail</span><strong style={{overflowWrap:"anywhere"}}>{user.email || "—"}</strong></div>
        <div style={row}><span style={label}>Telefòn</span><strong>{user.phone}</strong></div>
        <div style={row}><span style={label}>Pwen</span><strong>{user.points ?? 0}</strong></div>
        <button onClick={fetchUser} disabled={loading} style={primary}>{loading ? "Ap rafrechi..." : "RAFRECHI"}</button>
        <hr style={{border:0,borderTop:"1px solid #ddd",margin:"24px 0"}} />
        <button onClick={handleLogout} style={logout}>🚪 DEKONEKTE</button>
      </section>
    </main>
  );
}
const page={minHeight:"calc(100vh - 80px)",padding:"24px 16px",display:"flex",justifyContent:"center",alignItems:"flex-start",background:"#f5f6fa"};
const card={width:"100%",maxWidth:520,background:"#fff",borderRadius:16,padding:24,boxShadow:"0 8px 30px rgba(0,0,0,.10)"};
const row={display:"flex",justifyContent:"space-between",gap:16,padding:"14px 0",borderBottom:"1px solid #eee"};
const label={color:"#666"};
const primary={width:"100%",marginTop:22,padding:"13px 16px",border:0,borderRadius:10,background:"#3157d5",color:"#fff",fontWeight:800,cursor:"pointer"};
const logout={width:"100%",padding:"15px 16px",border:0,borderRadius:10,background:"#c62828",color:"#fff",fontWeight:900,fontSize:16,cursor:"pointer"};
