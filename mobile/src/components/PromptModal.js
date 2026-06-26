import React, { useCallback, useRef, useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export default function usePromptModal() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [value, setValue] = useState("");
  const resolverRef = useRef(null);

  const promptAsync = useCallback((t, m, defaultValue = "") => {
    setTitle(t);
    setMessage(m);
    setValue(defaultValue);
    setVisible(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (result) => {
    setVisible(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const PromptModalComponent = (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(null)}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            autoFocus
            placeholderTextColor={colors.textDim}
          />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => close(null)}>
              <Text style={styles.btnText}>Anile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.okBtn]} onPress={() => close(value)}>
              <Text style={styles.btnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return { promptAsync, PromptModalComponent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  box: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  message: { color: colors.textMuted, marginBottom: 10 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  cancelBtn: { backgroundColor: colors.border },
  okBtn: { backgroundColor: colors.blue },
  btnText: { color: "#fff", fontWeight: "600" },
});
