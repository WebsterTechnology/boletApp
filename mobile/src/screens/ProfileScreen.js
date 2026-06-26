import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";

export default function ProfileScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await refreshUser();
    } catch (err) {
      alertMsg("Failed to fetch profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>👤 Profil Ou</Text>
        <Text style={styles.text}>Ou pa konekte.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>👤 Profil Ou</Text>
      <Text style={styles.text}>
        <Text style={styles.bold}>Nimewo: </Text>
        {user.phone}
      </Text>
      <Text style={styles.text}>
        <Text style={styles.bold}>Pwen: </Text>
        <Text style={styles.points}>{user.points ?? 0}</Text>
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Ap rafrechi..." : "Rafrechi"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.btnText}>Dekonekte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  heading: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 16 },
  text: { color: colors.text, fontSize: 16, marginBottom: 8 },
  bold: { fontWeight: "700" },
  points: { color: colors.gold, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  refreshBtn: { backgroundColor: colors.blue, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  logoutBtn: { backgroundColor: colors.redDark, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
});
