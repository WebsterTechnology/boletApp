import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const saved = JSON.parse(localStorage.getItem("user") || "{}");
  const [form,setForm]=useState({fullName:saved.fullName||"",cpf:saved.cpf||"",birthDate:saved.birthDate||"",email:saved.email||"",address:saved.address||"",city:saved.city||"",state:saved.state||"",cep:saved.cep||""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async(e)=>{
    e.preventDefault();
    try {
      setSaving(true);
      const token=localStorage.getItem("token");
      const {data}=await axios.patch(`${API}/api/auth/complete-profile`,form,{headers:{Authorization:`Bearer ${token}`}});
      localStorage.setItem("user",JSON.stringify(data.user));
      window.dispatchEvent(new Event("userLoggedIn"));
      navigate("/",{replace:true});
    } catch(err){ alert(err.response?.data?.message || "Não foi possível completar o cadastro."); }
    finally{setSaving(false);}
  };
  const style={width:"100%",padding:12,marginBottom:10,border:"1px solid #ccc",borderRadius:8};
  return <main style={{maxWidth:560,margin:"32px auto",padding:20}}>
    <h2>Complete seu cadastro</h2>
    <p>Precisamos destes dados antes de continuar.</p>
    <form onSubmit={submit}>
      <input style={style} placeholder="Nome completo *" value={form.fullName} onChange={e=>set("fullName",e.target.value)} required/>
      <input style={style} placeholder="CPF *" inputMode="numeric" value={form.cpf} onChange={e=>set("cpf",e.target.value.replace(/\D/g,"").slice(0,11))} required/>
      <input style={style} type="date" value={form.birthDate} onChange={e=>set("birthDate",e.target.value)} required/>
      <input style={style} type="email" placeholder="E-mail *" value={form.email} onChange={e=>set("email",e.target.value)} required/>
      <input style={style} placeholder="Endereço *" value={form.address} onChange={e=>set("address",e.target.value)} required/>
      <input style={style} placeholder="Cidade *" value={form.city} onChange={e=>set("city",e.target.value)} required/>
      <input style={style} placeholder="Estado (UF) *" maxLength={2} value={form.state} onChange={e=>set("state",e.target.value.replace(/[^a-z]/gi,"").toUpperCase().slice(0,2))} required/>
      <input style={style} placeholder="CEP *" inputMode="numeric" value={form.cep} onChange={e=>set("cep",e.target.value.replace(/\D/g,"").slice(0,8))} required/>
      <div style={{padding:12,background:"#f3f4f6",borderRadius:8,marginBottom:12}}>Telefone: <strong>{saved.phone || localStorage.getItem("userPhone")}</strong></div>
      <button type="submit" disabled={saving} style={{width:"100%",padding:13,border:0,borderRadius:8,background:"#111827",color:"#fff",fontWeight:700}}>{saving?"Salvando...":"CONTINUAR"}</button>
    </form>
  </main>;
}
