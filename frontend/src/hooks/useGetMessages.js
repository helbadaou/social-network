import fetchClient from "@/lib/api/client";
import { useEffect, useRef, useState, useCallback } from "react";

export default function useGetMessages(userID) {
  const [messages, setMessages] = useState([]);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastMessageID, setLastMessageID] = useState(0);
  const msgContainer = useRef(null);
  const [oldScroll, setOldScroll] = useState(0);

  const messagesRef = useRef(messages);
  const loadingRef = useRef(loading);
  const isDoneRef = useRef(isDone);

  const fetchMessages = async (lastMessageID) => {
    // if (isDone || loading) return;
    setLoading(true);
    try {
      setError(null);
      const res = await fetchClient("/api/chat", {
        method: "GET",
        params: {
          user_id: userID,
          ...((lastMessageID !== 0 || !lastMessageID) && {
            last_msg_id: lastMessageID,
          }),
        },
      });
      if (!res?.data?.length) {
        setIsDone(true);
        return;
      }

      res.data.reverse();

      setMessages((prev) => {
        let n = [...res.data, ...prev];
        return n;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  function handleLoadMore() {
    if (!msgContainer.current) return;

    const isAtTop = msgContainer.current.scrollTop < 20;
    if (loadingRef.current || isDoneRef.current) return;

    if (isAtTop) {
      const firstMsg = messagesRef.current[0];
      if (firstMsg) {
        setLastMessageID(firstMsg.id);
      }
    }
  }

  useEffect(() => {
    messagesRef.current = messages;
    loadingRef.current = loading;
    isDoneRef.current = isDone;
  }, [messages, loading, isDone]);

  useEffect(() => {
    const container = msgContainer.current;
    if (!container) return;

    container.addEventListener("scroll", handleLoadMore);

    return () => {
      container.removeEventListener("scroll", handleLoadMore);
    };
  }, [msgContainer.current]);

  useEffect(() => {
    if (!msgContainer.current) return;
    if (lastMessageID === 0) {
      msgContainer.current.scrollTop = msgContainer.current.scrollHeight;
    } else {
      msgContainer.current.scrollTop =
        msgContainer.current.scrollHeight - oldScroll;
    }
  }, [messages, isDone]);

  useEffect(() => {
    (async () => {
      setOldScroll(msgContainer?.current?.scrollHeight);
      await fetchMessages(lastMessageID);
    })();
  }, [lastMessageID]);

  return {
    messages,
    setMessages,
    loading,
    error,
    setLastMessageID,
    msgContainer,
    isDone,
  };
}
