import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

export async function checkHealth() {
  const response = await api.get("/health", { timeout: 60000 })
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

export async function chatStream(apiKey, payload, onChunk, onDone, onError) {
  const baseURL = import.meta.env.VITE_API_BASE_URL
  try {
    const response = await fetch(`${baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      onError(data?.detail || `Error ${response.status}`)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data.trim() === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { onError(parsed.error); return }
          if (parsed.content) onChunk(parsed.content)
        } catch { /* ignore parse errors */ }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message)
  }
}

export async function transcribe(apiKey, file) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post("/transcribe", formData, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return response.data
}
