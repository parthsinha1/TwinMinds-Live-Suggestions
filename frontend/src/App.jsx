import { useEffect, useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { checkHealth, chat, suggestions, transcribe, validateKey } from './lib/api'
import SettingsPanel from './components/SettingsPanel'
import TranscriptPanel from './components/TranscriptPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import ChatPanel from './components/ChatPanel'
import './App.css'

const DEFAULT_SUGGESTION_PROMPT =
  'You are a live conversation copilot. Based on what the speaker just said, generate exactly 3 suggestions that reflect or extend what was spoken. Do NOT give external advice, tips, or facts. Instead: rephrase what the speaker said as a talking point they could share, ask a question directly about what they described, or seek clarification on something they mentioned. Everything must come directly from the transcript, not from outside knowledge.'

const DEFAULT_CHAT_PROMPT =
  'You are a helpful meeting copilot. Answer in 2-3 short paragraphs maximum. Be direct and concise. No unnecessary preamble or padding. Target 100-300 words'

const DEFAULT_DETAIL_PROMPT =
  'You are a helpful meeting copilot. The user clicked a suggestion from a live conversation. Give a focused, actionable response grounded in the transcript. Be direct, no filler, and no unnecessary length. Avoid repetitive template wording across turns and keep phrasing natural and practical. Give enough depth to be immediately usable in a live conversation. Target 180-360 words.'

const DEFAULT_SETTINGS = {
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
  detailPrompt: DEFAULT_DETAIL_PROMPT,
  suggestionContextChars: 2000,
  chatContextChars: 6000,
  detailContextChars: 4000,
}

const CHUNK_MS = 30000

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
  const [detailPrompt, setDetailPrompt] = useState(DEFAULT_DETAIL_PROMPT)
  const [suggestionContextChars, setSuggestionContextChars] = useState(2000)
  const [chatContextChars, setChatContextChars] = useState(6000)
  const [detailContextChars, setDetailContextChars] = useState(4000)

  const [errorText, setErrorText] = useState('')
  const [keyError, setKeyError] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS)
  const [settingsSavedFlash, setSettingsSavedFlash] = useState(false)

  const settingsDirty =
    suggestionPrompt !== savedSettings.suggestionPrompt ||
    chatPrompt !== savedSettings.chatPrompt ||
    detailPrompt !== savedSettings.detailPrompt ||
    suggestionContextChars !== savedSettings.suggestionContextChars ||
    chatContextChars !== savedSettings.chatContextChars ||
    detailContextChars !== savedSettings.detailContextChars

  const settingsResettable =
    suggestionPrompt !== DEFAULT_SETTINGS.suggestionPrompt ||
    chatPrompt !== DEFAULT_SETTINGS.chatPrompt ||
    detailPrompt !== DEFAULT_SETTINGS.detailPrompt ||
    suggestionContextChars !== DEFAULT_SETTINGS.suggestionContextChars ||
    chatContextChars !== DEFAULT_SETTINGS.chatContextChars ||
    detailContextChars !== DEFAULT_SETTINGS.detailContextChars

  function onSaveSettings() {
    setSavedSettings({ suggestionPrompt, chatPrompt, detailPrompt, suggestionContextChars, chatContextChars, detailContextChars })
    setSettingsSavedFlash(true)
    setTimeout(() => setSettingsSavedFlash(false), 2000)
  }

  function onResetSettings() {
    setSuggestionPrompt(DEFAULT_SETTINGS.suggestionPrompt)
    setChatPrompt(DEFAULT_SETTINGS.chatPrompt)
    setDetailPrompt(DEFAULT_SETTINGS.detailPrompt)
    setSuggestionContextChars(DEFAULT_SETTINGS.suggestionContextChars)
    setChatContextChars(DEFAULT_SETTINGS.chatContextChars)
    setDetailContextChars(DEFAULT_SETTINGS.detailContextChars)
  }

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const segmentTimerRef = useRef(null)
  const shouldRecordRef = useRef(false)
  const transcriptChunksRef = useRef([])

  useEffect(() => {
    const tryHealth = () =>
      checkHealth()
        .then((data) => {
          if (data?.ok) {
            setHealthStatus('connected')
          } else {
            setHealthStatus('unexpected response')
          }
        })
        .catch(() => {
          // retry once after 20s cuz render cold starts around 50s
          setTimeout(() => {
            checkHealth()
              .then((data) => {
                if (data?.ok) setHealthStatus('connected')
                else setHealthStatus('unexpected response')
              })
              .catch(() => setHealthStatus('backend unreachable'))
          }, 20000)
        })
    tryHealth()
  }, [])

  const transcriptContext = useMemo(() => {
    const full = transcriptChunks.map((x) => x.text).join('\n').trim()
    return full.slice(-chatContextChars)
  }, [transcriptChunks, chatContextChars])

  async function onValidateKey() {
    if (!apiKeyInput.trim()) {
      setKeyStatus('enter key first')
      return
    }

    setIsValidatingKey(true)
    setErrorText('')
    setKeyError('')
    try {
      const data = await validateKey(apiKeyInput.trim())
      if (data?.valid) {
        setApiKey(apiKeyInput.trim())
        setKeyStatus('valid')
        setShowSettings(false)
      } else {
        setApiKey('')
        setKeyStatus('invalid')
        setKeyError('Invalid API key. Please check and try again.')
      }
    } catch (error) {
      setApiKey('')
      setKeyStatus('invalid')
      setKeyError(error?.response?.data?.detail || error.message || 'Invalid API key.')
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

      const nextChunks = [...transcriptChunksRef.current, { id: idNow('tx'), ts: isoNow(), text }]
      transcriptChunksRef.current = nextChunks
      setTranscriptChunks(nextChunks)
      const nextContext = nextChunks.map((x) => x.text).join('\n').trim().slice(-suggestionContextChars)

      // Only request suggestions when there's enough content for the model to work with
      const wordCount = text.trim().split(/\s+/).length
      if (autoSuggest && wordCount >= 8) {
        await requestSuggestions(nextContext)
      }
    } catch (error) {
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsTranscribing(false)
    }
  }

  function clearSegmentTimer() {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current)
      segmentTimerRef.current = null
    }
  }

  function startRecordingSegment() {
    const stream = streamRef.current
    if (!stream) {
      return
    }

    const supportsOpus = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    const recorder = supportsOpus
      ? new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      : new MediaRecorder(stream)

    const parts = []

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        parts.push(event.data)
      }
    }

    recorder.onstop = async () => {
      const blobType = recorder.mimeType || parts[0]?.type || 'audio/webm'
      const blob = new Blob(parts, { type: blobType })

      // Start the next segment immediately so no audio is lost while transcription runs
      if (shouldRecordRef.current && streamRef.current) {
        startRecordingSegment()
      }

      if (blob.size > 0) {
        await processAudioChunk(blob, true)
      }
    }

    recorderRef.current = recorder
    recorder.start()

    clearSegmentTimer()
    segmentTimerRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
      }
    }, CHUNK_MS)
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
      streamRef.current = stream
      shouldRecordRef.current = true
      startRecordingSegment()
      setIsRecording(true)
    } catch (error) {
      setErrorText(error?.message || 'Could not access microphone')
    }
  }

  function stopRecording() {
    shouldRecordRef.current = false
    clearSegmentTimer()

    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
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
      await requestSuggestions()
    } catch (error) {
      setErrorText(error?.response?.data?.detail || error.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function sendChat(userText, suggestionId = null, options = {}) {
    const { exactText = false, promptOverride = null, contextOverride = null, maxTokens = 500 } = options
    if (!apiKey) {
      setErrorText('Validate API key first')
      return
    }
    const rawText = String(userText ?? '')
    if (!rawText.trim()) {
      return
    }
    const text = exactText ? rawText : rawText.trim()

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
        transcript_context: contextOverride ?? transcriptContext,
        chat_prompt: promptOverride ?? chatPrompt,
        history: priorHistory,
        user_input: text,
        suggestion_id: suggestionId,
        max_tokens: maxTokens,
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
    const detailContext = transcriptChunks.map((x) => x.text).join('\n').trim().slice(-detailContextChars)
    const resolvedPrompt = detailPrompt
      .replace(/\{\{kind\}\}/g, item.kind || '')
      .replace(/\{\{preview\}\}/g, item.preview || '')
    sendChat(item.preview, item.id, {
      exactText: true,
      promptOverride: resolvedPrompt,
      contextOverride: detailContext,
      maxTokens: 800,
    })
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
  const showOnboarding = !canUseApi

  return (
    <div className="app-shell">
      <div className="app-header-row">
        <div>
          <h1 className="app-title">TwinMind Live Suggestions</h1>
          {!showOnboarding && (
          <p className="app-health">
            App status:
            <span className="status-pill">{healthStatus}</span>
          </p>
          )}
        </div>

        {!showOnboarding && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="button-secondary" onClick={exportSession} aria-label="Export session">
              <Download size={15} strokeWidth={2.2} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Export
            </button>
            <button type="button" className="button-secondary" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </div>
        )}
      </div>

      {!showOnboarding && (
        <section className="columns">
          <TranscriptPanel
            transcriptChunks={transcriptChunks}
            isRecording={isRecording} isTranscribing={isTranscribing}
            canUseApi={canUseApi}
            onStart={startRecording} onStop={stopRecording}
          />
          <SuggestionsPanel
            suggestionBatches={suggestionBatches}
            onSuggestionClick={onSuggestionClick}
            isRefreshing={isRefreshing}
            canUseApi={canUseApi}
            onRefresh={onManualRefresh}
          />
          <ChatPanel
            chatHistory={chatHistory}
            chatInput={chatInput} setChatInput={setChatInput}
            isSendingChat={isSendingChat} canUseApi={canUseApi}
            onSubmit={onChatSubmit}
          />
        </section>
      )}

      {(showOnboarding || showSettings) && (
        <div className="settings-backdrop" role="dialog" aria-modal="true" aria-label="Settings window">
          <div className="settings-modal panel">
            <div className="settings-modal-header">
              <h2 className="panel-title" style={{ margin: 0 }}>
                {showOnboarding ? 'Connect Groq API Key' : 'Settings'}
              </h2>
              {!showOnboarding && (
                <button type="button" className="settings-close-x" onClick={() => setShowSettings(false)} aria-label="Close settings">
                  ✕
                </button>
              )}
            </div>

            <SettingsPanel
              apiKeyInput={apiKeyInput} setApiKeyInput={setApiKeyInput}
              keyStatus={keyStatus} keyError={keyError} isValidatingKey={isValidatingKey} onValidateKey={onValidateKey}
              suggestionPrompt={suggestionPrompt} setSuggestionPrompt={setSuggestionPrompt}
              chatPrompt={chatPrompt} setChatPrompt={setChatPrompt}
              detailPrompt={detailPrompt} setDetailPrompt={setDetailPrompt}
              suggestionContextChars={suggestionContextChars} setSuggestionContextChars={setSuggestionContextChars}
              chatContextChars={chatContextChars} setChatContextChars={setChatContextChars}
              detailContextChars={detailContextChars} setDetailContextChars={setDetailContextChars}
              apiOnly={showOnboarding}
              settingsDirty={settingsDirty}
              settingsResettable={settingsResettable}
              settingsSavedFlash={settingsSavedFlash}
              onSaveSettings={onSaveSettings}
              onResetSettings={onResetSettings}
            />
          </div>
        </div>
      )}

      {errorText && (
        <div className="app-error">
          {errorText}
        </div>
      )}
    </div>
  )
}

export default App
