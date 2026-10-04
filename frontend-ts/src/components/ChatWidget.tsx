import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io, type Socket } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
type Message = { id:number; userId:number; sender:"user"|"admin"; text:string; createdAt:string };
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

export default function ChatWidget() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  useEffect(() => {
    const sync = () => { const next=localStorage.getItem("token"); setToken(next); if(!next){setOpen(false);setMessages([]);} };
    window.addEventListener("storage", sync);
    window.addEventListener("userLoggedIn", sync);
    window.addEventListener("userLoggedOut", sync);
    window.addEventListener("authChanged", sync);
    return () => { window.removeEventListener("storage",sync); window.removeEventListener("userLoggedIn",sync); window.removeEventListener("userLoggedOut",sync); window.removeEventListener("authChanged",sync); };
  }, []);

  useEffect(() => { openRef.current=open; if(open) setUnread(false); }, [open]);
  useEffect(() => { if(open && token) axios.get<Message[]>(`${API}/api/chat/messages`,auth()).then(r=>setMessages(r.data)).catch(console.error); }, [open,token]);
  useEffect(() => { scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight}); }, [messages,open]);

  useEffect(() => {
    if(!token) return;
    const socket: Socket=io(API,{auth:{token},transports:["websocket","polling"]});
    const receive=(m:Message)=>{
      setMessages(current=>current.some(x=>x.id===m.id)?current:[...current,m]);
      if(m.sender==="admin"&&!openRef.current) setUnread(true);
    };
    socket.on("chat-message",receive);
    return ()=>socket.disconnect();
  },[token]);

  if(!token) return null;

  const send=async(e:React.FormEvent)=>{
    e.preventDefault(); const value=text.trim(); if(!value||sending)return;
    setSending(true);
    try { const r=await axios.post<Message>(`${API}/api/chat/messages`,{text:value},auth()); setMessages(c=>c.some(m=>m.id===r.data.id)?c:[...c,r.data]); setText(""); }
    finally { setSending(false); }
  };

  return <div style={{position:"fixed",right:20,bottom:20,zIndex:1000}}>
    {open&&<div style={{width:"min(360px,calc(100vw - 40px))",height:460,background:"#fff",border:"1px solid #ddd",borderRadius:16,boxShadow:"0 12px 35px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden",marginBottom:10}}>
      <div style={{padding:"14px 16px",background:"#111827",color:"#fff",display:"flex",justifyContent:"space-between"}}><strong>💬 HTNovaTech Sipò</strong><button onClick={()=>setOpen(false)} style={{background:"none",border:0,color:"#fff",cursor:"pointer"}}>✕</button></div>
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8}}>
        {messages.length===0&&<p style={{textAlign:"center",color:"#777",fontSize:13}}>Kijan nou ka ede w?</p>}
        {messages.map(m=><div key={m.id} style={{alignSelf:m.sender==="user"?"flex-end":"flex-start",maxWidth:"82%",padding:"9px 12px",borderRadius:14,background:m.sender==="user"?"#111827":"#f1f3f5",color:m.sender==="user"?"#fff":"#111"}}>{m.sender==="admin"&&<div style={{fontSize:10,fontWeight:700,marginBottom:3}}>HTNovaTech</div>}{m.text}</div>)}
      </div>
      <form onSubmit={send} style={{display:"flex",gap:8,padding:10,borderTop:"1px solid #eee"}}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Ekri mesaj ou..." maxLength={4000} style={{flex:1,padding:10,border:"1px solid #ccc",borderRadius:10}}/><button disabled={sending||!text.trim()} style={{padding:"8px 14px",border:0,borderRadius:10,background:"#111827",color:"#fff"}}>{sending?"...":"Voye"}</button></form>
    </div>}
    <button onClick={()=>setOpen(v=>!v)} aria-label="Chat with support" style={{position:"relative",width:58,height:58,borderRadius:"50%",border:0,background:"#111827",color:"#fff",fontSize:25,cursor:"pointer",boxShadow:"0 6px 18px rgba(0,0,0,.25)"}}>{open?"✕":"💬"}{!open&&unread&&<span style={{position:"absolute",right:1,top:1,width:13,height:13,borderRadius:"50%",background:"red",border:"2px solid white"}}/>}</button>
  </div>;
}
