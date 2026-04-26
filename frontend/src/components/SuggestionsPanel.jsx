import { RefreshCw } from 'lucide-react'

export default function SuggestionsPanel({ suggestionBatches, onSuggestionClick, isRefreshing, canUseApi, onRefresh }) {
  return (
    <div className="panel column-panel">
      {/* Header */}
      <div className="transcript-header">
        <div className="suggestions-header-left">
          <h2 className="panel-title">Live suggestions</h2>
          <span className="panel-note suggestions-note">Newest batch appears on top.</span>
        </div>
        <div className="suggestions-header-right">
          {isRefreshing && <span className="transcript-transcribing">refreshing…</span>}
          <button className="button-secondary refresh-btn" type="button" onClick={onRefresh} disabled={!canUseApi || isRefreshing}>
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Suggestions scroll */}
      <div className="transcript-scroll stack-md">
        {suggestionBatches.length === 0
          ? <div className="transcript-empty">Start recording to see live suggestions. They refresh every ~30 seconds.</div>
          : suggestionBatches.map((batch) => (
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
                    <span className="chip-kind">{item.kind.replace(/_/g, ' ')}</span>
                    <div>{item.preview}</div>
                  </button>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
