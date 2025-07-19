// src/app/home/page.js
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import PostForm from "./components/PostForm";
import MessageSidebar from "./components/MessageSidebar";
import ChatBox from "./components/ChatBox";
import UserProfilePopup from "./components/UserProfilePopup";
import Post from './components/Post'

import { useUser } from "./hooks/useUser";
import { usePosts } from "./hooks/usePosts";

import Sidebar from './components/Sidebar'


export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const [showMessages, setShowMessages] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const [followStatus, setFollowStatus] = useState("");
  const [chatUsers, setChatUsers] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false)
  const [notifications, setNotifications] = useState([])

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState({}); // input per chat
  // const [ws, setWs] = useState(null)
  const fileInputRef = useRef()

  const router = useRouter();

  const ws = useRef(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;


  const setupWebSocket = useCallback(() => {
    if (!user?.ID) return;

    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      console.log('✅ WS connected');
      setIsWsConnected(true);
      reconnectAttempts.current = 0;
      ws.current = socket;
    };

    socket.onclose = (e) => {
      console.log('❌ WS disconnected', e.code, e.reason);
      setIsWsConnected(false);

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current += 1;
        setTimeout(setupWebSocket, delay);
      }
    };

    socket.onerror = (err) => {
      console.error('WS error:', err);
      setIsWsConnected(false);
    };


    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("📨 WS message received:", msg);

        if (msg.type === 'notification') {
          console.log("🔔 Notification reçue:", msg);
          setNotifications((prev) => {
            const alreadyExists = prev.some(
              (n) =>
                n.sender_id === msg.from &&
                n.message === msg.content &&
                n.type === msg.type
            );

            if (alreadyExists) return prev;

            return [
              {
                id: msg.id || `${msg.from}-${Date.now()}`,
                sender_id: msg.from,
                type: msg.type,
                message: msg.content,
                created_at: new Date().toISOString(),
              },
              ...prev,
            ];
          });
        } else if (msg.type === 'private') {
          // 💬 Message privé
          setMessages(prev => Array.isArray(prev) ? [...prev, msg] : [msg]);
        } else {
          console.warn('Unknown WS message type:', msg.type);
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    return socket;
  }, [user?.ID]);

  useEffect(() => {
    const socket = setupWebSocket();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [setupWebSocket]);

  // const sendWsMessage = useCallback((message) => {
  //   if (ws.current && ws.current.readyState === WebSocket.OPEN) {
  //     ws.current.send(JSON.stringify(message));
  //   } else {
  //     console.error('WebSocket not connected');
  //   }
  // }, []);

  // Ouverture du formulaire de posts
  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  // Ouverture de la barre latérale des messages
  const openMessages = () => {
    setShowMessages(true);
  };

  // Fermeture de la barre latérale des messages
  // const closeMessages = () => {
  //   setShowMessages(false);
  // };

  const openChat = (user) => {
    if (!openChats.some((c) => c.id === user.id)) {
      setOpenChats((prev) => [...prev, user]);
    }
  };

  useEffect(() => {
    fetchChatUsers();
    fetchUser();
  }, []);

  const fetchChatUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/chat-users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setChatUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
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
    }
  };

  const fetchUserById = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur chargement profil')
      const data = await res.json()
      setSelectedUser(data)

      const followRes = await fetch(`http://localhost:8080/api/follow/status/${userId}`, {
        credentials: 'include',
      })
      if (followRes.ok) {
        const { status } = await followRes.json()
        setFollowStatus(status)
      } else {
        setFollowStatus('')
      }

      setShowPopup(true)
    } catch (err) {
      console.error('Erreur chargement profil utilisateur:', err)
    }
  }

  // const handleFollowToggle = async () => {
  //   if (!selectedUser) return;

  //   try {
  //     const res = await fetch("http://localhost:8080/api/follow", {
  //       method: "POST",
  //       credentials: "include", // ← IMPORTANT pour le cookie session
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ followed_id: selectedUser.id }),
  //     });

  //     if (res.ok) {
  //       // Re-fetch le status
  //       const statusRes = await fetch(
  //         `http://localhost:8080/api/follow/status/${selectedUser.id}`,
  //         { credentials: "include" }
  //       );
  //       if (statusRes.ok) {
  //         const data = await statusRes.json();
  //         setFollowStatus(data.status);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Erreur lors du follow :", error);
  //   }
  // };


  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!selectedUser) return;

      try {
        const res = await fetch(
          `http://localhost:8080/api/follow/status/${selectedUser.id}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setFollowStatus(data.status);
        } else {
          setFollowStatus(""); // non abonné
        }
      } catch (err) {
        console.error("Erreur status follow :", err);
      }
    };

    fetchFollowStatus();
  }, [selectedUser]);


  const fetchPosts = () => {
    setLoading(true);
    fetch("http://localhost:8080/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error("Error fetching posts:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // src/app/home/page.js
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
        // Utiliser ceux sélectionnés par les checkboxes
        finalRecipientIds = selectedRecipientIds;
      } else if (privacy === "followers" || privacy === "private") {
        // Récupérer tous les abonnés automatiquement
        const res = await fetch("http://localhost:8080/api/recipients", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Impossible de récupérer les destinataires");
        const data = await res.json();
        finalRecipientIds = data.map((user) => user.id);
      }

      // Ajoute chaque destinataire dans le formData
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

      fetchPosts(); // recharge les posts
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };




  // const toggleProfile = () => {
  //   setShowProfile(!showProfile);
  // };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/search?query=${value}`, {
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
      const res = await fetch("http://localhost:8080/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        setShowProfile(false);
        router.push("/login");
      } else {
        throw new Error("Logout failed");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])


  // const handleUserClick = async (userId) => {
  //   try {
  //     const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
  //       credentials: "include",
  //     });
  //     if (!res.ok) throw new Error("Error loading user profile");
  //     const data = await res.json();
  //     setSelectedUser(data);

  //     const followRes = await fetch(
  //       `http://localhost:8080/api/follow/status/${userId}`,
  //       { credentials: "include" }
  //     );
  //     if (followRes.ok) {
  //       const { status } = await followRes.json();
  //       setFollowStatus(status);
  //     } else {
  //       setFollowStatus("");
  //     }
  //     setShowPopup(true);
  //   } catch (err) {
  //     console.error("Error loading profile:", err);
  //   }
  // };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
      />


      {/* MESSAGES SIDEBAR */}
      {showMessages && (
        <MessageSidebar
          chatUsers={chatUsers}
          showMessages={showMessages}
          setShowMessages={setShowMessages}
          openChat={openChat}
        />
      )}


      <div className="max-w-2xl mx-auto px-4 mt-6">
        {showPostForm && (
          <div className="max-w-2xl mx-auto px-4 mt-6">
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

      {/* Affichage des posts */}
      {posts.map((post) => (
        <Post key={post.id} post={post} fetchUserById={fetchUserById} />
      ))}


      {/* OPEN CHAT BOXES */}
      <div className="fixed bottom-4 right-4 flex gap-4 z-40">
        {openChats.map((u) => (
          <ChatBox
            key={u.id}
            recipient={u}
            currentUser={user}
            // ws={{ current: ws }}
            messages={messages}
            input={input[u.id] || ''}
            setInput={(val) => setInput(prev => ({ ...prev, [u.id]: val }))}
            onSendMessage={(message) => {
              if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify(message));
              } else {
                console.error('WebSocket not connected');
              }
            }}
            onClose={() => setOpenChats(prev => prev.filter(c => c.id !== u.id))}
          />
        ))}
      </div>

      {/* USER PROFILE POPUP */}
      {showPopup && selectedUser && (
        <UserProfilePopup
          selectedUser={selectedUser}
          currentUser={user}
          setShowPopup={setShowPopup}
          followStatus={followStatus}
          // handleFollowToggle={handleFollowToggle}
          setFollowStatus={setFollowStatus}
        />
      )}
    </div>
  )
}

