// src/app/home/hooks/useChat.js
import { useState, useEffect, useRef } from 'react'

export default function useChat(currentUser, recipient) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const ws = useRef(null)

  useEffect(() => {
    if (currentUser && recipient) {
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

  return { messages, input, setInput, sendMessage }
}
