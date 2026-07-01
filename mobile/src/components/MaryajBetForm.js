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

export default function MaryajBetForm({ navigation }) {
  const [part1, setPart1] = useState("");
  const [part2, setPart2] = useState("");
  const [amount, setAmount] = useState("");
  const [location, setLocation] = useState("New York");
  const [remaining, setRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { bets, addBet, deleteBet, clearBets } = useBet();
  const { user, applyPointsDelta } = useAuth();
  const { nyTime, flTime, gaTime } = useEasternClock();
  const { disabledNumbers, disabledLocations } = useDisabledRules();

  const userPoints = Number(user?.points ?? 0);
  const myBets = bets.filter((b) => b.type === "Maryaj");
  const total = bets.reduce((sum, b) => sum + parseInt(b.amount || 0, 10), 0);

  useEffect(() => {
    if (part1.length === 2 && part2.length === 2) {
      client
        .get("/api/maryaj/remaining", { params: { part1, part2, location } })
        .then((res) => setRemaining(res.data.remaining))
        .catch(() => setRemaining(null));
    } else {
      setRemaining(null);
    }
  }, [part1, part2, location]);

  const handleAdd = async () => {
    const betAmount = parseInt(amount, 10);

    if (part1.length !== 2 || part2.length !== 2) {
      return alertMsg("Tanpri antre 2 chif nan chak bwat.");
    }
    if (!betAmount || betAmount <= 0) {
      return alertMsg("Tanpri antre yon kantite pwen valab.");
    }
    if (remaining !== null && betAmount > remaining) {
      return alertMsg(`❌ pou kounya ka jwe sèlman ${remaining} pwen pou maryaj ${part1}-${part2}.`);
    }

    const p1 = part1.trim();
    const p2 = part2.trim();
    const locNorm = location.trim().toLowerCase();

    if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) {
      return alertMsg(`Nimewo ${p1} oswa ${p2} dezaktive.`);
    }
    if (disabledLocations.includes(locNorm)) {
      return alertMsg(`Lokasyon ${location} dezaktive.`);
    }
    if (total + betAmount > userPoints) {
      const ok = await confirmAsync("Ou pa gen ase pwen. Ou vle achte plis?");
      if (ok) navigation.navigate("BuyCredits");
      return;
    }

    addBet({ number: p1 + p2, display: `${p1} ${p2}`, amount: betAmount, type: "Maryaj", location });
    setPart1("");
    setPart2("");
    setAmount("");
  };

  const handleEdit = (b) => {
    setPart1(b.number.slice(0, 2));
    setPart2(b.number.slice(2));
    setAmount(String(b.amount));
    setLocation(b.location || "New York");
    deleteBet(b.id);
  };

  const handleSubmit = async () => {
    if (myBets.length === 0) return alertMsg("Ou pa mete okenn pari pou 'Maryaj'.");

    const totalMaryaj = myBets.reduce((sum, b) => sum + parseInt(b.amount, 10), 0);
    const remainingPoints = userPoints - totalMaryaj;
    if (remainingPoints < 0) {
      alertMsg("Ou pa gen ase Pwen! Nap mennen w sou paj Achte Pwen an.");
      navigation.navigate("BuyCredits");
      return;
    }

    setSubmitting(true);
    try {
      for (const bet of myBets) {
        const p1 = bet.number.slice(0, 2).trim();
        const p2 = bet.number.slice(2, 4).trim();
        const locNorm = bet.location.trim().toLowerCase();

        if (disabledNumbers.includes(p1) || disabledNumbers.includes(p2)) continue;
        if (disabledLocations.includes(locNorm)) continue;

        await client.post("/api/maryaj", {
          part1: p1,
          part2: p2,
          pwen: parseInt(bet.amount, 10),
          location: bet.location,
        });
      }

      await applyPointsDelta(remainingPoints);
      clearBets(myBets.map((b) => b.id));
      alertMsg("Pari 'Maryaj' soumèt ak siksè!");
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
          style={[styles.input, { width: 50 }]}
          placeholder="XX"
          placeholderTextColor={colors.textDim}
          maxLength={2}
          keyboardType="number-pad"
          value={part1}
          onChangeText={(t) => setPart1(t.replace(/\D/g, ""))}
        />
        <TextInput
          style={[styles.input, { width: 50 }]}
          placeholder="XX"
          placeholderTextColor={colors.textDim}
          maxLength={2}
          keyboardType="number-pad"
          value={part2}
          onChangeText={(t) => setPart2(t.replace(/\D/g, ""))}
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

      {remaining !== null && (
        <Text style={{ color: remaining <= 5 ? colors.red : colors.text, marginBottom: 8 }}>
          {part1}-{part2} → {remaining} pwen rete
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
            <Text style={styles.betNum}>{b.display || b.number}</Text>
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
    backgroundColor: colors.gold,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBtnText: { color: colors.textOnGold, fontSize: 22, fontWeight: "700", lineHeight: 24 },
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
  betNum: { color: colors.text, fontWeight: "700", width: 70 },
  betAmt: { color: colors.text, width: 50 },
  betLoc: { color: colors.textMuted, flex: 1 },
  editBtn: { padding: 6 },
  deleteBtn: { padding: 6 },
  actionText: { fontSize: 16 },
  empty: { color: colors.textDim, fontStyle: "italic", marginBottom: 10 },
  footer: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  submitBtn: { backgroundColor: colors.green, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700" },
});
