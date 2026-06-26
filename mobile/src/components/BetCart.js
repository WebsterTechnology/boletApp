import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import client from "../api/client";
import { useBet } from "../context/BetContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";
import { alertMsg, confirmAsync } from "../utils/alerts";

const TYPE_TO_ENDPOINT = {
  "Yon Chif": "/api/yonchif",
  "De Chif": "/api/dechif",
  Maryaj: "/api/maryaj",
  "Twa Chif": "/api/twachif",
  Katchif: "/api/katchif",
};

export default function BetCart({ navigation }) {
  const { bets, deleteBet, clearBets, total } = useBet();
  const { user, applyPointsDelta } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const g = {};
    for (const b of bets) (g[b.type] ||= []).push(b);
    return g;
  }, [bets]);

  const submitAll = async () => {
    const currentPoints = Number(user?.points ?? 0);
    if (bets.length === 0 || total <= 0) return alertMsg("Panyen an vid.");
    if (total > currentPoints) {
      const ok = await confirmAsync("Ou pa gen ase pwen. Ou vle achte plis?");
      if (ok) navigation.navigate("BuyCredits");
      return;
    }

    setSubmitting(true);
    try {
      for (const bet of bets) {
        if (bet.type === "Maryaj") {
          const p1 = bet.number.slice(0, 2);
          const p2 = bet.number.slice(2, 4);
          await client.post("/api/maryaj", {
            part1: p1,
            part2: p2,
            pwen: parseInt(bet.amount, 10),
            location: bet.location,
          });
        } else {
          const endpoint = TYPE_TO_ENDPOINT[bet.type];
          if (!endpoint) continue;
          await client.post(endpoint, {
            number: bet.number,
            pwen: parseInt(bet.amount, 10),
            location: bet.location,
          });
        }
      }

      const remaining = Math.max(0, currentPoints - Number(total || 0));
      await applyPointsDelta(remaining);
      clearBets(bets.map((b) => b.id));
      alertMsg("Tout parye yo soumèt ak siksè!");
    } catch (e) {
      alertMsg(e.response?.data?.message || "Echèk soumèt parye yo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 Panyen — Tout parye yo</Text>

      {bets.length === 0 ? (
        <Text style={styles.empty}>Panyen an vid.</Text>
      ) : (
        <>
          {Object.entries(grouped).map(([type, list]) => (
            <View key={type} style={{ marginBottom: 12 }}>
              <Text style={styles.groupTitle}>{type}</Text>
              {list.map((b) => (
                <View key={b.id} style={styles.betRow}>
                  <View>
                    <Text style={styles.betNum}>{type === "Maryaj" ? b.display || b.number : b.number}</Text>
                    <Text style={styles.betSub}>
                      {b.amount} p • {b.location}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => deleteBet(b.id)}>
                    <Text style={styles.removeBtnText}>Retire</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.footer}>
            <View style={styles.totalPill}>
              <Text style={styles.totalText}>
                Total: <Text style={{ color: "#fff" }}>{total} p</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={submitAll}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? "Ap soumèt…" : "✅ Soumèt tout"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 12 },
  empty: { color: colors.textMuted, opacity: 0.8 },
  groupTitle: { color: colors.text, fontWeight: "700", marginBottom: 6 },
  betRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  betNum: { color: colors.text, fontWeight: "600" },
  betSub: { color: colors.text, fontSize: 12, opacity: 0.8, marginTop: 2 },
  removeBtn: { backgroundColor: colors.red, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  removeBtnText: { color: "#fff", fontWeight: "600" },
  footer: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalPill: { backgroundColor: "#111827", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  totalText: { color: colors.textMuted },
  submitBtn: { backgroundColor: colors.green, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700" },
});
