import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Pwen from "../components/Pwen";
import WithdrawModal from "../components/WithdrawModal";

export default function Balans() {
  const navigate = useNavigate();
  const [showWithdraw, setShowWithdraw] = useState(false);

  return (
    <main style={{maxWidth:560,margin:"32px auto",padding:"0 16px"}}>
      <button onClick={()=>navigate(-1)} aria-label="Back" style={{marginBottom:14,border:0,background:"transparent",fontSize:24,cursor:"pointer",padding:"4px 8px"}}>←</button>
      <div style={{background:"#111827",borderRadius:18,padding:24,boxShadow:"0 10px 30px rgba(0,0,0,.18)"}}>
        <h2 style={{color:"#fff",marginTop:0,marginBottom:22}}>💰 Balans</h2>
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:16,display:"flex",justifyContent:"center"}}>
          <Pwen label />
        </div>
        <div style={{display:"grid",gap:12}}>
          <button onClick={()=>navigate("/buy-credits")} style={{border:0,borderRadius:12,padding:"14px 18px",background:"#16a34a",color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer"}}>Achte Pwen</button>
          <button onClick={()=>setShowWithdraw(true)} style={{border:0,borderRadius:12,padding:"14px 18px",background:"#ef4444",color:"#fff",fontWeight:800,fontSize:17,cursor:"pointer"}}>Retire Pwen</button>
        </div>
      </div>
      {showWithdraw&&<WithdrawModal onClose={()=>setShowWithdraw(false)}/>}
    </main>
  );
}
