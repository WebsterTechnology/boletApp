import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Same backend the web frontend talks to (frontend/.env -> VITE_API_URL)
export const API_URL = "https://boletapp-production.up.railway.app";

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default client;
