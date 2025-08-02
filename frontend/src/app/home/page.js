// src/app/home/page.js
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import PostForm from "./components/PostForm";
import MessageSidebar from "../messages/components/MessageSidebar";
import ChatBox from "../messages/components/ChatBox";
import UserProfilePopup from "./components/UserProfilePopup";
import Post from './components/Post'

export default function HomePage() {
  // ... autres états existants ...
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
  const [realtimeNotification, setRealtimeNotification] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Nouvelle référence pour stocker le callback de suppression de notifications
  const removeNotificationCallback = useRef(null);

  // États WebSocket améliorés
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState({});
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const fileInputRef = useRef()

  const router = useRouter();

  // Configuration WebSocket améliorée
  const setupWebSocket = useCallback(() => {
    if (!user?.ID) return;

    // Fermer la connexion existante si elle existe
    if (ws.current) {
      ws.current.close();
    }

    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      console.log('✅ WebSocket connected');
      reconnectAttempts.current = 0;
      ws.current = socket;
    };

    socket.onclose = (e) => {
      console.log('❌ WebSocket disconnected', e.code, e.reason);
      ws.current = null;

      // Reconnexion automatique si ce n'est pas une fermeture volontaire
      if (e.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current += 1;
        console.log(`🔄 Tentative de reconnexion ${reconnectAttempts.current}/${maxReconnectAttempts} dans ${delay}ms`);
        setTimeout(setupWebSocket, delay);
      }
    };

    socket.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Gestion des messages d'erreur du serveur
        if (msg.type === "error") {
          console.error("Erreur WebSocket:", msg.content);
          showNotification("error", msg.content);
          return;
        }

        // Gérer les mises à jour de statut de suivi
        if (msg.type === "follow_status_update") {
          console.log("📡 Mise à jour statut de suivi reçue");
          // Rafraîchir la liste des utilisateurs de chat
          fetchChatUsers();
          return;
        }

        // Check if notification has expected fields
        if (msg.type === "notification" || msg.type === "follow_request" || 
            msg.type === "follow_request_response" || msg.type === "follow_request_cancelled") {
          setNotifications(prev => [msg, ...prev]);
          setUnreadCount(prev => prev + 1);
          setRealtimeNotification(msg);
        } else if (msg.type === 'private') {
          console.log("💬 Message privé reçu:", msg);
          // Ajouter le message avec un timestamp unique pour éviter les doublons
          const messageWithId = {
            ...msg,
            uniqueId: `${msg.from}-${msg.to}-${msg.timestamp}-${Date.now()}`
          };
          setMessages(prev => {
            const existing = prev.find(m =>
              m.from === msg.from &&
              m.to === msg.to &&
              m.content === msg.content &&
              Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 1000
            );

            if (existing) {
              console.log("Message déjà existant, ignoré");
              return prev;
            }

            return [...prev, messageWithId];
          });
        } else {
          console.warn('Type de message WebSocket inconnu:', msg.type);
        }
      } catch (err) {
        console.error('Erreur parsing message WebSocket:', err);
      }
    };

    return socket;
  }, [user?.ID]);

  // Fonction utilitaire pour afficher les notifications
  const showNotification = (type, message) => {
    if (type === "error") {
      alert(`❌ Erreur: ${message}`);
    } else {
      alert(`ℹ️ ${message}`);
    }
  };

  // Initialiser WebSocket quand l'utilisateur est chargé
  useEffect(() => {
    if (user?.ID) {
      const socket = setupWebSocket();
      return () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Component unmounting');
        }
      };
    }
  }, [user?.ID]);

  // Nettoyage à la fermeture du composant
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Page closing');
      }
    };
  }, []);

  // Fonction pour envoyer un message WebSocket
  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log("📤 Envoi message WebSocket:", message);
      ws.current.send(JSON.stringify(message));

      // Ajouter immédiatement le message à l'état local pour feedback instantané
      const messageWithId = {
        ...message,
        uniqueId: `${message.from}-${message.to}-${message.timestamp}-${Date.now()}-sent`
      };

      setMessages(prev => {
        // Éviter d'ajouter si déjà présent
        const exists = prev.some(m =>
          m.from === message.from &&
          m.to === message.to &&
          m.content === message.content &&
          Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 1000
        );

        if (exists) return prev;
        return [...prev, messageWithId];
      });
    } else {
      console.error('❌ WebSocket non connecté, impossible d\'envoyer le message');
      showNotification("error", "Connexion WebSocket fermée. Impossible d'envoyer le message.");
    }
  }, []);

  // ✅ Fonction pour recevoir le callback de suppression depuis Navbar
  const handleNotificationRemoved = useCallback((removeCallback) => {
    removeNotificationCallback.current = removeCallback;
  }, []);

  // ✅ Fonction pour supprimer une notification (appelée depuis UserProfilePopup)
  const onNotificationRemoved = useCallback((criteria) => {
    if (removeNotificationCallback.current) {
      removeNotificationCallback.current(criteria);
    }
  }, []);

  // Fonctions existantes...
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

  // Charger les données initiales
  useEffect(() => {
    fetchChatUsers();
    fetchUser();
    fetchPosts();
  }, []);

  const fetchChatUsers = async () => {
    try {
      // console.log("🔄 Rechargement de la liste des utilisateurs de chat...");
      const res = await fetch("http://localhost:8080/api/chat-users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setChatUsers(data);
      // console.log("✅ Liste des utilisateurs de chat mise à jour:", data);
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

  const fetchPosts = () => {
    setLoading(true);
    fetch("http://localhost:8080/api/posts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setPosts(data))
      .catch((err) => console.error("Error fetching posts:", err))
      .finally(() => setLoading(false));
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
      // Fermer WebSocket avant logout
      if (ws.current) {
        ws.current.close(1000, 'User logging out');
      }

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

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={false} // ✅ on affiche les icônes
        hideSearch={false}
        onNotificationRemoved={handleNotificationRemoved} // ✅ Passer le callback
      />

      {/* MESSAGES SIDEBAR */}
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
      <h2 className="text-xl font-bold mb-4"></h2>
      {posts.length === 0 ? (
        <p className="text-gray-400 text-sm">Aucun post à afficher.</p>
      ) : (
        posts.map(post => (
          <Post key={post.id} post={post} fetchUserById={fetchUserById} />
        ))
      )}

      {/* CHAT BOXES */}
      <div className="fixed bottom-4 right-4 flex gap-4 z-40">
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

      {/* USER PROFILE POPUP */}
      {showPopup && selectedUser && (
        <UserProfilePopup
          selectedUser={selectedUser}
          currentUser={user}
          setShowPopup={setShowPopup}
          followStatus={followStatus}
          setFollowStatus={setFollowStatus}
          fetchChatUsers={fetchChatUsers}
          realtimeNotification={realtimeNotification} // ✅ Passer les notifications
          onNotificationRemoved={onNotificationRemoved} // ✅ Passer le callback
        />
      )}
    </div>
  )
}