import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "../api/types";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";

export default function Balans() {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawable, setWithdrawable] = useState(0);
  const refreshBalances = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) return;

      const user: MeUser = await response.json();
      setWithdrawable(Number(user.withdrawablePoints ?? 0));

      // Keep the same current-user cache used by the rest of the app in sync.
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("userPoints", String(Number(user.points ?? 0)));
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    }
  }, []);

  useEffect(() => {
    refreshBalances();

    // Refresh again when the user returns to this tab/page.
    const onFocus = () => refreshBalances();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshBalances();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshBalances, showWithdraw]);

  return (
    <main style={{maxWidth:560,margin:"32px auto",padding:"0 16px"}}>
      <button onClick={()=>navigate(-1)} aria-label="Back" style={{marginBottom:14,border:0,background:"transparent",fontSize:24,cursor:"pointer",padding:"4px 8px"}}>←</button>
      <div style={{background:"#111827",borderRadius:18,padding:24,boxShadow:"0 10px 30px rgba(0,0,0,.18)"}}>
        <h2 style={{color:"#fff",marginTop:0,marginBottom:22}}>💰 Balans</h2>
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:12,display:"flex",justifyContent:"center"}}><Pwen label /></div>
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:16,textAlign:"center",fontWeight:800,color:"#111827",fontSize:17}}>Disponib pou retire: {withdrawable}</div>
        <div style={{display:"grid",gap:12}}>
          <button onClick={()=>navigate("/buy-credits")} style={{border:0,borderRadius:12,padding:"14px 18px",background:"#16a34a",color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer"}}>Achte Pwen</button>
          <button onClick={()=>setShowWithdraw(true)} style={{border:0,borderRadius:12,padding:"14px 18px",background:"#ef4444",color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer"}}>Retire Pwen</button>
        </div>
      </div>
      {showWithdraw&&<WithdrawModal onClose={()=>setShowWithdraw(false)}/>}
    </main>
  );
}
