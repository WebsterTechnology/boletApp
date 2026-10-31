import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import type { StoredUser } from "../api/types";

const API = import.meta.env.VITE_API_URL || "https://boletapp-production.up.railway.app";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(() => {
    try { return JSON.parse(localStorage.getItem("user") as string) || null; } catch { return null; }
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
        const current = (() => {
          try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
        })();
        const mergedUser = { ...current, ...data };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
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
        <header style={hero}>
          <div style={avatar} aria-hidden="true">{(user.fullName || "K").trim().charAt(0).toUpperCase()}</div>
          <div style={{minWidth:0}}>
            <p style={{margin:"0 0 4px",fontSize:12,fontWeight:800,letterSpacing:1,color:"#bde5dc",textTransform:"uppercase"}}>Kont HTNovaTech</p>
            <h1 style={{margin:0,fontSize:"clamp(22px,5vw,30px)",lineHeight:1.2,color:"#fff"}}>Profil ou</h1>
            <p style={{margin:"7px 0 0",fontSize:14,color:"#d7f5eb",overflowWrap:"anywhere"}}>{user.fullName || "Kliyan HTNovaTech"}</p>
          </div>
        </header>
        <div style={content}>
          <h2 style={{margin:"0 0 14px",fontSize:17,color:"#173b31"}}>Enfòmasyon pèsonèl</h2>
          <div style={row}><span style={label}>Non</span><strong style={value}>{user.fullName || "—"}</strong></div>
          <div style={row}><span style={label}>E-mail</span><strong style={value}>{user.email || "—"}</strong></div>
          <div style={row}><span style={label}>Telefòn</span><strong style={value}>{user.phone || "—"}</strong></div>
          <div style={balanceCard}>
            <span style={{fontWeight:700,fontSize:13,color:"#406457"}}>Balans ou</span>
            <strong style={{display:"block",fontSize:29,color:"#137b50",marginTop:5}}>{user.points ?? 0} <small style={{fontSize:14,color:"#567b6d"}}>pwen</small></strong>
          </div>
          <button type="button" onClick={fetchUser} disabled={loading} style={primary}>{loading ? "Ap rafrechi..." : "↻ Rafrechi enfòmasyon yo"}</button>
          <button type="button" onClick={handleLogout} style={logout}>Dekonekte</button>
        </div>
      </section>
    </main>
  );
}
const page:CSSProperties={minHeight:"calc(100vh - 80px)",padding:"24px 14px 44px",display:"flex",justifyContent:"center",alignItems:"flex-start",background:"linear-gradient(180deg,#eaf6f0 0%,#f5f7fb 65%)",boxSizing:"border-box"};
const card:CSSProperties={width:"100%",maxWidth:560,background:"#fff",border:"1px solid #dcebe4",borderRadius:24,overflow:"hidden",boxShadow:"0 14px 38px rgba(21,67,53,.10)"};
const hero:CSSProperties={display:"flex",alignItems:"center",gap:16,padding:"26px 22px",background:"linear-gradient(125deg,#153f38,#10865a)"};
const avatar:CSSProperties={width:60,height:60,borderRadius:20,flexShrink:0,display:"grid",placeItems:"center",fontSize:29,fontWeight:900,background:"#e8fff3",color:"#11794d",boxShadow:"0 3px 12px #0002"};
const content:CSSProperties={padding:"22px clamp(16px,5vw,28px) 26px"};
const row:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,padding:"15px 0",borderBottom:"1px solid #edf2ef"};
const label:CSSProperties={color:"#587467",fontSize:14,flexShrink:0};
const value:CSSProperties={color:"#182f29",textAlign:"right",fontSize:15,overflowWrap:"anywhere",minWidth:0};
const balanceCard:CSSProperties={marginTop:22,padding:"17px 20px",background:"#edf9f2",border:"1px solid #d1eddf",borderRadius:16};
const primary:CSSProperties={width:"100%",marginTop:20,padding:"14px 16px",border:0,borderRadius:12,background:"#147e54",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"};
const logout:CSSProperties={width:"100%",marginTop:12,padding:"14px 16px",border:"1px solid #f2c7c7",borderRadius:12,background:"#fff3f3",color:"#b3232a",fontWeight:800,fontSize:15,cursor:"pointer"};
