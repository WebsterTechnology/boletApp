import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import client, { API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";
import { alertMsg } from "../utils/alerts";

export default function PixPaymentScreen() {
  const { user, refreshUser } = useAuth();

  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [showReceipt, setShowReceipt] = useState(false);
  const [qrBase64, setQrBase64] = useState("");
  const [copyPaste, setCopyPaste] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const vencimento = (() => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    return `${String(dueDate.getDate()).padStart(2, "0")}/${String(dueDate.getMonth() + 1).padStart(
      2,
      "0"
    )}/${dueDate.getFullYear()} - 23:59`;
  })();

  const digits = (v) => (v || "").replace(/\D/g, "");

  const tryFetchQrAgain = async (id) => {
    try {
      const res = await client.get(`/api/pix/qr/${id}`);
      const data = res.data;
      if (data?.qrCode) setQrBase64(data.qrCode);
      if (data?.copyPaste) setCopyPaste(data.copyPaste);
      if (data?.invoiceUrl) setInvoiceUrl(data.invoiceUrl);
    } catch (err) {
      // 204 / not ready yet, ignore
    }
  };

  const handleGenerate = async () => {
    if (!user?.id) return alertMsg("Tanpri konekte anvan.");
    if (!amount || !name || !cpfCnpj || !email || !phone) {
      return alertMsg("Tanpri ranpli tout chan yo.");
    }

    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        amountBRL: Number(amount),
        description: "Lotto payment",
        name: name.trim(),
        cpfCnpj: digits(cpfCnpj),
        email: email.trim(),
        phone: phone.trim(),
      };

      const res = await client.post("/api/pix/create", payload);
      const data = res.data || {};

      const base64 = data.qrCode || data.qrBase64 || data.pixQrCode;
      const emv = data.copyPaste || data.pixCopyPasteKey;

      if (base64) setQrBase64(base64);
      if (emv) setCopyPaste(emv);
      if (data.invoiceUrl) setInvoiceUrl(data.invoiceUrl);

      setPaymentId(data.paymentId || data.id || "");
      setStatus(data.status || "PENDING");
      setShowReceipt(true);

      if (!base64 && !emv && (data.paymentId || data.id)) {
        setTimeout(() => tryFetchQrAgain(data.paymentId || data.id), 3000);
      }
    } catch (err) {
      alertMsg(`Erro ao gerar PIX: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!paymentId) return;
    const intervalId = setInterval(async () => {
      try {
        const res = await client.get(`/api/pix/status/${paymentId}`);
        const data = res.data;
        if (data?.status) {
          setStatus(data.status);
          if (data.status === "CONFIRMED" || data.status === "RECEIVED") {
            clearInterval(intervalId);
            await refreshUser().catch(() => {});
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(intervalId);
  }, [paymentId]);

  const copyCode = async () => {
    await Clipboard.setStringAsync(copyPaste);
    alertMsg("✅ Kòd Pix kopye!");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {!showReceipt ? (
        <View>
          <Text style={styles.title}>Peman Avèk Pix</Text>

          <Text style={styles.label}>Kantite pou peye (BRL):</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Nome completo</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textDim} />

          <Text style={styles.label}>CPF/CNPJ (somente números)</Text>
          <TextInput
            style={styles.input}
            value={cpfCnpj}
            onChangeText={setCpfCnpj}
            keyboardType="number-pad"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Telefone (DDI+DDD+Número, ex: 5599999999999)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={colors.textDim}
          />

          <TouchableOpacity style={styles.payBtn} onPress={handleGenerate} disabled={loading}>
            <Text style={styles.payBtnText}>{loading ? "Ap jenere..." : "Peye ak Pix"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.receiptBox}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Valor:</Text>
            <Text style={styles.amountValue}>BRL {Number(amount).toFixed(2)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Vencimento:</Text>
            <Text style={styles.amountValue}>{vencimento}</Text>
          </View>

          <Text style={styles.instruction}>
            Abra seu app bancário, use "copia e cola" ou aponte a câmera para o QR.
          </Text>

          {!!copyPaste && (
            <>
              <TextInput style={styles.pixInput} value={copyPaste} editable={false} multiline />
              <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
                <Text style={styles.copyBtnText}>📋 Copie Kòd Pix</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.or}>ou Escaneie o código QR</Text>

          {qrBase64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${qrBase64}` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : copyPaste ? (
            <View style={styles.qrWrap}>
              <QRCode value={copyPaste} size={220} backgroundColor="#fff" />
            </View>
          ) : invoiceUrl ? (
            <TouchableOpacity style={styles.payBtn} onPress={() => Linking.openURL(invoiceUrl)}>
              <Text style={styles.payBtnText}>Abrir página de pagamento</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => tryFetchQrAgain(paymentId)}>
              <Text style={styles.secondaryBtnText}>Tentar obter QR novamente</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.status}>
            Status: <Text style={{ fontWeight: "700" }}>{status || "PENDING"}</Text>
          </Text>

          {!!paymentId && <Text style={styles.paymentId}>Payment ID: {paymentId}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 16 },
  label: { color: colors.textMuted, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payBtn: { backgroundColor: colors.green, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  payBtnText: { color: "#fff", fontWeight: "700" },
  receiptBox: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 18 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  amountLabel: { color: colors.textMuted },
  amountValue: { color: colors.text, fontWeight: "700" },
  instruction: { color: colors.textMuted, marginVertical: 12, fontSize: 13 },
  pixInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    padding: 10,
    fontSize: 12,
  },
  copyBtn: { backgroundColor: colors.blue, borderRadius: 8, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  copyBtnText: { color: "#fff", fontWeight: "700" },
  or: { color: colors.textDim, textAlign: "center", marginVertical: 14 },
  qrWrap: { alignItems: "center", backgroundColor: "#fff", padding: 12, borderRadius: 8, alignSelf: "center" },
  qrImage: { width: 220, height: 220, alignSelf: "center", backgroundColor: "#fff", borderRadius: 8 },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  secondaryBtnText: { color: colors.text },
  status: { color: colors.text, marginTop: 16, textAlign: "center" },
  paymentId: { color: colors.textDim, fontSize: 11, textAlign: "center", marginTop: 6 },
});
