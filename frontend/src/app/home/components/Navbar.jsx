// src/components/Navbar.jsx
'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { redirect, useRouter } from 'next/navigation';
import { useSharedWorker } from '../../../contexts/SharedWorkerContext';
import { useAuth } from '../../../contexts/AuthContext';
import PostForm from '../../../app/home/components/PostForm';
import { useMessageSidebar } from '../../../contexts/MessageSideBarContext';
import Image from 'next/image';
import { apiUrl, assetUrl } from '@/lib/api';
import styles from './Navbar.module.css';

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
  const { setShowMessages } = useMessageSidebar()
  const openMessages = () => {
    setShowMessages(true);
    // Reset unread messages count when opening messages
  };

  // Initialize SharedWorker when user is available
  useEffect(() => {
    console.log("Current user:", user);
    if (user?.ID) {
      console.log("Initializing SharedWorker with user ID:", user.ID);
      sendWorkerMessage({ type: 'INIT', userId: user.ID });
    }
    if (user?.IsPrivate) {
      setIsPrivate(true)
    }
  }, [user, sendWorkerMessage]);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length > 1) {
      try {
        const res = await fetch(apiUrl(`/api/search?query=${value}`), {
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

      const res = await fetch(apiUrl('/api/posts'), {
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
      // Handle notifications
      handleRealtimeNotification(message);


    }

    workerMessages.forEach(msg => {
      if (msg.type === 'message' && msg.data) {
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
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(apiUrl('/api/notifications'), { credentials: 'include' });
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
      await fetch(apiUrl('/api/notifications/seen'), {
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

  const handleInviteAccept = async (groupId, notifId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/accept`, {
        method: 'POST',
        credentials: 'include',
      });

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
      } else {
        console.error('Failed to accept invitation');
      }
    } catch (err) {
      console.error('Error accepting group invitation:', err);
    }
  };

  const handleInviteDecline = async (groupId, notifId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/refuse`, {
        method: 'POST',
        credentials: 'include'
      });

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
      } else {
        alert(res.status)
        console.error('Failed to decline invitation');
      }
    } catch (err) {
      console.error('Error declining group invitation:', err);
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

  // Initial notifications and messages count fetch
  useEffect(() => {
    fetchNotifications();
  }, []);
  
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    fetch("/api/messages/unread-count")
      .then(res => res.json())
      .then(data => setUnreadMessagesCount(data.count))
      .catch(() => setUnreadMessagesCount(0));
  }, []);

  if (!user) {
    return
  }

  return (
    <>
      <nav className={styles.nav}>
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
                    <p className={styles.searchResultName}>
                      {user.first_name} {user.last_name}
                    </p>
                    <p className={styles.searchResultNickname}>@{user.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right side actions */}
          <div className={styles.actionsContainer}>
            <button onClick={togglePostForm} className={styles.actionButton}>
              <img src="/plus-icon.png" alt="Create post" className={styles.actionIcon} />
            </button>

            {/* Messages button with counter - UPDATED */}
            <div className={styles.messagesContainer}>
              <button onClick={openMessages} className={styles.actionButton}>
                <img src="/message-icon.png" alt="Messages" className={styles.actionIcon} />
                {unreadMessagesCount >= 0 && (
                  <span className={styles.messageCount}>
                    {unreadMessagesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notifications dropdown */}
            <div className={styles.notificationsContainer}>
              <button
                ref={notificationButtonRef}
                onClick={toggleNotifications}
                className={styles.notificationButton}
              >
                <img src="/notif-icon.png" className={styles.actionIcon} alt="Notifications" />
                {unreadCount > 0 && (
                  <span className={styles.notificationCount}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notificationsRef}
                  className={styles.notificationsDropdown}
                >
                  <div className={styles.notificationsHeader}>
                    <h3 className={styles.notificationsTitle}>Notifications</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className={styles.notificationsCloseButton}
                    >
                      ×
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className={styles.noNotifications}>No notifications</p>
                  ) : (
                    <div className={styles.notificationsList}>
                      {notifications.map((notif, idx) => (
                        <div
                          key={notif.id ? notif.id : `${notif.sender_id}-${notif.type}-${notif.message}-${idx}`}
                          className={`${styles.notificationItem} ${notif.seen ? styles.notificationSeen : styles.notificationUnseen}`}
                        >
                          <p className={styles.notificationText}>
                            {notif.message}
                          </p>
                          <p className={styles.notificationDate}>
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                          {notif.type === 'follow_request' && (
                            <div className={styles.notificationActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(notif.id, notif.sender_id);
                                }}
                                className={`${styles.notificationActionButton} ${styles.acceptButton}`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(notif.id, notif.sender_id);
                                }}
                                className={`${styles.notificationActionButton} ${styles.rejectButton}`}
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
                                  handleApprove(notif.id, notif.sender_id, notif.group_id);
                                }}
                                className={`${styles.notificationActionButton} ${styles.acceptButton}`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecline(notif.id, notif.sender_id, notif.group_id);
                                }}
                                className={`${styles.notificationActionButton} ${styles.rejectButton}`}
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
                                  handleVote(notif.event_id, notif.group_id, 'going', notif.id)
                                }}
                                className={`${styles.notificationActionButton} ${styles.acceptButton}`}
                              >
                                Going
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVote(notif.event_id, notif.group_id, 'not_going', notif.id)
                                }}
                                className={`${styles.notificationActionButton} ${styles.rejectButton}`}
                              >
                                Not Going
                              </button>
                            </div>
                          )}
                          {notif.type === 'group_invitation' && (
                            <div className={styles.notificationActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInviteAccept(notif.group_id, notif.id)
                                }}
                                className={`${styles.notificationActionButton} ${styles.acceptButton}`}
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInviteDecline(notif.group_id, notif.id)
                                }}
                                className={`${styles.notificationActionButton} ${styles.rejectButton}`}
                              >
                                Decline
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

            <Link href="/" className={styles.homeLink}>
              🏠
            </Link>

            <Link href="/groups" className={styles.groupsLink}>👥 Groups</Link>

            {/* User profile dropdown */}
            {user && (
              <div className={styles.profileContainer}>
                <img
                  src={
                    user.Avatar
                      ? user.Avatar.startsWith('http')
                        ? user.Avatar
                        : assetUrl(user?.Avatar)
                      : '/avatar.png'
                  }
                  alt="Avatar"
                  onClick={() => setShowProfile(prev => !prev)}
                  className={styles.profileAvatar}
                />

                {showProfile && (
                  <div className={styles.profileDropdown}>
                    <h2 className={styles.profileName}>
                      {user.FirstName} {user.LastName}
                    </h2>
                    <p className={styles.profileEmail}>{user.Email}</p>
                    <div className={styles.privacyContainer}>
                      <span className={styles.privacyText}>
                        {isPrivate ? '🔒 Private profile' : '🌍 Public profile'}
                      </span>
                      <button
                        onClick={togglePrivacy}
                        className={`${styles.privacyToggle} ${isPrivate ? styles.privacyTogglePrivate : styles.privacyTogglePublic}`}
                      >
                        <div
                          className={`${styles.privacyToggleIndicator} ${isPrivate ? styles.privacyToggleIndicatorPrivate : ''}`}
                        ></div>
                      </button>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${user.ID}`)}
                      className={`${styles.profileButton} ${styles.viewProfileButton}`}
                    >
                      View profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`${styles.profileButton} ${styles.logoutButton}`}
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
        <div className={styles.postFormModalOverlay}>
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