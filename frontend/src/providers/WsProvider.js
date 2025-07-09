"use client";

import { usePathname } from "next/navigation";
import { useToast } from "./ToastProvider";

const {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} = require("react");

const WsContext = createContext();

export function useWs() {
  const context = useContext(WsContext);
  if (context === undefined) {
    throw new Error("useWs must be used within a WsProvider");
  }
  return context;
}

export function WsProvider({ children }) {
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const handleNewMsg = useRef(null);
  const pathname = usePathname();

  const toast = useToast();

  const connect = async () => {
    setError(null);
    setIsConnected(false);
    try {
      const newWs = new WebSocket(
        `ws://localhost:8000/ws?token=${localStorage.getItem("token")}`
      );
      newWs.onopen = () => {
        setIsConnected(true);
        setWs(newWs);
      };
      newWs.onclose = () => {
        console.log("closed");
        setIsConnected(false);
        setWs(null);
      };
      newWs.onerror = (event) => {
        console.log(event);
      };
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const send_msg = (msg) => {
    if (ws) {
      ws.send(JSON.stringify(msg));
    }
  };

  const registerNewMsgHandler = (callback) => {
    console.log("registerNewMsgHandler", callback);
    handleNewMsg.current = callback;
  };

  useEffect(() => {
    if (!isConnected) {
      connect();
      return;
    }

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      console.log("WebSocket message received:", data);
      switch (data.type) {
        case "notification":
          {
            if (
              data.data.notification.type === "MESSAGE" &&
              pathname.startsWith("/chats/") &&
              pathname.slice("/chats/".length, pathname.length) ===
                data.data.notification.targetId.toString()
            ) {
              return;
            }
            if (data.data.notification.type === "GROUP_INVITE") {
              toast.info(data.data.notification.content);
            } else {
              toast.success(data.data.notification.content);
            }
          }
          break;
        case "privateMessage":
        case "groupMessage":
          {
            console.log(
              "Message received, calling handler:",
              handleNewMsg.current
            );
            if (handleNewMsg.current) {
              handleNewMsg.current(data);
            }
          }
          break;
      }
    };
  }, [ws, handleNewMsg.current]);

  const value = {
    ws,
    isConnected,
    send_msg,
    registerNewMsgHandler,
  };

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}
