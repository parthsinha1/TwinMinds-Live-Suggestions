import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

export async function checkHealth() {
  const response = await api.get("/health")
  return response.data
}

export async function validateKey(apiKey) {
  const response = await api.post("/validate-key", {}, { headers: { Authorization: `Bearer ${apiKey}` } })
  return response.data
}

export async function suggestions(apiKey, payload) {
  const response = await api.post("/suggestions", payload, { headers: { Authorization: `Bearer ${apiKey}` } })
  return response.data
  
}

export async function chat(apiKey, payload) {
  const response = await api.post("/chat", payload, { headers: { Authorization: `Bearer ${apiKey}` } })
  return response.data
}

export async function transcribe(apiKey, file) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post("/transcribe", formData, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return response.data
}
