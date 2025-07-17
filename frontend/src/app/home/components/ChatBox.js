'use client'

import { useEffect, useRef } from 'react'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages, input, setInput, onClose }) {
  const scrollRef = useRef()

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  const chatMessages = Array.isArray(messages)
    ? messages.filter(msg =>
      (msg.from === userId && msg.to === recipientId) ||
      (msg.to === userId && msg.from === recipientId)
    )
    : []

  // Filter messages for this chat
  const handleSend = () => {
    if (!input.trim()) return
    if (!userId || !recipientId) return

    const msg = {
      from: userId,
      to: recipientId,
      content: input,
      type: 'private',
      timestamp: new Date().toISOString()
    }

    onSendMessage(msg)
    setInput('')
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  return (
    <div className="w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-white">{recipient.full_name}</span>
        <button
          className="text-red-400 text-xs"
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500 italic">No messages yet...</p>
        ) : (
          chatMessages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 ${m.from === userId ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block px-3 py-1 rounded-lg ${m.from === userId ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
                }`}>
                {m.content}
                <div className="text-xs opacity-70 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="flex">
        <input
          type="text"
          className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-l px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button
          className="ml-2 bg-blue-600 text-white px-3 rounded-r text-sm"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}
