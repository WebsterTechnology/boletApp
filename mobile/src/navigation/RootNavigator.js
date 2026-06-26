import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { useAuth } from "../context/AuthContext";
import { colors } from "../constants/theme";

import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import PlayScreen from "../screens/PlayScreen";
import FichScreen from "../screens/FichScreen";
import ProfileScreen from "../screens/ProfileScreen";
import BuyCreditScreen from "../screens/BuyCreditScreen";
import PixPaymentScreen from "../screens/PixPaymentScreen";

const AuthStackNav = createNativeStackNavigator();
const AppStackNav = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <AuthStackNav.Screen name="Home" component={HomeScreen} />
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    </AuthStackNav.Navigator>
  );
}

const TAB_ICONS = {
  Jwe: "🎲",
  Fich: "🧾",
  Pwen: "💰",
  Profil: "👤",
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textDim,
        tabBarIcon: () => null,
        tabBarLabel: `${TAB_ICONS[route.name] ?? ""} ${route.name}`,
      })}
    >
      <Tabs.Screen name="Jwe" component={PlayScreen} options={{ title: "Jwe" }} />
      <Tabs.Screen name="Fich" component={FichScreen} options={{ title: "Fich" }} />
      <Tabs.Screen name="Pwen" component={BuyCreditScreen} options={{ title: "Achte Pwen" }} />
      <Tabs.Screen name="Profil" component={ProfileScreen} options={{ title: "Profil" }} />
    </Tabs.Navigator>
  );
}

function AppStack() {
  return (
    <AppStackNav.Navigator screenOptions={screenOptions}>
      <AppStackNav.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <AppStackNav.Screen
        name="BuyCredits"
        component={BuyCreditScreen}
        options={{ title: "Achte Pwen" }}
      />
      <AppStackNav.Screen
        name="PixPayment"
        component={PixPaymentScreen}
        options={{ title: "Peman Pix" }}
      />
    </AppStackNav.Navigator>
  );
}

export default function RootNavigator() {
  const { ready, isLoggedIn } = useAuth();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          primary: colors.blue,
          background: colors.bg,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.red,
        },
      }}
    >
      {isLoggedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
