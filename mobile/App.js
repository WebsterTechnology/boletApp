import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BetProvider } from "./src/context/BetContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BetProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </BetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
