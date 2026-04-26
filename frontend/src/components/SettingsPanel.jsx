export default function SettingsPanel({
  apiKeyInput, setApiKeyInput,
  keyStatus, keyError, isValidatingKey, onValidateKey,
  suggestionPrompt, setSuggestionPrompt,
  chatPrompt, setChatPrompt,
  detailPrompt, setDetailPrompt,
  suggestionContextChars, setSuggestionContextChars,
  chatContextChars, setChatContextChars,
  detailContextChars, setDetailContextChars,
  apiOnly = false,
  settingsDirty, settingsResettable, settingsSavedFlash,
  onSaveSettings, onResetSettings,
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
        {keyError && <div className="key-error">{keyError}</div>}

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

            <label>
              Detailed answer prompt (on suggestion click)
              <textarea
                rows={4}
                value={detailPrompt}
                onChange={(e) => setDetailPrompt(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            <label>
              Suggestion context window (chars)
              <input
                type="number"
                min={100}
                max={32000}
                value={suggestionContextChars}
                onChange={(e) => setSuggestionContextChars(Math.max(100, Number(e.target.value)))}
              />
            </label>

            <label>
              Chat context window (chars)
              <input
                type="number"
                min={100}
                max={32000}
                value={chatContextChars}
                onChange={(e) => setChatContextChars(Math.max(100, Number(e.target.value)))}
              />
            </label>

            <label>
              Expanded answer context window (chars)
              <input
                type="number"
                min={100}
                max={32000}
                value={detailContextChars}
                onChange={(e) => setDetailContextChars(Math.max(100, Number(e.target.value)))}
              />
            </label>
          </>
        )}

        {!apiOnly && (
          <div className="settings-actions">
            <button
              type="button"
              className="settings-action-btn"
              disabled={!settingsResettable}
              onClick={onResetSettings}
            >
              Reset
            </button>
            <button
              type="button"
              className="settings-action-btn settings-action-save"
              disabled={!settingsDirty}
              onClick={onSaveSettings}
            >
              {settingsSavedFlash ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
