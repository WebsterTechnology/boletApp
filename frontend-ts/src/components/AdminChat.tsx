import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API=import.meta.env.VITE_API_URL||"http://localhost:3001";
type Message={id:number;userId:number;sender:"user"|"admin";text:string;createdAt:string};
type Thread={userId:number;name:string;phone:string;email:string|null;lastMessage:string;lastMessageAt:string;unreadCount:number};
const auth=()=>({headers:{Authorization:`Bearer ${localStorage.getItem("token")||""}`}});

export default function AdminChat(){
 const [threads,setThreads]=useState<Thread[]>([]),[active,setActive]=useState<number|null>(null),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState("");
 const scrollRef=useRef<HTMLDivElement>(null), activeRef=useRef<number|null>(null);
 const load=()=>axios.get<Thread[]>(`${API}/api/chat/admin/threads`,auth()).then(r=>setThreads(r.data));
 useEffect(()=>{activeRef.current=active},[active]);
 useEffect(()=>{load().catch(console.error);const token=localStorage.getItem("token");if(!token)return;const s=io(API,{auth:{token},transports:["websocket","polling"]});s.on("chat-message",(m:Message)=>{load().catch(console.error);if(m.userId===activeRef.current)setMessages(c=>c.some(x=>x.id===m.id)?c:[...c,m]);});return()=>s.disconnect()},[]);
 useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight})},[messages]);
 const open=async(id:number)=>{setActive(id);const r=await axios.get<Message[]>(`${API}/api/chat/admin/threads/${id}/messages`,auth());setMessages(r.data);load().catch(console.error)};
 const send=async(e:React.FormEvent)=>{e.preventDefault();if(active===null||!text.trim())return;const r=await axios.post<Message>(`${API}/api/chat/admin/threads/${active}/messages`,{text:text.trim()},auth());setMessages(c=>c.some(x=>x.id===r.data.id)?c:[...c,r.data]);setText("");load().catch(console.error)};
 const current=threads.find(t=>t.userId===active);
 return <section style={{marginBottom:24}}><h3>💬 Live Chat <small style={{fontWeight:400}}>({threads.length} conversations)</small></h3>
  <div style={{display:"grid",gridTemplateColumns:"minmax(180px,280px) 1fr",border:"1px solid #ddd",borderRadius:10,overflow:"hidden",minHeight:380}}>
   <div style={{borderRight:"1px solid #ddd",overflowY:"auto",maxHeight:480}}>{threads.length===0?<p style={{padding:15}}>No messages yet.</p>:threads.map(t=><button key={t.userId} onClick={()=>open(t.userId)} style={{display:"block",width:"100%",textAlign:"left",padding:12,border:0,borderBottom:"1px solid #eee",background:active===t.userId?"#f3f4f6":"#fff",cursor:"pointer"}}><b>{t.name}</b>{t.unreadCount>0&&<span style={{float:"right",background:"red",color:"#fff",borderRadius:12,padding:"1px 7px"}}>{t.unreadCount}</span>}<div style={{fontSize:12,color:"#666"}}>{t.phone}</div><div style={{fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.lastMessage}</div></button>)}</div>
   <div style={{display:"flex",flexDirection:"column",minWidth:0}}>{!current?<div style={{margin:"auto",color:"#777"}}>Select a conversation</div>:<><div style={{padding:12,borderBottom:"1px solid #ddd"}}><b>{current.name}</b><div style={{fontSize:12}}>{current.phone}{current.email?` · ${current.email}`:""}</div></div><div ref={scrollRef} style={{flex:1,padding:12,overflowY:"auto",maxHeight:340,display:"flex",flexDirection:"column",gap:8}}>{messages.map(m=><div key={m.id} style={{alignSelf:m.sender==="admin"?"flex-end":"flex-start",maxWidth:"80%",padding:"8px 11px",borderRadius:12,background:m.sender==="admin"?"#111827":"#eee",color:m.sender==="admin"?"#fff":"#111"}}>{m.text}</div>)}</div><form onSubmit={send} style={{display:"flex",gap:8,padding:10,borderTop:"1px solid #ddd"}}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Reply to user..." style={{flex:1,padding:9}}/><button style={{padding:"8px 14px"}}>Send</button></form></>}</div>
  </div>
 </section>
}
