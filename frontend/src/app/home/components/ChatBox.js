'use client'

import { useEffect, useRef, useState } from 'react'

export default function ChatBox({ currentUser, recipient, onSendMessage, messages, input, setInput, onClose }) {
  const scrollRef = useRef()
  const [chatHistory, setChatHistory] = useState([])
  const [allMessages, setAllMessages] = useState([])

  // Support both recipient.id and recipient.ID for compatibility
  const recipientId = recipient.id || recipient.ID
  const userId = currentUser?.ID

  // Load chat history only once when chat opens
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/chat/history?with=${recipientId}`, {
          credentials: 'include'
        });

        if (!res.ok) {
          throw new Error('Failed to load chat history');
        }

        const history = await res.json();
        const validHistory = Array.isArray(history) ? history.filter(msg => msg && msg.content) : [];
        setChatHistory(validHistory);
        setAllMessages(validHistory); // Initialize with history
      } catch (err) {
        console.error('Error loading chat history:', err);
        setChatHistory([]);
        setAllMessages([]);
      }
    };

    if (recipientId && userId) {
      loadChatHistory();
    }
  }, [recipientId, userId]);

  // Handle new real-time messages
  useEffect(() => {
    if (!messages || !Array.isArray(messages)) return;

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
  }, [messages, userId, recipientId]);

  const handleSend = () => {
    if (!input.trim()) return
    if (!userId || !recipientId) return

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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [allMessages])

  return (
    <div className="w-96 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col">
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
        {allMessages.length === 0 ? (
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
          className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-l px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button
          className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-r text-sm disabled:opacity-50"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}