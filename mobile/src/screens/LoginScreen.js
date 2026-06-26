import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import CountryPicker, { useCountries } from "../components/CountryPicker";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";

export default function LoginScreen({ navigation }) {
  const countries = useCountries();
  const { login } = useAuth();

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const country = selectedCountry || countries.find((c) => c.code === "+55") || countries[0];

  const handleLogin = async () => {
    const fullPhone = `${country?.code ?? "+55"}${phone}`.trim();
    if (!fullPhone || phone.length < 6) return alertMsg("Tanpri antre nimewo telefòn ou");
    if (!/^\d{4}$/.test(pin)) return alertMsg("PIN nan dwe gen egzakteman 4 chif");

    try {
      setLoading(true);
      const res = await client.post("/api/auth/login", { phone: fullPhone, password: pin });
      await login(res.data);
    } catch (err) {
      alertMsg("❌ " + (err.response?.data?.message || "Login echwe"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.modal}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.top}>
          <Text style={styles.title}>Konekte</Text>
          <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.welcome}>Byenvini!</Text>
        </View>

        <View style={styles.phoneRow}>
          <CountryPicker selected={country} onSelect={setSelectedCountry} />
          <TextInput
            style={styles.input}
            placeholder="Antre nimewo telefòn mobil ou"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
          />
        </View>

        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Antre PIN (4 chif)"
          placeholderTextColor={colors.textDim}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.submitBtnText}>{loading ? "Ap konekte..." : "RANTRE SOU KONT OU"}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <Text style={styles.orText}>OSWA</Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.replace("Register")}>
          <Text style={styles.createBtnText}>OUVÈ YON KONT</Text>
        </TouchableOpacity>
        <Text style={styles.note}>Si w pako gen kont, kreye youn</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.bg },
  modal: { flex: 1, padding: 24, paddingTop: 60 },
  closeBtn: { position: "absolute", top: 50, right: 20, zIndex: 1 },
  closeBtnText: { color: colors.text, fontSize: 20 },
  top: { alignItems: "center", marginBottom: 24 },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 8 },
  logo: { width: 90, height: 90, marginBottom: 8 },
  welcome: { color: colors.textMuted, fontSize: 16 },
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
  submitBtn: { backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 14, marginTop: 18, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700" },
  divider: { alignItems: "center", marginVertical: 18 },
  orText: { color: colors.textDim },
  createBtn: { borderWidth: 1, borderColor: colors.blue, borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  createBtnText: { color: colors.blue, fontWeight: "700" },
  note: { color: colors.textDim, textAlign: "center", marginTop: 12 },
});
