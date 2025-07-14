'use client'

import { useEffect, useRef } from 'react'

export default function ChatBox({ currentUser, recipient, ws, messages, input, setInput, onClose }) {
  const scrollRef = useRef()

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  let chatMessages
  console.log("is array",Array.isArray(messages))
  
  if (Array.isArray(messages)) {
    chatMessages = messages.filter(
      (msg) => {
        console.log(userId);
        console.log(recipientId);

        return (msg.from === userId && msg.to === recipientId) ||
          (msg.to === userId && msg.from === recipientId)
      }

    )
  }
  console.log("chat message", chatMessages)
  // Filter messages for this chat


  const sendMessage = () => {
    if (!input.trim()) return
    if (!userId || !recipientId) return

    const msg = {
      from: userId,
      to: recipientId,
      content: input,
      type: 'private',
    }

    ws.current.send(JSON.stringify(msg))
    setInput('')
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  return (
    <div className="w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col">
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
      <div className="h-32 overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
        {chatMessages?.length === 0 ? (
          <p className="text-gray-500 italic">Aucun message...</p>
        ) : (
          chatMessages && chatMessages.map((m, i) => (
            <p
              key={i}
              className={`mb-1 ${m.from === userId
                ? 'text-right text-blue-400'
                : 'text-left text-gray-300'
                }`}
            >
              {m.content}
            </p>
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
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
          placeholder="Écrire un message..."
        />
        <button
          className="bg-blue-600 text-white px-3 rounded-r text-sm"
          onClick={sendMessage}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}
