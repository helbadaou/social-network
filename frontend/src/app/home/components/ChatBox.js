'use client'

import { useEffect, useRef, useState } from 'react'

export default function ChatBox({ currentUser, recipient, ws, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  const scrollRef = useRef()

  // Listen for incoming messages and filter by sender/receiver
  useEffect(() => {
    const handleMessage = (event) => {
      const msg = JSON.parse(event.data)

      // Show only if it's between currentUser and this recipient
      if (
        (msg.from === currentUser.ID && msg.to === recipient.ID) ||
        (msg.to === currentUser.ID && msg.from === recipient.ID)
      ) {
        setMessages(prev => [...prev, msg])
      }
    }

    if (ws.current) {
      ws.current.addEventListener('message', handleMessage)
    }

    return () => {
      if (ws.current) {
        ws.current.removeEventListener('message', handleMessage)
      }
    }
  }, [ws, currentUser.ID, recipient.ID])

  const sendMessage = () => {
    if (!input.trim()) return

    const msg = {
      from: currentUser.ID,
      to: recipient.ID,
      content: input,
      type: 'private',
    }

    ws.current.send(JSON.stringify(msg))
  
    setInput('')
  }

  useEffect(() => {
    // Auto scroll to bottom
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        {messages.length === 0 ? (
          <p className="text-gray-500 italic">Aucun message...</p>
        ) : (
          messages.map((m, i) => (
            <p
              key={i}
              className={`mb-1 ${m.from === currentUser.ID
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
