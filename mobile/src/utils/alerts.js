import { Alert } from "react-native";

export function alertMsg(message, title = "") {
  Alert.alert(title, message);
}

export function confirmAsync(message, title = "Konfime") {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Anile", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}
