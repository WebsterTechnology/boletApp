import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Login")}>
        <Image source={require("../../assets/htloto.png")} style={styles.image} resizeMode="contain" />
        <Text style={styles.cta}>Touche pou Konekte / Jwe</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { alignItems: "center" },
  image: { width: 280, height: 280, borderRadius: 16 },
  cta: { color: colors.text, marginTop: 18, fontSize: 16, fontWeight: "700" },
});
