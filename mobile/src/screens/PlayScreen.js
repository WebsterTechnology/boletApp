import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import NumberBetForm from "../components/NumberBetForm";
import MaryajBetForm from "../components/MaryajBetForm";
import BetCart from "../components/BetCart";
import { colors, GAME_TYPES } from "../constants/theme";

export default function PlayScreen({ navigation }) {
  const [mode, setMode] = useState("yon_chif");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.tabs}>
        {GAME_TYPES.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.tab, mode === g.key && styles.tabActive]}
            onPress={() => setMode(g.key)}
          >
            <Text style={[styles.tabText, mode === g.key && styles.tabTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {mode === "yon_chif" && (
          <NumberBetForm digits={1} type="Yon Chif" endpoint="/api/yonchif" navigation={navigation} />
        )}
        {mode === "de_chif" && (
          <NumberBetForm digits={2} type="De Chif" endpoint="/api/dechif" navigation={navigation} />
        )}
        {mode === "maryaj" && <MaryajBetForm navigation={navigation} />}
        {mode === "twa_chif" && (
          <NumberBetForm digits={3} type="Twa Chif" endpoint="/api/twachif" navigation={navigation} />
        )}
        {mode === "katchif" && (
          <NumberBetForm
            digits={4}
            type="Katchif"
            endpoint="/api/katchif"
            remainingEndpoint="/api/katchif/remaining"
            navigation={navigation}
          />
        )}
      </View>

      <View style={styles.cartSection}>
        <BetCart navigation={navigation} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 12 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  tabText: { color: colors.textMuted, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  content: { paddingHorizontal: 4 },
  cartSection: { paddingHorizontal: 12 },
});
