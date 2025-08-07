"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import PostForm from "./components/PostForm";
import MessageSidebar from "../messages/components/MessageSidebar";
import ChatBox from "../messages/components/ChatBox";
import Post from './components/Post'
import styles from './HomePage.module.css'

export default function HomePage() {
  // States for posts, user, UI, etc.
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const [showMessages, setShowMessages] = useState(false);
  const [chatUsers, setChatUsers] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [realtimeNotification, setRealtimeNotification] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0);

  const removeNotificationCallback = useRef(null);

  // --- SharedWorker related ---
  const workerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState({});

  const router = useRouter();

  // Setup SharedWorker connection once user is set
  useEffect(() => {
    if (!user?.ID) return;

    if (!workerRef.current) {
      workerRef.current = new SharedWorker('/sharedWorker.js');
      const port = workerRef.current.port;

      port.start();
      port.postMessage({ type: "INIT", userId: user.ID });

      port.onmessage = (event) => {
        const { type, message } = event.data;
        if (type === "message"  || type ===  "private") {
          setMessages((prev) => [...prev, message]);
        }

        if (type === "notification" || type === "follow_request" ||
          type === "follow_request_response" || type === "follow_request_cancelled") {
          setNotifications(prev => [message, ...prev]);
          setUnreadCount(prev => prev + 1);
          setRealtimeNotification(message);
        }

        if (type === "status" || type === "error") {
          console.log(`[Worker]: ${message}`);
        }
      };
    }

    // Cleanup on unmount or user change
    return () => {
      workerRef.current?.port?.close();
      workerRef.current = null;
    };
  }, [user?.ID]);

  // Send chat message through SharedWorker
  const sendMessage = useCallback((chatMsg) => {
    if (!workerRef.current) {
      console.error("SharedWorker not initialized.");
      return;
    }

    workerRef.current.port.postMessage({ type: "SEND", message: chatMsg });

    // Optimistic update for sent message:
    const messageWithId = {
      ...chatMsg,
      uniqueId: `${chatMsg.from}-${chatMsg.to}-${chatMsg.timestamp}-${Date.now()}-sent`
    };

    setMessages(prev => {
      // Avoid duplicates if very close timestamp
      const exists = prev.some(m =>
        m.from === chatMsg.from &&
        m.to === chatMsg.to &&
        m.content === chatMsg.content &&
        Math.abs(new Date(m.timestamp) - new Date(chatMsg.timestamp)) < 1000
      );

      if (exists) return prev;
      return [...prev, messageWithId];
    });
  }, []);

  const handleNotificationRemoved = useCallback((removeCallback) => {
    removeNotificationCallback.current = removeCallback;
  }, []);

  const onNotificationRemoved = useCallback((criteria) => {
    if (removeNotificationCallback.current) {
      removeNotificationCallback.current(criteria);
    }
  }, []);

  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  const openMessages = () => {
    setShowMessages(true);
  };

  const openChat = (user) => {
    if (!openChats.some((c) => (c.id || c.ID) === (user.id || user.ID))) {
      setOpenChats((prev) => [...prev, user]);
    }
  };

  useEffect(() => {
    fetchChatUsers();
    fetchUser();
    fetchPosts();
  }, []);

  const fetchChatUsers = async () => {
    // try {
    //   const res = await fetch("http://localhost:8080/api/chat-users", {
    //     credentials: "include",
    //   });
    //   if (!res.ok) throw new Error("Failed to fetch users");
    //   const data = await res.json();
    //   //setChatUsers(data);
    // } catch (err) {
    //   console.error("Error fetching users:", err);
    // }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/profile", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Unauthorized");

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Error loading profile:", err);
      router.push("/login");
    }
  };

  const fetchPosts = () => {
    setLoading(true);
    fetch("http://localhost:8080/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error("Error fetching posts:", err))
      .finally(() => setLoading(false));
  };

  const fetchUserById = async (userId) => {
    router.push(`/profile/${userId}`);
  };

  const handleSubmit = async (e, selectedRecipientIds = []) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("privacy", privacy);
    if (image) {
      formData.append("image", image);
    }

    try {
      let finalRecipientIds = [];

      if (privacy === "custom") {
        finalRecipientIds = selectedRecipientIds;
      } else if (privacy === "followers" || privacy === "private") {
        const res = await fetch("http://localhost:8080/api/recipients", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Impossible de récupérer les destinataires");
        const data = await res.json();
        finalRecipientIds = data.map((user) => user.id);
      }

      finalRecipientIds.forEach(id => {
        formData.append("recipient_ids", id);
      });

      const res = await fetch("http://localhost:8080/api/posts", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erreur lors de la publication");

      setSuccess("✅ Post publié !");
      setContent("");
      setImage(null);
      setPrivacy("public");

      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

      fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/api/search?query=${value}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to search users");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Error searching users:", err);
      }
    } else {
      setResults([]);
    }
  };

  const handleLogout = async () => {
    try {
      if (workerRef.current) {
        workerRef.current.port.close();
        workerRef.current = null;
      }

      const res = await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        router.push("/login");
      } else {
        throw new Error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const fileInputRef = useRef();

  return (
    <div className={styles.pageContainer}>
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        onNotificationRemoved={onNotificationRemoved}
        fetchUserById={fetchUserById}
        setSearch={setSearch}
        setResults={setResults}
      />

      {showMessages && user && (
        <MessageSidebar
          chatUsers={chatUsers}
          showMessages={showMessages}
          setShowMessages={setShowMessages}
          openChat={openChat}
          currentUserId={user.ID}
          fetchChatUsers={fetchChatUsers}
        />
      )}

      <div className={styles.postFormContainer}>
        {showPostForm && (
          <div className={styles.postFormWrapper}>
            <PostForm
              content={content}
              setContent={setContent}
              image={image}
              setImage={setImage}
              privacy={privacy}
              setPrivacy={setPrivacy}
              handleSubmit={handleSubmit}
              creating={creating}
              ref={fileInputRef}
            />
          </div>
        )}
      </div>

      <h2 className={styles.postsHeading}></h2>
      {posts === null ? (
        <p className={styles.noPosts}>Aucun post à afficher.</p>
      ) : (
        posts.map(post => (
          <Post key={post.id} post={post} fetchUserById={fetchUserById} />
        ))
      )}
      <div className={styles.chatBoxContainer}>
        {openChats.map((u) => (
          <ChatBox
            key={u.id || u.ID}
            recipient={u}
            currentUser={user}
            messages={messages}
            input={input[u.id || u.ID] || ''}
            setInput={(val) => setInput(prev => ({ ...prev, [u.id || u.ID]: val }))}
            onSendMessage={sendMessage}
            onClose={() => setOpenChats(prev => prev.filter(c => (c.id || c.ID) !== (u.id || u.ID)))}
          />
        ))}
      </div>
    </div>
  )
}