"use client";

import useGetMessages from "@/hooks/useGetMessages";
import styles from "./chat.module.css";
import useGetProfile from "@/hooks/useGetProfile";
import { useWs } from "@/providers/WsProvider";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import EmojiPicker from './EmojiPicker';

const Message = ({ msg, sender, isMe }) => {
  const formattedTime = formatDate(new Date(msg.createdAt));
  const senderName = sender.nickname 
    ? `@${sender.nickname}`
    : `${sender.firstname} ${sender.lastname}`;

  return (
    <div className={`${styles.message} ${isMe ? styles.user_message : styles.other_message}`}>
      <div className={`${styles.message_content} ${isMe ? styles.user_content : styles.other_content}`}>
        <p>{msg.message}</p>
        <div className={styles.detail}>
          <span className={styles.sender}>{senderName}</span>
          <span className={styles.time}>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};

export default function Chat({ userId }) {
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useGetProfile(userId);
  const { user } = useAuth();
  const { messages, setMessages, loading, error, msgContainer, isDone } =
    useGetMessages(userId);
  const [newMsg, setNewMsg] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { send_msg, registerNewMsgHandler } = useWs();

  // Function to check if scroll is at bottom
  const isScrolledToBottom = () => {
    if (!msgContainer.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = msgContainer.current;
    return Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
  };

  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (msgContainer.current) {
      msgContainer.current.scrollTop = msgContainer.current.scrollHeight;
    }
  };

  // Scroll to bottom when all messages are loaded
  useEffect(() => {
    if (isDone && msgContainer.current && messages.length > 0) {
      // Add a small delay to ensure messages are rendered
      const timer = setTimeout(() => {
        if (msgContainer.current.scrollHeight > 0) {
          scrollToBottom();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDone, messages]);

  // Also scroll to bottom on initial mount if messages exist
  useEffect(() => {
    if (msgContainer.current && messages.length > 0) {
      const timer = setTimeout(() => {
        if (msgContainer.current.scrollHeight > 0) {
          scrollToBottom();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handler = (data) => {
      if (data.type === "privateMessage") {
        const wasAtBottom = isScrolledToBottom();
        setMessages((prev) => [...prev, data.data]);
        
        // If user was at bottom, scroll to bottom after message is added
        if (wasAtBottom) {
          setTimeout(scrollToBottom, 0);
        }
      }
    };
    
    registerNewMsgHandler(handler);
    return () => registerNewMsgHandler(null);
  }, []);

  function handleTyping(e) {
    e.preventDefault();
    setNewMsg(e.target.value);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMsg.trim() || isSending) return;

    setIsSending(true);
    let msg = {
      type: "privateMessage",
      data: {
        receiver: profile.id,
        message: newMsg.trim(),
      },
    };
    try {
      await send_msg(msg);
      setNewMsg("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMsg((prev) => prev + emoji);
  };

  return profileLoading ? (
    <div className={styles.loading}>Loading...</div>
  ) : profileError ? (
    <div className={styles.error}>{profileError}</div>
  ) : (
    <div className={styles.chat_container}>
      <div className={styles.chat_header}>
        <button 
          className={styles.back_button}
          onClick={() => router.push('/chats')}
          aria-label="Back to chats"
        >
          ←
        </button>
        <div className={styles.chat_header_info}>
          <h2>{`${profile.firstname} ${profile.lastname}`}</h2>
          {profile.nickname && (
            <span className={styles.chat_header_status}>
              @{profile.nickname}
            </span>
          )}
        </div>
      </div>

      <div className={styles.chat_body} ref={msgContainer}>
        {loading ? (
          <div className={styles.loading}>Loading messages...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : messages.length === 0 ? (
          <div className={styles.empty_state}>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          messages.map((msg) => (
            <Message
              msg={msg}
              key={msg.id}
              sender={user.id === msg.senderId ? user : profile}
              isMe={user.id === msg.senderId}
            />
          ))
        )}
      </div>

      <form className={styles.input_container} onSubmit={handleSend}>
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <input
          type="text"
          placeholder="Type a message..."
          className={styles.input}
          value={newMsg}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <button
          type="submit"
          className={`${styles.send_button} ${isSending ? styles.sending : ''}`}
          disabled={isSending}
        >
          {isSending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
