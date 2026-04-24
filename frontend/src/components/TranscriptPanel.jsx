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
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Transcript</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {!isRecording ? (
          <button type="button" onClick={onStart} disabled={!canUseApi}>Start mic</button>
        ) : (
          <button type="button" onClick={onStop}>Stop mic</button>
        )}
        <button type="button" onClick={onRefresh} disabled={!canUseApi || isRefreshing}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <button type="button" onClick={onExport}>Export</button>
      </div>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        {isRecording ? 'Recording...' : 'Not recording'}{isTranscribing ? ' | transcribing...' : ''}
      </div>
      <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
        {transcriptChunks.length === 0 && <div>No transcript yet.</div>}
        {transcriptChunks.map((chunk) => (
          <p key={chunk.id} style={{ margin: '0 0 8px 0' }}>
            <small>{new Date(chunk.ts).toLocaleTimeString()}:</small> {chunk.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
