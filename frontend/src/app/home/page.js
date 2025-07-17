// src/app/home/page.js
"use client";

import { useEffect, useState, useRef } from "react";
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

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState({}); // input per chat
  const [ws, setWs] = useState(null)
  const fileInputRef = useRef()

  const router = useRouter();


  useEffect(() => {
    if (!user) return;

    const socket = new WebSocket('ws://localhost:8080/ws')
    socket.onopen = () => console.log('✅ WS connected')
    socket.onclose = () => console.log('❌ WS disconnected')
    socket.onerror = (err) => {
      console.error('WS error:', err, JSON.stringify(err));
    };


    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      console.log("messages", messages)
      messages != null ? setMessages(prev => { return [...prev, msg] }) : setMessages([msg])
    }

    setWs(socket)
    return () => socket.close()
  }, [user])

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
  const handleSubmit = async (e) => {
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
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
        credentials: "include", // important pour les cookies Go
      });

      if (!res.ok) throw new Error("Erreur lors de la publication");

      setSuccess("✅ Post publié !");
      setContent("");
      setImage(null);
      setPrivacy("public");

      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

      fetchPosts(); // Recharge les posts après publication
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
            ws={{ current: ws }}
            messages={messages}
            input={input[u.id] || ''}
            setInput={val => setInput(prev => ({ ...prev, [u.id]: val }))}
            onClose={() => setOpenChats(openChats.filter((c) => c.id !== u.id))}
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

