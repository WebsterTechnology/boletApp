import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";

const METHODS = [
  { key: "pix", icon: "⚡", label: "Pix", description: "Peman imedyat" },
  { key: "boleto", icon: "🧾", label: "Boleto", description: "Jenere yon tikè pou peye pita" },
];

export default function BuyCreditScreen({ navigation }) {
  const [selectedMethod, setSelectedMethod] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleContinue = () => {
    if (!acceptedTerms) return alertMsg("Tanpri aksepte kondisyon yo.");
    if (!selectedMethod) return alertMsg("Tanpri chwazi yon mòd peman.");

    if (selectedMethod === "pix") {
      navigation.navigate("PixPayment");
    } else {
      alertMsg(`Ou chwazi: ${selectedMethod}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fòm Peman</Text>
      <Text style={styles.subtitle}>Chwazi mòd ou vle peye a.</Text>

      {METHODS.map((m) => (
        <TouchableOpacity
          key={m.key}
          style={[styles.option, selectedMethod === m.key && styles.optionSelected]}
          onPress={() => setSelectedMethod(m.key)}
        >
          <Text style={styles.optionIcon}>{m.icon}</Text>
          <View>
            <Text style={styles.optionLabel}>{m.label}</Text>
            {!!m.description && <Text style={styles.optionDesc}>{m.description}</Text>}
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.checkboxRow}>
        <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
        <Text style={styles.checkboxLabel}>Mwen dakò ak Kondisyon Itilizasyon</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Retounen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueBtn, (!selectedMethod || !acceptedTerms) && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!selectedMethod || !acceptedTerms}
        >
          <Text style={styles.continueBtnText}>Kontinye</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: colors.textMuted, marginBottom: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionSelected: { borderColor: colors.gold, backgroundColor: "rgba(255, 215, 0, 0.08)" },
  optionIcon: { fontSize: 26 },
  optionLabel: { color: colors.text, fontWeight: "700", fontSize: 16 },
  optionDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  checkboxLabel: { color: colors.text, flex: 1 },
  actions: { flexDirection: "row", gap: 12, marginTop: 28 },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  backBtnText: { color: colors.text, fontWeight: "600" },
  continueBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: "center", backgroundColor: colors.gold },
  disabledBtn: { opacity: 0.5 },
  continueBtnText: { color: colors.textOnGold, fontWeight: "700" },
});
