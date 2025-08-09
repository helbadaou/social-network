'use client'

import { useEffect, useRef, useState } from 'react'
import EmojiPicker from '../../home/components/Emoji'
import styles from './ChatBox.module.css'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages, input, setInput, onClose }) {
  const scrollRef = useRef()
  const inputRef = useRef()
  const [chatHistory, setChatHistory] = useState([])
  const [allMessages, setAllMessages] = useState([])
  const [chatError, setChatError] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  useEffect(() => {
    const loadChatHistory = async () => {
      setChatError('')
      try {
        const res = await fetch(`http://localhost:8080/api/chat/history?with=${recipientId}`, {
          credentials: 'include'
        })

        if (!res.ok) {
          if (res.status === 403) {
            setChatError('Vous ne pouvez pas discuter avec cet utilisateur. Vous devez vous suivre mutuellement.')
            setChatHistory([])
            setAllMessages([])
            return
          }
          const errorText = await res.text()
          throw new Error(errorText || 'Failed to load chat history')
        }

        const history = await res.json()
        const validHistory = Array.isArray(history) ? history.filter(msg => msg && msg.content) : []
        setChatHistory(validHistory)
        setAllMessages(validHistory)
      } catch (err) {
        console.error('Error loading chat history:', err)
        setChatHistory([])
        setAllMessages([])
        setChatError('Erreur lors du chargement de l\'historique du chat')
      }
    }

    if (recipientId && userId) {
      loadChatHistory()
    }
  }, [recipientId, userId, messages])

  useEffect(() => {
    if (!messages || !Array.isArray(messages) || chatError) return

    const relevantMessages = messages.filter(msg =>
      (msg.from === userId && msg.to === recipientId) ||
      (msg.to === userId && msg.from === recipientId)
    )

    if (relevantMessages.length === 0) return

    setAllMessages(prevMessages => {
      const existingIds = new Set(
        prevMessages.map(msg => `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`)
      )

      const newMessages = relevantMessages.filter(msg => {
        const msgId = `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`
        return !existingIds.has(msgId)
      })

      if (newMessages.length === 0) return prevMessages

      return [...prevMessages, ...newMessages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      )
    })
  }, [messages, userId, recipientId, chatError])

  const handleSend = () => {
    if (!input.trim() || !userId || !recipientId || chatError) return

    const msg = {
      from: userId,
      to: recipientId,
      content: input.trim(),
      type: 'private',
      timestamp: new Date().toISOString()
    }

    onSendMessage(msg)
    setInput('')
  }

  const handleEmojiSelect = (emoji) => {
    const cursorPos = inputRef.current?.selectionStart || input.length
    const textBefore = input.substring(0, cursorPos)
    const textAfter = input.substring(cursorPos)
    const newText = textBefore + emoji + textAfter

    setInput(newText)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length)
      }
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!chatError) {
        handleSend()
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [allMessages])

  const renderMessageContent = (content) => {
    return content
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.recipientName}>{recipient.full_name}</span>
        <button
          className={styles.closeButton}
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      <div className={styles.messagesContainer}>
        {chatError ? (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>🚫</div>
            <p className={styles.errorMessage}>{chatError}</p>
            <p className={styles.errorHint}>
              Pour pouvoir discuter, vous devez vous suivre mutuellement.
            </p>
          </div>
        ) : allMessages.length === 0 ? (
          <p className={styles.emptyMessage}>No messages yet...</p>
        ) : (
          allMessages.map((m, i) => (
            <div
              key={`${m.from}-${m.to}-${m.timestamp}-${i}`}
              className={`${styles.messageBubble} ${m.from === userId ? styles.messageRight : styles.messageLeft}`}
            >
              <div className={`${styles.messageContent} ${m.from === userId ? styles.sentMessage : styles.receivedMessage}`}>
                <div className={styles.messageMeta}>
                  {m.from === userId ? 'Vous' : recipient.full_name}
                </div>
                {renderMessageContent(m.content)}
                <div className={styles.messageTime}>
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      <div className={styles.inputContainer}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.inputField} ${chatError ? styles.inputFieldDisabled : ''}`}
          value={input}
          onChange={(e) => !chatError && setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chatError ? "Chat non autorisé" : "Type a message..."}
          disabled={!!chatError}
        />

        {!chatError && (
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={styles.emojiButton}
            title="Ajouter un emoji"
          >
            😊
          </button>
        )}

        <button
          className={`${styles.sendButton} ${chatError || !input.trim() ? styles.sendButtonDisabled : styles.sendButtonActive}`}
          onClick={handleSend}
          disabled={!!chatError || !input.trim()}
        >
          Envoyer
        </button>
      </div>

      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  )
}