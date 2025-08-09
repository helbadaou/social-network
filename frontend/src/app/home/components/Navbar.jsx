// src/components/Navbar.jsx
'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedWorker } from '../../../contexts/SharedWorkerContext';
import { useAuth } from '../../../contexts/AuthContext';
import PostForm from '../../../app/home/components/PostForm';
import styles from './Navbar.module.css'

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
      handleRealtimeNotification(message)
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
    fetchNotifications();

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

  const handleApprove = async (notifId, userId, groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include'
      })

      if (res.ok) {
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
      }
    } catch (err) {
      console.error('Error approving request:', err)
    }
  }

  const handleDecline = async (notifId, userId, groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include'
      })
      if (res.ok) {
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
      }
    } catch (err) {
      console.error('Error declining request:', err)
    }
  }

    const handleVote = async (eventId, groupId, response, notifId) => {
      
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to submit response');
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
      console.error('Error submitting response:', err);
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
      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* Search bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="🔍 Search users..."
              onChange={handleSearch}
              value={search}
              className={styles.searchInput}
            />
            {results && results.length > 0 && (
              <div className={styles.searchResults}>
                {results.map((user) => (
                  <div
                    key={user.id}
                    className={styles.searchResultItem}
                    onClick={() => {
                      router.push(`/profile/${user.id}`);
                      setSearch('');
                      setResults([]);
                    }}
                  >
                    <p className={styles.userName}>
                      {user.first_name} {user.last_name}
                    </p>
                    <p className={styles.userNickname}>@{user.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className={styles.actions}>
            <button onClick={togglePostForm}>
              <img src="/plus-icon.png" alt="Create post" className={styles.icon} />
            </button>

            <button onClick={openMessages} className="relative">
              <img src="/message-icon.png" alt="Messages" className={styles.icon} />
            </button>

            {/* Notifications dropdown */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={toggleNotifications}
                className={styles.notificationButton}
              >
                <img src="/notif-icon.png" className={styles.icon} alt="Notifications" />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notificationsRef}
                  className={styles.notificationDropdown}
                >
                  <div className={styles.notificationHeader}>
                    <h3 className={styles.notificationTitle}>Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className={styles.notificationClose}
                    >
                      ×
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className={styles.notificationEmpty}>No notifications</p>
                  ) : (
                    <div className={styles.notificationList}>
                      {notifications.map((notif, idx) => (
                        <div
                          key={notif.id ? notif.id : `${notif.sender_id}-${notif.type}-${notif.message}-${idx}`}
                          className={`${styles.notificationItem} ${notif.seen ? styles.notificationSeen : styles.notificationUnseen}`}
                        >
                          <p className={styles.notificationText}>
                            {notif.message}
                          </p>
                          <p className={styles.notificationTime}>
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                          {notif.type === 'follow_request' && (
                            <div className={styles.notificationActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(notif.id, notif.sender_id);
                                }}
                                className={`${styles.actionButton} ${styles.acceptButton}`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(notif.id, notif.sender_id);
                                }}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {notif.type === 'group_join_request' && (
                            <div className={styles.notificationActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(notif.id, notif.sender_id, notif.GroupId);
                                }}
                                className={`${styles.actionButton} ${styles.acceptButton}`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(notif.id, notif.sender_id, notif.GroupId);
                                }}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {notif.type === 'group_event_created' && (
                            <div className={styles.notificationActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(notif.EventId, notif.GroupId, 'going', notif.id)
                                }}
                                className={`${styles.actionButton} ${styles.acceptButton}`}
                              >
                                Going
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(notif.EventId, notif.GroupId, 'not_going', notif.id);
                                }}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                              >
                                Not Going
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

            <Link href="/groups" className={styles.groupsLink}>👥 Groups</Link>

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
                  className={styles.avatar}
                />

                {showProfile && (
                  <div className={styles.profileDropdown}>
                    <h2 className={styles.profileName}>
                      {user.FirstName} {user.LastName}
                    </h2>
                    <p className={styles.profileEmail}>{user.Email}</p>
                    <div className={styles.profilePrivacy}>
                      <span className={styles.privacyText}>
                        {isPrivate ? '🔒 Private profile' : '🌍 Public profile'}
                      </span>
                      <button
                        onClick={togglePrivacy}
                        className={`${styles.privacyToggle} ${isPrivate ? styles.privacyTogglePrivate : styles.privacyTogglePublic}`}
                      >
                        <div
                          className={`${styles.privacyToggleThumb} ${isPrivate ? styles.privacyToggleThumbPrivate : styles.privacyToggleThumbPublic}`}
                        ></div>
                      </button>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${user.ID}`)}
                      className={styles.profileLink}
                    >
                      View profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className={styles.logoutButton}
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
        <div className={styles.modalOverlay}>
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