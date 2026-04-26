export default function SettingsPanel({
  apiKeyInput, setApiKeyInput,
  keyStatus, isValidatingKey, onValidateKey,
  suggestionPrompt, setSuggestionPrompt,
  chatPrompt, setChatPrompt,
  apiOnly = false,
}) {
  return (
    <section>
      <div className="stack-sm">
        <label>
          Groq API key
          <input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your Groq key"
          />
        </label>
        <button type="button" onClick={onValidateKey} disabled={isValidatingKey}>
          {isValidatingKey ? 'Validating...' : 'Validate key'}
        </button>
        <div className="panel-note">Key status: {keyStatus}</div>

        {!apiOnly && (
          <>
            <label>
              Suggestion prompt
              <textarea
                rows={4}
                value={suggestionPrompt}
                onChange={(e) => setSuggestionPrompt(e.target.value)}
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
          </>
        )}
      </div>
    </section>
  )
}
