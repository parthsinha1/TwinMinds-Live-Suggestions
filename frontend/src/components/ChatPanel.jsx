import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, SendHorizontal } from 'lucide-react'
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

  function renderComposer() {
    const canSend = !isSendingChat && canUseApi && chatInput.trim().length > 0
    return (
      <form onSubmit={onSubmit} className="composer-row">
        <textarea
          rows={1}
          value={chatInput}
          onChange={e => {
            setChatInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit(e);
            }
          }}
          placeholder="Type a question"
          style={{ overflow: 'hidden', resize: 'none' }}
        />
        <button
          type="submit"
          className={`send-btn${canSend ? ' send-btn--active' : ''}`}
          disabled={!canSend}
          aria-label="Send message"
        >
          <SendHorizontal size={18} />
        </button>
      </form>
    )
  }

  return (
    <>
      <div className="panel column-panel">
        {/* header */}
        <div className="transcript-header">
          <h2 className="panel-title">Chat</h2>
          <button
            type="button"
            className="button-secondary chat-expand-btn"
            onClick={() => setIsFullscreen(true)}
            aria-label="Open fullscreen chat"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* messages scroll */}
        <div className="transcript-scroll chat-scroll">
          {chatHistory.length === 0
            ? <div className="transcript-empty">Click any suggestion for a detailed answer, or type your own question about the conversation.</div>
            : chatHistory.map((msg) => (
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
        </div>

        {/* composer */}
        {renderComposer()}
      </div>

      {isFullscreen && (
        <div className="chat-fullscreen-backdrop" role="dialog" aria-modal="true" aria-label="Fullscreen chat">
          <div className="panel chat-fullscreen-panel">
            <div className="transcript-header">
              <h2 className="panel-title">Chat (Focused View)</h2>
              <button
                type="button"
                className="button-secondary chat-expand-btn"
                onClick={() => setIsFullscreen(false)}
                aria-label="Close fullscreen chat"
              >
                <Minimize2 size={15} />
              </button>
            </div>
            <div className="chat-fullscreen-content">
              {chatHistory.map((msg) => (
                <div key={msg.id} className="chat-row">
                  <div className="chat-meta">
                    <span className="chat-role">{msg.role}</span>
                    <span>@ {new Date(msg.ts).toLocaleTimeString()}</span>
                  </div>
                  <div className="chat-content markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
            {renderComposer()}
          </div>
        </div>
      )}
    </>
  )
}
