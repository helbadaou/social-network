// src/app/home/page.js
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./components/Navbar";
import PostForm from "./components/PostForm";
import MessageSidebar from "./components/MessageSidebar";
import ChatBox from "./components/ChatBox";
import UserProfilePopup from "./components/UserProfilePopup";
import { useUser } from "./hooks/useUser";
import { usePosts } from "./hooks/usePosts";
import useChat from "./hooks/useChat";

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

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const ws = useRef(null);

  const router = useRouter();

  // Ouverture de la barre latérale des messages
  const openMessages = () => {
    setShowMessages(true);
  };

  // Fermeture de la barre latérale des messages
  const closeMessages = () => {
    setShowMessages(false);
  };

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
    if (image) formData.append("image", image);

    try {
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
      fetchPosts();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

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

  const handleUserClick = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error loading user profile");
      const data = await res.json();
      setSelectedUser(data);

      const followRes = await fetch(
        `http://localhost:8080/api/follow/status/${userId}`,
        { credentials: "include" }
      );
      if (followRes.ok) {
        const { status } = await followRes.json();
        setFollowStatus(status);
      } else {
        setFollowStatus("");
      }
      setShowPopup(true);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
      />

      {/* MESSAGE ICON */}
      <button onClick={openMessages} className="relative">
        <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
      </button>

      {/* MESSAGES SIDEBAR */}
      {showMessages && (
        <MessageSidebar chatUsers={chatUsers} setShowMessages={closeMessages} />
      )}

      <PostForm
        content={content}
        setContent={setContent}
        image={image}
        setImage={setImage}
        privacy={privacy}
        setPrivacy={setPrivacy}
        handleSubmit={handleSubmit}
        creating={creating}
      />
      {/* Affichage des posts */}
      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-400">Aucun post pour le moment.</p>
      ) : (
        posts.map((post, i) => (
          <div
            key={i}
            className="bg-gray-800 shadow rounded-xl p-4 mb-4 border border-gray-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <img
                src={post.author_avatar || "/avatar.png"}
                alt={post.author_name}
                className="w-10 h-10 rounded-full object-cover border border-gray-600"
              />
              <div>
                <div className="font-medium text-blue-400 hover:underline">
                  {post.author_name}
                </div>
                <div className="text-sm text-gray-400">
                  Publié le {new Date(post.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-200 whitespace-pre-wrap">
              {post.content}
            </div>
            {post.image_url && (
              <img
                src={post.image_url}
                alt="post"
                className="mt-2 max-h-60 object-contain rounded border border-gray-700"
              />
            )}
          </div>
        ))
      )}

      {/* OPEN CHAT BOXES */}
      <div className="fixed bottom-4 right-72 flex gap-4 z-40">
        {openChats.map((u) => (
          <ChatBox
            key={u.id}
            recipient={u}
            currentUser={user}
            onClose={() => setOpenChats(openChats.filter((c) => c.id !== u.id))}
          />
        ))}
      </div>


      {showPopup && selectedUser && (
        <UserProfilePopup
          selectedUser={selectedUser}
          setShowPopup={setShowPopup}
          followStatus={followStatus}
          handleFollowToggle={handleFollowToggle}
        />
      )}
    </div>
  );
}
