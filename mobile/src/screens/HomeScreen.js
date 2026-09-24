import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { colors } from "../constants/theme";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View style={styles.burger}><View style={styles.line}/><View style={styles.line}/><View style={styles.line}/></View>
        <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={() => navigation.navigate("Login")}><Text style={styles.login}>Konekte</Text></TouchableOpacity>
      </View>
      <View style={styles.container}>
        <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate("Login")}>
          <View style={styles.badge}><Text style={styles.badgeText}>🔥 Cho</Text></View>
          <View style={styles.imageWrap}>
            <Image source={require("../../assets/htloto.png")} style={styles.image} resizeMode="cover" />
            <View style={styles.overlay}><Text style={styles.playOverlay}>Klike pou Jwe</Text></View>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Loto</Text>
            <Text style={styles.desc}>Jwe kounye a pou w ka genyen gwo kòb</Text>
            <View style={styles.playBtn}><Text style={styles.playBtnText}>Jwe Kounye a</Text></View>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:colors.bg},
 header:{height:58,backgroundColor:colors.card,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:16,borderBottomWidth:2,borderBottomColor:"rgba(255,215,0,.3)"},
 burger:{width:28,gap:5},line:{height:3,width:24,backgroundColor:colors.gold,borderRadius:3},
 logo:{width:72,height:38},login:{color:colors.gold,fontWeight:"800",fontSize:15},
 container:{flex:1,padding:20,justifyContent:"center"},card:{backgroundColor:colors.card,borderRadius:20,borderWidth:1,borderColor:colors.border,overflow:"hidden",position:"relative"},
 badge:{position:"absolute",top:12,left:12,zIndex:3,backgroundColor:colors.red,borderRadius:20,paddingHorizontal:12,paddingVertical:6},badgeText:{color:"#fff",fontWeight:"800"},
 imageWrap:{height:280,position:"relative"},image:{width:"100%",height:"100%"},overlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(0,0,0,.22)",alignItems:"center",justifyContent:"center"},playOverlay:{color:"#fff",fontSize:20,fontWeight:"800",textShadowColor:"#000",textShadowRadius:8},
 content:{padding:20},title:{color:colors.gold,fontSize:26,fontWeight:"900"},desc:{color:colors.textMuted,fontSize:15,marginTop:6,marginBottom:18},
 playBtn:{backgroundColor:colors.green,borderRadius:50,paddingVertical:14,alignItems:"center"},playBtnText:{color:"#fff",fontWeight:"900",fontSize:16}
});