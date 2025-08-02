'use client'

import { useEffect, useRef, useState } from 'react'
import EmojiPicker from '../../home/components/Emoji'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages, input, setInput, onClose }) {
  const scrollRef = useRef()
  const inputRef = useRef()
  const [chatHistory, setChatHistory] = useState([])
  const [allMessages, setAllMessages] = useState([])
  const [chatError, setChatError] = useState('') // Nouvel état pour les erreurs
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  // Load chat history only once when chat opens
  useEffect(() => {
    const loadChatHistory = async () => {
      setChatError('') // Reset error state
      try {
        const res = await fetch(`http://localhost:8080/api/chat/history?with=${recipientId}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          if (res.status === 403) {
            setChatError('Vous ne pouvez pas discuter avec cet utilisateur. Vous devez vous suivre mutuellement.')
            setChatHistory([])
            setAllMessages([])
            return
          }
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to load chat history');
        }

        const history = await res.json();
        const validHistory = Array.isArray(history) ? history.filter(msg => msg && msg.content) : [];
        setChatHistory(validHistory);
        setAllMessages(validHistory); // Initialize with history
      } catch (err) {
        console.error('Error loading chat history:', err);
        setChatHistory([]);
        setAllMessages([]);
        setChatError('Erreur lors du chargement de l\'historique du chat')
      }
    };

    if (recipientId && userId) {
      loadChatHistory();
    }
  }, [recipientId, userId, messages]);

  // Handle new real-time messages
  useEffect(() => {
    if (!messages || !Array.isArray(messages) || chatError) return;

    // Filter messages for this specific chat
    const relevantMessages = messages.filter(msg =>
      (msg.from === userId && msg.to === recipientId) ||
      (msg.to === userId && msg.from === recipientId)
    );

    if (relevantMessages.length === 0) return;

    setAllMessages(prevMessages => {
      const existingIds = new Set(
        prevMessages.map(msg => `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`)
      );

      const newMessages = relevantMessages.filter(msg => {
        const msgId = `${msg.from}-${msg.to}-${msg.timestamp}-${msg.content}`;
        return !existingIds.has(msgId);
      });

      if (newMessages.length === 0) return prevMessages;

      return [...prevMessages, ...newMessages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
  }, [messages, userId, recipientId, chatError]);

  const handleSend = () => {
    if (!input.trim()) return
    if (!userId || !recipientId) return
    if (chatError) return // Empêcher l'envoi si il y a une erreur

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

    // Remettre le focus et positionner le curseur après l'emoji
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [allMessages])

  // Fonction pour détecter et rendre les emojis dans les messages
  const renderMessageContent = (content) => {
    // Cette fonction peut être étendue pour détecter d'autres éléments comme les liens
    return content
  }

  return (
    <div className="w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col relative">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-white">{recipient.full_name}</span>
        <button
          className="text-red-400 text-xs hover:text-red-300"
          onClick={onClose}
        >
          ✖
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-[60vh] min-h-[300px] overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
        {chatError ? (
          <div className="text-center p-4">
            <div className="text-red-400 mb-2">🚫</div>
            <p className="text-red-400 text-sm">{chatError}</p>
            <p className="text-gray-500 text-xs mt-2">
              Pour pouvoir discuter, vous devez vous suivre mutuellement.
            </p>
          </div>
        ) : allMessages.length === 0 ? (
          <p className="text-gray-500 italic">No messages yet...</p>
        ) : (
          allMessages.map((m, i) => (
            <div
              key={`${m.from}-${m.to}-${m.timestamp}-${i}`}
              className={`mb-2 ${m.from === userId ? 'text-right' : 'text-left'}`}
            >
              <div className={`inline-block px-3 py-1 rounded-lg max-w-[80%] break-words ${m.from === userId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200'
                }`}>
                <div className="text-xs opacity-70 mb-1">
                  {m.from === userId ? 'Vous' : recipient.full_name}
                </div>
                {renderMessageContent(m.content)}
                <div className="text-xs opacity-70 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input avec support emoji */}
      <div className="flex relative">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            className={`w-full border text-white rounded-l px-2 py-1 pr-8 text-sm focus:outline-none ${chatError
              ? 'bg-gray-600 border-gray-500 cursor-not-allowed'
              : 'bg-gray-700 border-gray-600 focus:border-blue-500'
              }`}
            value={input}
            onChange={(e) => !chatError && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatError ? "Chat non autorisé" : "Type a message..."}
            disabled={!!chatError}
          />

          {/* Bouton emoji */}
          {!chatError && (
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-yellow-400 text-sm"
              title="Ajouter un emoji"
            >
              😊
            </button>
          )}
        </div>

        <button
          className={`ml-2 px-3 rounded-r text-sm ${chatError || !input.trim()
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          onClick={handleSend}
          disabled={!!chatError || !input.trim()}
        >
          Envoyer
        </button>
      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  )
}