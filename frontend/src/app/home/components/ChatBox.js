// src/app/home/components/ChatBox.js
'use client'

import { useState, useEffect, useRef } from 'react'

export default function ChatBox({ currentUser, recipient, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const ws = useRef(null)

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8080/ws')

    ws.current.onopen = () => {
      console.log('✅ WebSocket connected')
    }

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (
        (msg.from === currentUser.ID && msg.to === recipient.ID) ||
        (msg.from === recipient.ID && msg.to === currentUser.ID)
      ) {
        setMessages((prev) => [...prev, msg])
      }
    }

    ws.current.onclose = () => {
      console.log('❌ WebSocket disconnected')
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [recipient.ID, currentUser.ID])

  const sendMessage = () => {
    if (input.trim()) {
      const messageObj = {
        from: currentUser.ID,
        to: recipient.ID,
        content: input,
        type: 'private',
      }

      ws.current.send(JSON.stringify(messageObj))
      setMessages((prev) => [...prev, messageObj])
      setInput('')
    }
  }

  return (
    <div className="w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-white">{recipient.full_name}</span>
        <button className="text-red-400 text-xs" onClick={onClose}>✖</button>
      </div>
      <div className="h-32 overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 italic">Aucun message pour le moment...</p>
        ) : (
          messages.map((m, idx) => (
            <p key={idx} className={`mb-1 ${m.from === currentUser.ID ? 'text-right text-blue-400' : 'text-left text-gray-300'}`}>
              {m.content}
            </p>
          ))
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          placeholder="Écrire un message..."
          className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-l px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
        />
        <button className="bg-blue-600 text-white px-2 rounded-r text-sm" onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  )
}
