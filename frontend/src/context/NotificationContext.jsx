import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const token = localStorage.getItem("token") || "";

  const auth = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` },
  }), [token]);

  const loadUnread = useCallback(async () => {
    if (!token) {
      setQueue([]);
      return;
    }
    try {
      const res = await axios.get(`${API}/api/notifications/unread`, auth);
      setQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load unread notifications", err);
    }
  }, [token, auth]);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API, { transports: ["websocket", "polling"] });
    socket.on("broadcast-notification", (notification) => {
      setQueue((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [...current, notification]
      );
    });
    return () => socket.disconnect();
  }, [token]);

  const markRead = async (id) => {
    try {
      await axios.post(`${API}/api/notifications/${id}/read`, {}, auth);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    } finally {
      setQueue((current) => current.filter((item) => item.id !== id));
    }
  };

  return (
    <NotificationContext.Provider value={{ queue, markRead, reload: loadUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
