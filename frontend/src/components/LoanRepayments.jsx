import React, { useEffect, useState } from "react";

const API=import.meta.env.VITE_API_URL || "https://boletapp-production.up.railway.app";
const formatTime=(ms)=>{
  const seconds=Math.max(0,Math.floor(ms/1000));
  const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600);
  const minutes=Math.floor(seconds%3600/60);
  return `${days} jou, ${hours} è, ${minutes} min`;
};
const paymentKey=()=>`loan_${crypto.randomUUID().replace(/-/g,"")}`;

export default function LoanRepayments(){
  const [loans,setLoans]=useState([]);
  const [statuses,setStatuses]=useState({});
  const [amounts,setAmounts]=useState({});
  const [method,setMethod]=useState({});
  const [busy,setBusy]=useState({});
  const [message,setMessage]=useState("");
  const [clock,setClock]=useState(Date.now());
  const load=async()=>{
    const token=localStorage.getItem("token");
    if(!token)return;
    try{
      const headers={Authorization:`Bearer ${token}`};
      const response=await fetch(`${API}/api/borrow-requests/mine`,{headers});
      if(!response.ok)throw Error("Pa kapab chaje prè yo.");
      const records=await response.json();
      const approved=records.filter(item=>item.status==="approved" && item.creditedAt);
      setLoans(approved);
      const details=await Promise.all(approved.map(async item=>{
        const result=await fetch(`${API}/api/borrow-requests/${item.id}/repayment-status`,{headers});
        return [item.id,result.ok?await result.json():null];
      }));
      setStatuses(Object.fromEntries(details));
    }catch(error){setMessage(error.message);}
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    const timer=setInterval(()=>{load();},30000);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    const timer=setInterval(()=>setClock(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[]);
  const pay=async(item,status)=>{
    const id=item.id,selected=method[id]||(status.walletPaymentsEnabled?"wallet":"pix");
    const amount=status.finalDay?status.remaining:Number(amounts[id]||status.remaining);
    if(!Number.isSafeInteger(amount)||amount<1||amount>status.remaining){
      setMessage("Antre yon kantite pwen ki valid.");return;
    }
    if(status.pendingPix){setMessage("Yon peman PIX deja annatant.");return;}
    setBusy(previous=>({...previous,[id]:true}));setMessage("");
    try{
      const endpoint=selected==="pix"?"pix-intents":"wallet-repayments";
      const response=await fetch(`${API}/api/borrow-requests/${id}/${endpoint}`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("token")}`,
          "Idempotency-Key":paymentKey()},
        body:JSON.stringify({amount})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.message||"Peman an pa pase.");
      if(selected==="pix"){
        if(!result.checkoutUrl)throw Error("Lyen PIX pa disponib.");
        window.location.assign(result.checkoutUrl);return;
      }
      setMessage(`Peman ${amount} pwen an anrejistre.`);
      await load();
      window.dispatchEvent(new Event("pointsUpdated"));
    }catch(error){setMessage(error.message);}
    finally{setBusy(previous=>({...previous,[id]:false}));}
  };
  if(!loans.length)return null;
  return <section aria-label="Ranbousman prè" style={{marginTop:24}}>
    <h2>Ranbousman prè ou</h2>
    {message&&<p role="status">{message}</p>}
    {loans.map(item=>{
      const status=statuses[item.id];
      if(!status)return null;
      const left=Math.max(0,new Date(status.dueAt).getTime()-clock);
      const selected=method[item.id]||(status.walletPaymentsEnabled?"wallet":"pix");
      return <div key={item.id} style={{border:"1px solid #ddd",borderRadius:12,padding:16,marginBottom:14}}>
        <strong>Prè #{item.id}</strong>
        <p>Rès pou peye: <strong>{status.remaining} pwen</strong> sou {status.total} pwen</p>
        <p>Tan ki rete: <strong style={{color:status.finalDay?"#b91c1c":"#166534"}}>{formatTime(left)}</strong></p>
        {status.remaining===0?<p>Prè sa a fin peye.</p>:<>
          {status.finalDay&&<p>Nan dènye jou a, se tout rès la ou dwe peye.</p>}
          {status.pendingPix&&<p>Yon peman PIX annatant. Pa fè yon lòt peman kounye a.</p>}
          {!status.finalDay&&<label>Kantite pou peye (pwen)
            <input type="number" min="1" max={status.remaining} step="1"
              value={amounts[item.id]??status.remaining}
              onChange={event=>setAmounts(old=>({...old,[item.id]:event.target.value}))}
              style={{display:"block",padding:8,width:"100%",margin:"8px 0"}}/>
          </label>}
          <div style={{display:"flex",gap:12,marginBottom:12}}>
            {status.walletPaymentsEnabled&&<label><input type="radio" checked={selected==="wallet"}
              onChange={()=>setMethod(old=>({...old,[item.id]:"wallet"}))}/> Peye ak balans Bolet</label>}
            {status.pixPaymentsEnabled&&<label><input type="radio" checked={selected==="pix"}
              onChange={()=>setMethod(old=>({...old,[item.id]:"pix"}))}/> Peye ak PIX</label>}
          </div>
          {(status.walletPaymentsEnabled||status.pixPaymentsEnabled)&&
            <button type="button" disabled={busy[item.id]||status.pendingPix||
              (selected==="wallet"&&!status.walletPaymentsEnabled)||
              (selected==="pix"&&!status.pixPaymentsEnabled)}
              onClick={()=>pay(item,status)}>
              {busy[item.id]?"Tanpri tann...":status.finalDay?"Peye tout rès la":"Peye kounye a"}
            </button>}
          {!status.walletPaymentsEnabled&&!status.pixPaymentsEnabled&&
            <p>Opsyon peman yo poko disponib.</p>}
        </>}
      </div>;
    })}
  </section>;
}
