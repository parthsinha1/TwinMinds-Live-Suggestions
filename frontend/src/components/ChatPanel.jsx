import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatPanel({ chatHistory, chatInput, setChatInput, isSendingChat, canUseApi, onSubmit }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullscreen])

  function renderMessages() {
    if (chatHistory.length === 0) {
      return <div>No messages yet.</div>
    }

    return chatHistory.map((msg) => (
      <div key={msg.id} className="chat-row">
        <div className="chat-meta">
          <span className="chat-role">{msg.role}</span>
          <span>@ {new Date(msg.ts).toLocaleTimeString()}</span>
        </div>
        <div className="chat-content markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      </div>
    ))
  }

  function renderComposer() {
    return (
      <form onSubmit={onSubmit} className="stack-sm">
        <textarea
          rows={1}
          value={chatInput}
          onChange={e => {
            setChatInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="Type a question"
          style={{ overflow: 'hidden', resize: 'none' }}
        />
        <button type="submit" disabled={isSendingChat || !canUseApi}>
          {isSendingChat ? 'Sending...' : 'Send'}
        </button>
      </form>
    )
  }

  return (
    <>
      <div className="panel column-panel">
        <div className="chat-header">
          <h2 className="panel-title">Chat</h2>
          <button
            type="button"
            className="button-secondary chat-expand-btn"
            onClick={() => setIsFullscreen(true)}
            aria-label="Open fullscreen chat"
          >
            Fullscreen
          </button>
        </div>
        <div className="surface-scroll chat-scroll" style={{ marginBottom: 10 }}>
          {renderMessages()}
        </div>
        {renderComposer()}
      </div>

      {isFullscreen && (
        <div className="chat-fullscreen-backdrop" role="dialog" aria-modal="true" aria-label="Fullscreen chat">
          <div className="panel chat-fullscreen-panel">
            <div className="chat-header">
              <h2 className="panel-title">Chat (Focused View)</h2>
              <button
                type="button"
                className="button-secondary chat-expand-btn"
                onClick={() => setIsFullscreen(false)}
                aria-label="Close fullscreen chat"
              >
                Close
              </button>
            </div>
            <div className="chat-fullscreen-content">{renderMessages()}</div>
            {renderComposer()}
          </div>
        </div>
      )}
    </>
  )
}
