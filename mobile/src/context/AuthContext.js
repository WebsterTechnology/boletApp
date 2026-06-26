import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client, { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedToken, storedUser, storedIsAdmin] = await Promise.all([
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("isAdmin"),
      ]);
      if (storedToken) setToken(storedToken);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {}
      }
      if (storedIsAdmin) {
        try {
          setIsAdmin(JSON.parse(storedIsAdmin) === true);
        } catch {}
      }
      setReady(true);
    })();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "token",
      "user",
      "userId",
      "userPhone",
      "isAdmin",
      "userPoints",
    ]);
    setToken(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const login = useCallback(async (data) => {
    await AsyncStorage.multiSet([
      ["token", data.token],
      ["user", JSON.stringify(data.user)],
      ["userId", String(data.user.id)],
      ["userPhone", String(data.user.phone)],
      ["isAdmin", JSON.stringify(!!data.user?.isAdmin)],
      ["userPoints", String(data.user?.points ?? 0)],
    ]);
    setToken(data.token);
    setUser(data.user);
    setIsAdmin(!!data.user?.isAdmin);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await client.get("/api/users/me");
    const fresh = res.data;
    await AsyncStorage.setItem("user", JSON.stringify(fresh));
    await AsyncStorage.setItem("userPoints", String(fresh.points ?? 0));
    setUser(fresh);
    return fresh;
  }, []);

  const applyPointsDelta = useCallback(async (newPoints) => {
    setUser((prev) => {
      const updated = { ...(prev || {}), points: newPoints };
      AsyncStorage.setItem("user", JSON.stringify(updated));
      AsyncStorage.setItem("userPoints", String(newPoints));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ready,
        token,
        user,
        isAdmin,
        isLoggedIn: !!token,
        login,
        logout,
        refreshUser,
        applyPointsDelta,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
