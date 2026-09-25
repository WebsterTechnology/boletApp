import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from"react";
import{Modal,View,Text,TouchableOpacity,Image,StyleSheet,Linking}from"react-native";
import{io}from"socket.io-client";
import client,{API_URL}from"../api/client";
import{useAuth}from"./AuthContext";

const NotificationContext=createContext(null);

export function NotificationProvider({children}){
 const{token}=useAuth();
 const[queue,setQueue]=useState([]);
 const loadUnread=useCallback(async()=>{if(!token){setQueue([]);return;}try{const res=await client.get("/api/notifications/unread");setQueue(Array.isArray(res.data)?res.data:[]);}catch(e){console.log("Failed to load notifications",e?.message)}},[token]);
 useEffect(()=>{loadUnread();},[loadUnread]);
 useEffect(()=>{if(!token)return;const socket=io(API_URL,{transports:["websocket","polling"]});socket.on("broadcast-notification",(n)=>setQueue(q=>q.some(x=>x.id===n.id)?q:[...q,n]));return()=>socket.disconnect();},[token]);
 const markRead=async(id)=>{try{await client.post(`/api/notifications/${id}/read`);}catch{}finally{setQueue(q=>q.filter(x=>x.id!==id));}};
 const current=queue[0];
 const value=useMemo(()=>({queue,markRead,reload:loadUnread}),[queue,loadUnread]);
 return <NotificationContext.Provider value={value}>
  {children}
  <Modal visible={!!current} transparent animationType="fade" onRequestClose={()=>{}}>
   <View style={s.overlay}>
    <View style={[s.card,current?.priority==="critical"&&s.critical,current?.priority==="warning"&&s.warning]}>
     <Text style={s.priority}>{String(current?.priority||"info").toUpperCase()}</Text>
     {!!current?.imageUrl&&<Image source={{uri:current.imageUrl}} style={s.image}/>}
     <Text style={s.title}>{current?.title}</Text>
     <Text style={s.message}>{current?.message}</Text>
     {!!current?.linkUrl&&<TouchableOpacity onPress={()=>Linking.openURL(current.linkUrl)}><Text style={s.link}>Open link</Text></TouchableOpacity>}
     <TouchableOpacity style={s.button} onPress={()=>markRead(current.id)}><Text style={s.buttonText}>Got it</Text></TouchableOpacity>
    </View>
   </View>
  </Modal>
 </NotificationContext.Provider>;
}
export const useNotifications=()=>useContext(NotificationContext);
const s=StyleSheet.create({
 overlay:{flex:1,backgroundColor:"rgba(5,8,20,.86)",alignItems:"center",justifyContent:"center",padding:20},
 card:{width:"100%",maxWidth:520,backgroundColor:"#16213e",borderRadius:20,padding:22,borderWidth:2,borderColor:"#1976d2"},
 warning:{borderColor:"#f59e0b"},critical:{borderColor:"#dc2626"},
 priority:{alignSelf:"flex-start",color:"#fff",fontSize:11,fontWeight:"900",backgroundColor:"rgba(255,255,255,.1)",paddingHorizontal:10,paddingVertical:6,borderRadius:99},
 image:{width:"100%",height:180,borderRadius:14,marginTop:14},
 title:{color:"#fff",fontSize:25,fontWeight:"900",marginTop:14},
 message:{color:"rgba(255,255,255,.85)",fontSize:16,lineHeight:24,marginTop:8},
 link:{color:"#ffd700",fontWeight:"800",marginTop:12},
 button:{backgroundColor:"#ffd700",borderRadius:99,paddingVertical:14,alignItems:"center",marginTop:20},
 buttonText:{color:"#1a1a2e",fontWeight:"900",fontSize:16}
});
