import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BetProvider } from "./src/context/BetContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BetProvider>
          <NotificationProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </NotificationProvider>
        </BetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
