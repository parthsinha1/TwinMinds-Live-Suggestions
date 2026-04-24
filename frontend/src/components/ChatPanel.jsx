export default function ChatPanel({ chatHistory, chatInput, setChatInput, isSendingChat, canUseApi, onSubmit }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Chat</h2>
      <div style={{ maxHeight: 340, overflow: 'auto', border: '1px solid #eee', padding: 8, marginBottom: 10 }}>
        {chatHistory.length === 0 && <div>No messages yet.</div>}
        {chatHistory.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12 }}>
              <strong>{msg.role}</strong> @ {new Date(msg.ts).toLocaleTimeString()}
            </div>
            <div>{msg.content}</div>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Type a question"
        />
        <button type="submit" disabled={isSendingChat || !canUseApi}>
          {isSendingChat ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
