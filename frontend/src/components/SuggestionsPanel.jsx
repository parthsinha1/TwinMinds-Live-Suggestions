export default function SuggestionsPanel({ suggestionBatches, onSuggestionClick }) {
  return (
    <div className="panel column-panel">
      <h2 className="panel-title">Live suggestions</h2>
      <div className="panel-note">Newest batch appears on top.</div>
      <div className="surface-scroll stack-md" style={{ maxHeight: 420 }}>
        {suggestionBatches.length === 0 && <div>No suggestions yet.</div>}
        {suggestionBatches.map((batch) => (
          <div key={batch.id} className="suggestion-batch">
            <div className="batch-time">
              Batch time: {new Date(batch.ts).toLocaleTimeString()}
            </div>
            <div className="stack-sm">
              {batch.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSuggestionClick(item)}
                  className="suggestion-button"
                >
                  <span className="chip-kind">{item.kind}</span>
                  <div>{item.preview}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
