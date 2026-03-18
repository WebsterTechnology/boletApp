import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const instance = axios.create({
  baseURL: API,
});

/* ================= REQUEST INTERCEPTOR ================= */
// 🔐 Automatically attach token to every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= RESPONSE INTERCEPTOR ================= */
// 🔥 GLOBAL 401 HANDLER
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Prevent multiple alerts
      if (!window.__logoutTriggered) {
        window.__logoutTriggered = true;

        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userPoints");

        alert("Session expired. Please login again.");

        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default instance;