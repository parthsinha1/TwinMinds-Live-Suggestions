import { useRef, useEffect } from 'react'

export default function TranscriptPanel({
  transcriptChunks, isRecording, isTranscribing, isRefreshing,
  canUseApi, onStart, onStop, onRefresh, onExport,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptChunks])

  return (
    <div className="panel column-panel">
      <h2 className="panel-title">Transcript</h2>
      <div className="button-row" style={{ marginBottom: 10 }}>
        {!isRecording ? (
          <button type="button" onClick={onStart} disabled={!canUseApi}>Start mic</button>
        ) : (
          <button type="button" onClick={onStop}>Stop mic</button>
        )}
        <button className="button-secondary" type="button" onClick={onRefresh} disabled={!canUseApi || isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <button className="button-secondary" type="button" onClick={onExport}>Export</button>
      </div>
      <div className="panel-note">
        {isRecording ? 'Recording...' : 'Not recording'}{isTranscribing ? ' | transcribing...' : ''}
      </div>
      <div className="surface-scroll" style={{ maxHeight: 320 }}>
        {transcriptChunks.length === 0 && <div>No transcript yet.</div>}
        {transcriptChunks.map((chunk) => (
          <p key={chunk.id} style={{ margin: '0 0 8px' }}>
            <small>{new Date(chunk.ts).toLocaleTimeString()}:</small> {chunk.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
