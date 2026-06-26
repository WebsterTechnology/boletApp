import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import CountryPicker, { useCountries } from "../components/CountryPicker";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";

export default function RegisterScreen({ navigation }) {
  const countries = useCountries();
  const { login } = useAuth();

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [loading, setLoading] = useState(false);

  const country = selectedCountry || countries.find((c) => c.code === "+55") || countries[0];

  const handleRegister = async () => {
    if (!isAdult) return alertMsg("Ou dwe gen 18 lane oswa plis.");
    const fullPhone = `${country?.code ?? "+55"}${phone}`.trim();

    try {
      setLoading(true);
      const res = await client.post("/api/auth/register", {
        phone: fullPhone,
        password: password.toString().trim(),
      });
      await login(res.data);
    } catch (err) {
      alertMsg("❌ " + (err.response?.data?.message || "Enskripsyon echwe"));
    } finally {
      setLoading(false);
    }
  };

  const disabled = !isAdult || phone.length < 6 || password.length !== 4 || loading;

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.modal}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Ouvè yon kont</Text>

        <View style={styles.phoneRow}>
          <CountryPicker selected={country} onSelect={setSelectedCountry} />
          <TextInput
            style={styles.input}
            placeholder="Antre nimewo telefòn mobil ou"
            placeholderTextColor={colors.textDim}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
          />
        </View>

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Chwazi yon kòd sekrè *"
            placeholderTextColor={colors.textDim}
            secureTextEntry={!showPassword}
            keyboardType="number-pad"
            maxLength={4}
            value={password}
            onChangeText={(t) => setPassword(t.replace(/\D/g, ""))}
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
            <Text style={{ color: colors.text }}>{showPassword ? "🙈" : "👁"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>*Pa plis pase 4 chif</Text>

        <View style={styles.checkboxRow}>
          <Switch value={isAdult} onValueChange={setIsAdult} />
          <Text style={styles.checkboxLabel}>Mwen gen 18 lane oswa plis</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
          onPress={handleRegister}
          disabled={disabled}
        >
          <Text style={styles.submitBtnText}>{loading ? "Ap kreye..." : "OUVÈ YON KONT"}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.orText}>OSWA</Text>
        </View>

        <TouchableOpacity style={styles.altBtn} onPress={() => navigation.replace("Login")}>
          <Text style={styles.altBtnText}>RANTRE SOU KONT OU</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Si'w jwe ak Websmobil, sa vle di ou aksepte tout kondisyon nou yo
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.bg },
  modal: { flex: 1, padding: 24, paddingTop: 60 },
  closeBtn: { position: "absolute", top: 50, right: 20, zIndex: 1 },
  closeBtnText: { color: colors.text, fontSize: 20 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 20 },
  phoneRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  eyeBtn: { padding: 10 },
  hint: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  checkboxLabel: { color: colors.text },
  submitBtn: { backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 14, marginTop: 24, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700" },
  divider: { alignItems: "center", marginVertical: 18 },
  orText: { color: colors.textDim },
  altBtn: { borderWidth: 1, borderColor: colors.blue, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  altBtnText: { color: colors.blue, fontWeight: "700" },
  note: { color: colors.textDim, textAlign: "center", marginTop: 16, fontSize: 12 },
});
