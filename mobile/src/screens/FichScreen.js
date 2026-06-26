import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, AppState } from "react-native";
import client from "../api/client";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";
import usePromptModal from "../components/PromptModal";

const STATUS_COLOR = {
  won: colors.greenDark,
  lost: colors.red,
  paid: colors.paid,
  pending: colors.pending,
};

const STATUS_LABEL = {
  won: "GENYEN",
  lost: "PÈDI",
  paid: "PÈYE",
  pending: "ANNATANT",
};

const fmt = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function FichScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [totalPwen, setTotalPwen] = useState(0);
  const [claimBusy, setClaimBusy] = useState({});
  const [claimed, setClaimed] = useState({});
  const mounted = useRef(true);
  const { promptAsync, PromptModalComponent } = usePromptModal();

  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await client.get("/api/bets/me");
      const data = res?.data || {};
      if (mounted.current) {
        setTotalPwen(Number(data.totalPwen || 0));
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch (err) {
      if (mounted.current) {
        setItems([]);
        setTotalPwen(0);
      }
    } finally {
      if (!silent && mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const iv = setInterval(() => load({ silent: true }), 7000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load({ silent: true });
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [load]);

  const claimKey = (b) => `${b.type}-${b.id}`;

  const submitClaim = async (b, method) => {
    const key = claimKey(b);
    if (claimBusy[key]) return;

    let winAmount = Number(b.winAmount || b.pwen || 0);
    if (!Number.isFinite(winAmount) || winAmount <= 0) {
      const inp = await promptAsync("Kantite", "Antre kantite pwen pou reklame:", "0");
      if (!inp) return;
      winAmount = parseInt(inp, 10);
      if (!Number.isFinite(winAmount) || winAmount <= 0) return alertMsg("Kantite pa valab.");
    }

    let pixKey = null;
    if (method === "pix") {
      pixKey = await promptAsync("PIX Key", "Antre PIX key ou (email/CPF/telefòn):", "");
      if (!pixKey) return;
    }

    try {
      setClaimBusy((m) => ({ ...m, [key]: true }));
      await client.post("/api/claims", {
        betType: b.type,
        betId: b.id,
        winAmount,
        payoutMethod: method,
        pixKey,
      });
      setClaimed((m) => ({ ...m, [key]: true }));
      alertMsg("Demann lan voye bay admin lan. Mèsi!");
    } catch (e) {
      alertMsg(e.response?.data?.message || "Claim failed");
    } finally {
      if (mounted.current) setClaimBusy((m) => ({ ...m, [key]: false }));
    }
  };

  const renderItem = ({ item: b }) => {
    const key = claimKey(b);
    const status = (b.status || "pending").toLowerCase();
    const won = status === "won";
    const lost = status === "lost";
    const paid = status === "paid";

    let displayNumbers = b.numbers;
    if (b.type === "maryaj" && b.part1 && b.part2) displayNumbers = `${b.part1} ${b.part2}`;

    return (
      <View style={[styles.card, (lost || paid) && { opacity: 0.8 }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            #{b.id} • {b.type}
          </Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] || "#6b7280" }]}>
            <Text style={styles.badgeText}>{STATUS_LABEL[status] || status}</Text>
          </View>
        </View>

        <Text style={styles.line}>
          Nimewo: <Text style={styles.bold}>{displayNumbers || b.numbers || "-"}</Text>
        </Text>
        <Text style={styles.line}>
          Pwen: <Text style={styles.bold}>{b.pwen}</Text>
        </Text>
        {!!b.draw && b.draw !== "-" && (
          <Text style={styles.line}>
            Lokasyon: <Text style={styles.bold}>{b.draw}</Text>
          </Text>
        )}
        <Text style={styles.date}>{fmt(b.createdAt)}</Text>

        {lost && <Text style={styles.lostText}>❌ Pari sa a pèdi</Text>}
        {paid && <Text style={styles.paidText}>💰 Pri pèye</Text>}

        {won && !claimed[key] && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.claimBtnPoints}
              onPress={() => submitClaim(b, "points")}
              disabled={!!claimBusy[key]}
            >
              <Text style={styles.claimBtnText}>{claimBusy[key] ? "..." : "➕ Ajoute nan Pwen"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.claimBtnPix}
              onPress={() => submitClaim(b, "pix")}
              disabled={!!claimBusy[key]}
            >
              <Text style={styles.claimBtnText}>{claimBusy[key] ? "..." : "💸 Retire lajan PIX"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {won && claimed[key] && <Text style={styles.claimedText}>✓ Reklamasyon voye</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>🧾 Fich — Pari mwen yo</Text>
        <View style={styles.totalPill}>
          <Text style={styles.totalText}>
            Total: <Text style={styles.bold}>{totalPwen}</Text>
          </Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={claimKey}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.blue} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Pa gen pari ankò.</Text> : null}
      />
      {PromptModalComponent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 0 },
  heading: { color: colors.text, fontSize: 18, fontWeight: "700" },
  totalPill: { backgroundColor: colors.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  totalText: { color: colors.textMuted },
  bold: { color: "#fff", fontWeight: "700" },
  empty: { color: colors.textDim, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: "700" },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  line: { color: colors.text, marginBottom: 2 },
  date: { color: colors.textDim, marginTop: 4, fontSize: 12 },
  lostText: { color: colors.red, marginTop: 8 },
  paidText: { color: colors.paid, marginTop: 8 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  claimBtnPoints: { backgroundColor: colors.greenDark, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  claimBtnPix: { backgroundColor: colors.blue, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  claimBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  claimedText: { color: colors.textDim, marginTop: 10, fontSize: 13 },
});
