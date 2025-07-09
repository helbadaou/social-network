"use client";

import useGetGroupMessages from "@/hooks/useGetGroupMessages";
import styles from "./chat.module.css";
import useGetGroup from "@/hooks/useGetGroup";
import useGetProfile from "@/hooks/useGetProfile";
import { useWs } from "@/providers/WsProvider";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import EmojiPicker from './EmojiPicker';

const Message = ({ msg, isMe }) => {
  const { profile, loading } = useGetProfile(msg.senderId);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className={`${styles.message} ${
        isMe ? styles.user_message : styles.other_message
      }`}
    >
      <div
        className={`${styles.message_content} ${
          isMe ? styles.user_content : styles.other_content
        }`}
      >
        <p>{msg.message}</p>
        <span className={styles.detail}>{`${
          isMe 
            ? "You"
            : profile?.nickname 
              ? "@" + profile.nickname 
              : profile?.firstname && profile?.lastname 
                ? profile.firstname + " " + profile.lastname 
                : "Unknown User"
        } - ${formatDate(new Date(msg.sentAt))}`}</span>
      </div>
    </div>
  );
};

export default function GroupChat({ groupId }) {
  const router = useRouter();
  const {
    group,
    loading: groupLoading,
    error: groupError,
  } = useGetGroup(groupId);
  const { user } = useAuth();
  const { messages, setMessages, loading, error, msgContainer, isDone } =
    useGetGroupMessages(groupId);
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
      console.log("GroupChat handler received:", data);
      if (data.type === "groupMessage" && data.data.group === Number(groupId)) {
        console.log("Adding new message:", data.data);
        const wasAtBottom = isScrolledToBottom();
        const newMessage = {
          id: Date.now(),
          senderId: data.data.senderId || user.id,
          groupId: data.data.group,
          message: data.data.message,
          sentAt: data.data.timestamp
        };
        setMessages((prev) => [...prev, newMessage]);
        
        // If user was at bottom, scroll to bottom after message is added
        if (wasAtBottom) {
          setTimeout(scrollToBottom, 0);
        }
      }
    };
    
    console.log("Registering message handler");
    registerNewMsgHandler(handler);
    
    return () => {
      registerNewMsgHandler(null);
    };
  }, [groupId, user.id]);

  function handleTyping(e) {
    e.preventDefault();
    setNewMsg(e.target.value);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!newMsg.trim() || isSending) return;

    setIsSending(true);
    let msg = {
      type: "groupMessage",
      data: {
        group: Number(groupId),
        message: newMsg.trim(),
        senderId: user.id
      },
    };
    console.log("Sending message:", msg);
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

  return groupLoading ? (
    <p>Loading...</p>
  ) : groupError ? (
    <p>{groupError}</p>
  ) : (
    <div className={styles.chat_container}>
      <div className={styles.chat_header}>
        <button 
          className={styles.back_button}
          onClick={() => router.push(`/groups/${groupId}`)}
          aria-label="Back to group"
        >
          ←
        </button>
        <div className={styles.chat_header_info}>
          <h2>{group.title}</h2>
          <span className={styles.chat_header_status}>
            {group.members?.length || 0} members
          </span>
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