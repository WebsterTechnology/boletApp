import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [queue, setQueue] = useState([]);
  const token = localStorage.getItem("token") || "";
  const auth = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setQueue([]);
      return;
    }
    try {
      const [allRes, unreadRes] = await Promise.all([
        axios.get(`${API}/api/notifications`, auth),
        axios.get(`${API}/api/notifications/unread`, auth),
      ]);
      setNotifications(Array.isArray(allRes.data) ? allRes.data : []);
      setQueue(Array.isArray(unreadRes.data) ? unreadRes.data : []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }, [token, auth]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API, { auth: { token }, transports: ["websocket", "polling"] });
    const receive = (notification) => {
      setNotifications((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [{ ...notification, read: false }, ...current]
      );
      setQueue((current) =>
        current.some((item) => item.id === notification.id)
          ? current
          : [...current, notification]
      );
    };
    socket.on("notification", receive);
    socket.on("broadcast-notification", receive);
    socket.on("connect_error", (err) => console.error("Notification socket connection failed", err.message));
    return () => socket.disconnect();
  }, [token]);

  // Closing the real-time modal only acknowledges the popup. The bell stays unread
  // until the user intentionally opens that notification in notification history.
  const dismissModal = (id) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const markRead = async (id) => {
    try {
      await axios.post(`${API}/api/notifications/${id}/read`, {}, auth);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    } finally {
      setQueue((current) => current.filter((item) => item.id !== id));
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/api/notifications/read-all`, {}, auth);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setQueue([]);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, queue, unreadCount, dismissModal, markRead, markAllRead, reload: loadNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
