import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { getCountryCallingCode, getCountries } from "libphonenumber-js";
import * as countryList from "country-codes-list";
import { colors } from "../constants/theme";

export function useCountries() {
  return useMemo(() => {
    const validISOs = getCountries();
    return Object.entries(countryList.customList("countryCode", "{countryNameEn}"))
      .filter(([iso]) => validISOs.includes(iso))
      .map(([iso, name]) => ({ name, iso, code: "+" + getCountryCallingCode(iso) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

export default function CountryPicker({ selected, onSelect }) {
  const countries = useCountries();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity style={styles.codeBtn} onPress={() => setVisible(true)}>
        <Text style={styles.codeText}>{selected?.code ?? "+55"} ▾</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Chwazi Peyi</Text>
          <FlatList
            data={countries}
            keyExtractor={(c) => c.iso}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onSelect(item);
                  setVisible(false);
                }}
              >
                <Text style={styles.optionText}>
                  {item.name} <Text style={styles.optionCode}>({item.code})</Text>
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
            <Text style={styles.closeBtnText}>Fèmen</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  codeBtn: {
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  codeText: { color: "#fff", fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 16 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionText: { color: colors.text, fontSize: 15 },
  optionCode: { color: colors.textDim },
  closeBtn: { padding: 14, alignItems: "center", marginBottom: 20 },
  closeBtnText: { color: colors.blue, fontWeight: "700" },
});
