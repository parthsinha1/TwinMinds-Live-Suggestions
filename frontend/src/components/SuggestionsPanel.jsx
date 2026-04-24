export default function SuggestionsPanel({ suggestionBatches, onSuggestionClick }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Live suggestions</h2>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Newest batch appears on top.</div>
      <div style={{ maxHeight: 420, overflow: 'auto', display: 'grid', gap: 10 }}>
        {suggestionBatches.length === 0 && <div>No suggestions yet.</div>}
        {suggestionBatches.map((batch) => (
          <div key={batch.id} style={{ border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              Batch time: {new Date(batch.ts).toLocaleTimeString()}
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {batch.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSuggestionClick(item)}
                  style={{ textAlign: 'left', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                >
                  <strong>{item.kind}</strong>
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
