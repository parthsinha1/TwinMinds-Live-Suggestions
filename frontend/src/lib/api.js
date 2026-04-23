import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export default api;
