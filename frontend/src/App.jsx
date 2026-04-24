import { useEffect, useMemo, useRef, useState } from 'react'
import { checkHealth, chat, suggestions, transcribe, validateKey } from './lib/api'
import SettingsPanel from './components/SettingsPanel'
import TranscriptPanel from './components/TranscriptPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import ChatPanel from './components/ChatPanel'
import './App.css'

const DEFAULT_SUGGESTION_PROMPT =
  'You are a live meeting copilot. Generate exactly 3 useful suggestions based on recent transcript context. Mix between question to ask, fact-check, and clarification when appropriate. Keep previews short and practical.'

const DEFAULT_CHAT_PROMPT =
  'You are a helpful meeting copilot. Give actionable, concise, context-aware answers based on transcript and chat history. If context is insufficient, say what is missing.'

const isoNow = () => new Date().toISOString()
const idNow = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function App() {
  const [healthStatus, setHealthStatus] = useState('checking...')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState('not validated')

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSendingChat, setIsSendingChat] = useState(false)

  const [transcriptChunks, setTranscriptChunks] = useState([])
  const [suggestionBatches, setSuggestionBatches] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')

  const [suggestionPrompt, setSuggestionPrompt] = useState(DEFAULT_SUGGESTION_PROMPT)
  const [chatPrompt, setChatPrompt] = useState(DEFAULT_CHAT_PROMPT)

  const [errorText, setErrorText] = useState('')

  const recorderRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    checkHealth()
      .then((data) => {
        if (data?.ok) {
          setHealthStatus('connected')
        } else {
          setHealthStatus('unexpected response')
        }
      })
      .catch((error) => {
        setHealthStatus('backend unreachable')
        console.error('Health check failed:', error?.response?.data || error.message)
      })
  }, [])

  const transcriptContext = useMemo(() => {
    const full = transcriptChunks.map((x) => x.text).join('\n').trim()
    return full.slice(-5000)
  }, [transcriptChunks])

  async function onValidateKey() {
    if (!apiKeyInput.trim()) {
      setKeyStatus('enter key first')
      return
    }

    setIsValidatingKey(true)
    setErrorText('')
    try {
      const data = await validateKey(apiKeyInput.trim())
      if (data?.valid) {
        setApiKey(apiKeyInput.trim())
        setKeyStatus('valid')
      } else {
        setApiKey('')
        setKeyStatus('invalid')
      }
    } catch (error) {
      setApiKey('')
      setKeyStatus('invalid')
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsValidatingKey(false)
    }
  }

  async function requestSuggestions(contextOverride) {
    if (!apiKey) {
      setErrorText('Validate API key first')
      return
    }

    const context = (contextOverride ?? transcriptContext).trim()
    if (!context) {
      return
    }

    const payload = {
      transcript_context: context,
      suggestion_prompt: suggestionPrompt,
    }

    const data = await suggestions(apiKey, payload)
    if (data?.batch) {
      setSuggestionBatches((prev) => [data.batch, ...prev])
    }
  }

  async function processAudioChunk(blob, autoSuggest = true) {
    if (!apiKey) {
      return
    }
    if (!blob || blob.size === 0) {
      return
    }

    setIsTranscribing(true)
    setErrorText('')
    try {
      const file = new File([blob], `chunk-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      })
      const data = await transcribe(apiKey, file)
      const text = String(data?.text || '').trim()
      if (!text) {
        return
      }

      let nextContext = ''
      setTranscriptChunks((prev) => {
        const next = [...prev, { id: idNow('tx'), ts: isoNow(), text }]
        nextContext = next.map((x) => x.text).join('\n').trim().slice(-5000)
        return next
      })

      if (autoSuggest) {
        await requestSuggestions(nextContext)
      }
    } catch (error) {
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsTranscribing(false)
    }
  }

  async function startRecording() {
    if (!apiKey) {
      setErrorText('Validate API key first')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorText('Browser does not support microphone capture')
      return
    }

    setErrorText('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)

      recorder.ondataavailable = async (event) => {
        await processAudioChunk(event.data, true)
      }

      recorderRef.current = recorder
      streamRef.current = stream
      recorder.start(30000)
      setIsRecording(true)
    } catch (error) {
      setErrorText(error?.message || 'Could not access microphone')
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    recorderRef.current = null
    streamRef.current = null
    setIsRecording(false)
  }

  async function onManualRefresh() {
    setIsRefreshing(true)
    setErrorText('')
    try {
      const recorder = recorderRef.current
      if (recorder && recorder.state === 'recording') {
        recorder.requestData()
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
      await requestSuggestions()
    } catch (error) {
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function sendChat(userText, suggestionId = null) {
    if (!apiKey) {
      setErrorText('Validate API key first')
      return
    }
    const text = userText.trim()
    if (!text) {
      return
    }

    const priorHistory = chatHistory
    const userMessage = {
      id: idNow('chat-user'),
      ts: isoNow(),
      role: 'user',
      content: text,
      suggestion_id: suggestionId,
    }
    setChatHistory((prev) => [...prev, userMessage])
    setIsSendingChat(true)
    setErrorText('')

    try {
      const payload = {
        transcript_context: transcriptContext,
        chat_prompt: chatPrompt,
        history: priorHistory,
        user_input: text,
        suggestion_id: suggestionId,
      }

      const data = await chat(apiKey, payload)
      if (data?.message) {
        setChatHistory((prev) => [...prev, data.message])
      }
    } catch (error) {
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsSendingChat(false)
    }
  }

  function onChatSubmit(event) {
    event.preventDefault()
    const text = chatInput
    setChatInput('')
    sendChat(text)
  }

  function onSuggestionClick(item) {
    sendChat(item.preview, item.id)
  }

  function exportSession() {
    const session = {
      exported_at: isoNow(),
      transcript: transcriptChunks,
      suggestion_batches: suggestionBatches,
      chat_history: chatHistory,
    }
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twinmind-session-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canUseApi = Boolean(apiKey)

  return (
    <div style={{ padding: 20, display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>TwinMind Live Suggestions</h1>
      <div style={{ fontSize: 14 }}>Backend health: <strong>{healthStatus}</strong></div>

      <SettingsPanel
        apiKeyInput={apiKeyInput} setApiKeyInput={setApiKeyInput}
        keyStatus={keyStatus} isValidatingKey={isValidatingKey} onValidateKey={onValidateKey}
        suggestionPrompt={suggestionPrompt} setSuggestionPrompt={setSuggestionPrompt}
        chatPrompt={chatPrompt} setChatPrompt={setChatPrompt}
      />

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'start' }}>
        <TranscriptPanel
          transcriptChunks={transcriptChunks}
          isRecording={isRecording} isTranscribing={isTranscribing} isRefreshing={isRefreshing}
          canUseApi={canUseApi}
          onStart={startRecording} onStop={stopRecording}
          onRefresh={onManualRefresh} onExport={exportSession}
        />
        <SuggestionsPanel
          suggestionBatches={suggestionBatches}
          onSuggestionClick={onSuggestionClick}
        />
        <ChatPanel
          chatHistory={chatHistory}
          chatInput={chatInput} setChatInput={setChatInput}
          isSendingChat={isSendingChat} canUseApi={canUseApi}
          onSubmit={onChatSubmit}
        />
      </section>

      {errorText && (
        <div style={{ border: '1px solid #cc0000', color: '#cc0000', borderRadius: 8, padding: 10 }}>
          {errorText}
        </div>
      )}
    </div>
  )
}

export default App
