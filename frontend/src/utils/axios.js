import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const instance = axios.create({
  baseURL: API,
});

// 🔥 GLOBAL 401 HANDLER (VERY IMPORTANT)
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // ❌ user deleted or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("userPoints");

      alert("Session expired. Please login again.");

      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default instance;