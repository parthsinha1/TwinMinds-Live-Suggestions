import { useRef, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'

export default function TranscriptPanel({
  transcriptChunks, isRecording, isTranscribing,
  canUseApi, onStart, onStop,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcriptChunks])

  return (
    <div className="panel column-panel">
      {/* Header */}
      <div className="transcript-header">
        <h2 className="panel-title">Transcript</h2>
        {isTranscribing && <span className="transcript-transcribing">transcribing…</span>}
      </div>

      {/* Recording controls */}
      <div className="transcript-controls">
        <button
          type="button"
          className={`mic-btn${isRecording ? ' mic-btn--recording' : ''}`}
          onClick={isRecording ? onStop : onStart}
          disabled={!canUseApi}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff size={22} strokeWidth={2} /> : <Mic size={22} strokeWidth={2} />}
        </button>
        <span className="panel-note" style={{ margin: 0 }}>
          {isRecording ? 'Recording...' : 'Not recording'}
        </span>
      </div>

      {/* Scrolling transcript */}
      <div className="transcript-scroll">
        {transcriptChunks.length === 0
          ? <div className="transcript-empty">Start recording to see the live transcript. Chunks commit every 30 seconds.</div>
          : transcriptChunks.map((chunk) => (
            <p key={chunk.id} className="transcript-chunk">
              <small>{new Date(chunk.ts).toLocaleTimeString()}:</small> {chunk.text}
            </p>
          ))
        }
        <div ref={endRef} />
      </div>
    </div>
  )
}
