export default function SettingsPanel({
  apiKeyInput, setApiKeyInput,
  keyStatus, isValidatingKey, onValidateKey,
  suggestionPrompt, setSuggestionPrompt,
  chatPrompt, setChatPrompt,
}) {
  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        <label>
          Groq API key
          <input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your Groq key"
            style={{ width: '100%' }}
          />
        </label>
        <button type="button" onClick={onValidateKey} disabled={isValidatingKey}>
          {isValidatingKey ? 'Validating...' : 'Validate key'}
        </button>
        <div style={{ fontSize: 13 }}>Key status: {keyStatus}</div>

        <label>
          Suggestion prompt
          <textarea
            rows={4}
            value={suggestionPrompt}
            onChange={(e) => setSuggestionPrompt(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>

        <label>
          Chat prompt
          <textarea
            rows={4}
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>
      </div>
    </section>
  )
}
