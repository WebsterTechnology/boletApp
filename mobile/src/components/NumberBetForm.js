import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import client from "../api/client";
import { useBet } from "../context/BetContext";
import { useAuth } from "../context/AuthContext";
import useEasternClock from "../hooks/useEasternClock";
import useDisabledRules from "../hooks/useDisabledRules";
import { colors, LOCATIONS } from "../constants/theme";
import { alertMsg, confirmAsync } from "../utils/alerts";

/**
 * Shared form for the single-number bet types: Yon Chif (1 digit),
 * De Chif / Bòlèt (2 digits), Twa Chif (3 digits), Katchif (4 digits).
 * Mirrors YonChif.jsx / DeChif.jsx / TwaChif.jsx / Katchif.jsx behavior.
 */
export default function NumberBetForm({ digits, type, endpoint, remainingEndpoint, navigation }) {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("New York");
  const [remaining, setRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { bets, addBet, deleteBet, clearBets, total } = useBet();
  const { user, applyPointsDelta } = useAuth();
  const { nyTime, flTime, gaTime } = useEasternClock();
  const { disabledNumbers, disabledLocations } = useDisabledRules();

  const userPoints = Number(user?.points ?? 0);
  const myBets = bets.filter((b) => b.type === type);

  useEffect(() => {
    if (!remainingEndpoint || number.length !== digits) {
      setRemaining(null);
      return;
    }
    client
      .get(remainingEndpoint, { params: { number, location } })
      .then((res) => setRemaining(res.data.remaining))
      .catch(() => setRemaining(null));
  }, [number, location, remainingEndpoint, digits]);

  const handleAdd = async () => {
    const betAmount = parseInt(amount, 10);
    const numTrim = number.trim();
    const locNorm = location.trim().toLowerCase();

    if (numTrim.length !== digits || !betAmount) {
      return alertMsg(`Tanpri antre ${digits} chif ak kantite pwen.`);
    }
    if (remainingEndpoint && remaining !== null && betAmount > remaining) {
      return alertMsg(`❌ pou kounya ka jwe sèlman ${remaining} pwen pou ${numTrim}.`);
    }
    if (disabledNumbers.includes(numTrim)) {
      return alertMsg(`Nimewo ${numTrim} dezaktive.`);
    }
    if (disabledLocations.includes(locNorm)) {
      return alertMsg(`Lokasyon ${location} dezaktive.`);
    }
    if (total + betAmount > userPoints) {
      const ok = await confirmAsync("Ou pa gen ase pwen. Ou vle achte plis?");
      if (ok) navigation.navigate("BuyCredits");
      return;
    }

    addBet({ number: numTrim, amount: betAmount, type, location });
    setNumber("");
    setAmount("");
  };

  const handleEdit = (b) => {
    setNumber(b.number);
    setAmount(String(b.amount));
    setLocation(b.location);
    deleteBet(b.id);
  };

  const handleSubmit = async () => {
    if (myBets.length === 0) return alertMsg("Ou pa mete okenn pari.");

    const totalBet = myBets.reduce((sum, b) => sum + parseInt(b.amount, 10), 0);
    const remainingPoints = userPoints - totalBet;
    if (remainingPoints < 0) {
      navigation.navigate("BuyCredits");
      return;
    }

    setSubmitting(true);
    try {
      for (const bet of myBets) {
        const locNorm = bet.location.trim().toLowerCase();
        if (disabledNumbers.includes(bet.number.trim())) continue;
        if (disabledLocations.includes(locNorm)) continue;

        await client.post(endpoint, {
          number: bet.number,
          pwen: parseInt(bet.amount, 10),
          location: bet.location,
        });
      }

      await applyPointsDelta(remainingPoints);
      clearBets(myBets.map((b) => b.id));
      alertMsg("Pari soumèt avèk siksè!");
    } catch (error) {
      alertMsg(error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.entryRow}>
        <TextInput
          style={[styles.input, { width: 56 }]}
          placeholder={"X".repeat(digits)}
          placeholderTextColor={colors.textDim}
          maxLength={digits}
          keyboardType="number-pad"
          value={number}
          onChangeText={(t) => setNumber(t.replace(/\D/g, ""))}
        />
        <TextInput
          style={[styles.input, { width: 80 }]}
          placeholder="Pwen"
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.pickerWrap}>
          <Picker selectedValue={location} onValueChange={setLocation} style={styles.picker} dropdownIconColor={colors.text}>
            {LOCATIONS.map((loc) => (
              <Picker.Item key={loc} label={loc} value={loc} color={colors.text} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity style={styles.plusBtn} onPress={handleAdd}>
          <Text style={styles.plusBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {remainingEndpoint && remaining !== null && (
        <Text style={{ color: remaining <= 5 ? colors.red : colors.text, marginBottom: 8 }}>
          {number} → {remaining} pwen rete
        </Text>
      )}

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>🕐 NY: {nyTime}</Text>
        <Text style={styles.timeText}>FL: {flTime}</Text>
        <Text style={styles.timeText}>GA: {gaTime}</Text>
      </View>

      <FlatList
        data={myBets}
        keyExtractor={(b) => String(b.id)}
        scrollEnabled={false}
        renderItem={({ item: b }) => (
          <View style={styles.betRow}>
            <Text style={styles.betNum}>{b.number}</Text>
            <Text style={styles.betAmt}>{b.amount} p</Text>
            <Text style={styles.betLoc}>{b.location}</Text>
            <TouchableOpacity onPress={() => handleEdit(b)} style={styles.editBtn}>
              <Text style={styles.actionText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteBet(b.id)} style={styles.deleteBtn}>
              <Text style={styles.actionText}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ou pa gen pari pou kounya a.</Text>}
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>Total: {myBets.reduce((s, b) => s + Number(b.amount || 0), 0)} p</Text>
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || myBets.length === 0) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || myBets.length === 0}
        >
          <Text style={styles.submitBtnText}>{submitting ? "Ap soumèt…" : "Soumèt"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  entryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pickerWrap: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    flex: 1,
    minWidth: 130,
  },
  picker: { color: colors.text, width: "100%" },
  plusBtn: {
    backgroundColor: colors.green,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 24 },
  timeRow: { flexDirection: "row", gap: 14, marginBottom: 10, flexWrap: "wrap" },
  timeText: { color: colors.textMuted, fontSize: 12 },
  betRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 6,
  },
  betNum: { color: colors.text, fontWeight: "700", width: 50 },
  betAmt: { color: colors.text, width: 50 },
  betLoc: { color: colors.textMuted, flex: 1 },
  editBtn: { padding: 6 },
  deleteBtn: { padding: 6 },
  actionText: { fontSize: 16 },
  empty: { color: colors.textDim, fontStyle: "italic", marginBottom: 10 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  totalText: { color: colors.text, fontWeight: "700" },
  submitBtn: { backgroundColor: colors.green, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700" },
});
