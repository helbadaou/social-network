// src/components/Navbar.jsx
'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedWorker } from '../../../contexts/SharedWorkerContext';
import { useAuth } from '../../../contexts/AuthContext';
import PostForm from '../../../app/home/components/PostForm';

export function Navbar() {
    const { user } = useAuth();
  const router = useRouter();

  // Post Form State
  const [showPostForm, setShowPostForm] = useState(false);
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState(''); // Changed from searchResults to search
  const [results, setResults] = useState([]); // New state for search results
  const [privacy, setPrivacy] = useState('public');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef();

  // Existing Navbar State
  const [showProfile, setShowProfile] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationsRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const { workerMessages, sendWorkerMessage } = useSharedWorker();

  // Initialize SharedWorker when user is available
  useEffect(() => {
    console.log("Current user:", user);
    if (user?.ID) {
      console.log("Initializing SharedWorker with user ID:", user.ID);
      sendWorkerMessage({ type: 'INIT', userId: user.ID });
    }
  }, [user, sendWorkerMessage]);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const togglePostForm = () => {
    setShowPostForm(prev => !prev);
    // Reset form state when opening
    if (!showPostForm) {
      setError("");
      setSuccess("");
    }
  };

  // Handle WebSocket messages from SharedWorker
  useEffect(() => {
    const handleWebSocketMessage = (message) => {
      console.log(message)
      if (message.type === 'follow_request') {
        handleRealtimeNotification(message)
      }
      // Add other message types as needed
    }

    workerMessages.forEach(msg => {
      if (msg.type === 'message' && msg.data) {
        // Handle WebSocket data from server
        handleWebSocketMessage(msg.data)
      }
    })
  }, [workerMessages])

  // Your existing handleRealtimeNotification function
  const handleRealtimeNotification = (notification) => {
    if (notification.type === "follow_request") {

      fetchNotifications();
      return;
    }

    setNotifications(prev => {
      const exists = prev.some(n =>
        n.sender_id === notification.sender_id &&
        n.type === notification.type &&
        n.message === notification.message
      );

      if (exists) return prev;

      const newNotif = {
        id: notification.id,
        sender_id: notification.sender_id,
        type: notification.type,
        message: notification.message,
        created_at: notification.created_at || new Date().toISOString(),
        seen: false
      };

      const updated = [newNotif, ...prev];
      setUnreadCount(updated.filter(n => !n.seen).length);
      return updated;
    });
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { credentials: 'include', method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const openMessages = () => setShowMessages(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/notifications", { credentials: 'include' });
      const data = await res.json();

      const uniqueNotifs = [];
      const seenKeys = new Set();

      for (const notif of data) {
        const key = `${notif.sender_id}-${notif.message}-${notif.type}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueNotifs.push(notif);
        }
      }

      setNotifications(uniqueNotifs);
      setUnreadCount(uniqueNotifs.filter(n => !n.seen).length);
    } catch (err) {
      console.error("Error fetching notifications", err);
    }
  };

  const toggleNotifications = async (e) => {
    e.stopPropagation();
    const newState = !showNotifications;
    setShowNotifications(newState);

    if (newState) {
      await fetchNotifications();
      await fetch('http://localhost:8080/api/notifications/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
        credentials: 'include',
      });
      await fetchNotifications();
      setUnreadCount(0);
    }
  };

  const handleAccept = async (notifId, senderId) => {
    try {
      await fetch('/api/follow/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId }),
        credentials: 'include',
      });

      await fetch('/api/notifications/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notifId }),
        credentials: 'include',
      });

      await fetch('/api/notifications/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notifId }),
        credentials: 'include',
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Error accepting follow:', err);
    }
  };

  const handleReject = async (notifId, senderId) => {
    try {
      const [rejectRes, seenRes, deleteRes] = await Promise.all([
        fetch('/api/follow/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender_id: senderId }),
          credentials: 'include',
        }),
        fetch('/api/notifications/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        }),
        fetch('/api/notifications/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notifId }),
          credentials: 'include',
        })
      ]);

      if (rejectRes.ok && seenRes.ok && deleteRes.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notifId));
      } else {
        console.error('One or more requests failed');
      }
    } catch (err) {
      console.error('Error rejecting follow:', err);
    }
  };

  const togglePrivacy = async () => {
    try {
      const res = await fetch('/api/user/toggle-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !isPrivate }),
        credentials: 'include'
      });
      if (res.ok) {
        setIsPrivate(!isPrivate);
      }
    } catch (err) {
      console.error('Error changing privacy:', err);
    }
  };

  // Handle click outside notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !notificationButtonRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial notifications fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <>
      <nav className="bg-gray-900 shadow px-6 py-4 border-b border-gray-800 relative">
        <div className="flex items-center justify-between">
          {/* Search bar */}
         <div className="max-w-xl w-full relative">
            <input
              type="text"
              placeholder="🔍 Search users..."
              onChange={handleSearch}
              value={search}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
            />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 bg-gray-800 mt-2 rounded-md shadow-lg z-30 border border-gray-700 max-h-64 overflow-y-auto">
                {results.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
                    onClick={() => {
                      router.push(`/profile/${user.id}`);
                      setSearch('');
                      setResults([]);
                    }}
                  >
                    <p className="font-medium text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-gray-400">@{user.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4 ml-4 relative">
            <button onClick={togglePostForm}>
              <img src="/plus-icon.png" alt="Create post" className="w-6 h-6" />
            </button>

            <button onClick={openMessages} className="relative">
              <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
            </button>

            {/* Notifications dropdown */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={toggleNotifications}
                className="relative p-1"
              >
                <img src="/notif-icon.png" className="w-6 h-6" alt="Notifications" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notificationsRef}
                  className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 z-50 max-h-96 overflow-y-auto"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-white">Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">No notifications</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notif, idx) => (
                        <div
                          key={notif.id ? notif.id : `${notif.sender_id}-${notif.type}-${notif.message}-${idx}`}
                          className={`p-3 rounded border ${notif.seen ? 'bg-gray-800 border-gray-700' : 'bg-blue-900 border-blue-600'}`}
                        >
                          <p className="text-sm text-white break-words">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                          {notif.type === 'follow_request' && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(notif.id, notif.sender_id);
                                }}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(notif.id, notif.sender_id);
                                }}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href="/groups" className="text-gray-300 hover:text-white">👥 Groups</Link>

            {/* User profile dropdown */}
            {user && (
              <div className="relative">
                <img
                  src={
                    user.Avatar
                      ? user.Avatar.startsWith('http')
                        ? user.Avatar
                        : `http://localhost:8080/${user?.Avatar}`
                      : '/avatar.png'
                  }
                  alt="Avatar"
                  onClick={() => setShowProfile(prev => !prev)}
                  className="w-10 h-10 rounded-full border border-blue-600 cursor-pointer"
                />

                {showProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 z-20">
                    <h2 className="font-semibold text-white">
                      {user.FirstName} {user.LastName}
                    </h2>
                    <p className="text-sm text-blue-400 mt-1">{user.Email}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-300">
                        {isPrivate ? '🔒 Private profile' : '🌍 Public profile'}
                      </span>
                      <button
                        onClick={togglePrivacy}
                        className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out 
                        ${isPrivate ? 'bg-red-500' : 'bg-green-500'}`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out 
                          ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`}
                        ></div>
                      </button>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${user.ID}`)}
                      className="mt-3 w-full text-sm text-green-500 hover:underline"
                    >
                      View profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="mt-3 w-full text-sm text-red-500 hover:underline"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Post Form Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
    </>
  );
}