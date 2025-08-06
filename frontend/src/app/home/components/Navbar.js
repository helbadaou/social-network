// src/app/home/components/Navbar.js
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'  // Added useRouter import

export default function Navbar({
  user,
  handleSearch,
  handleLogout,
  results,
  openMessages,
  togglePostForm,
  realtimeNotification,
  fetchChatUsers,
  hideActions = false,
  hideSearch = false,
  onNotificationRemoved,
  fetchUserById,
  setSearch,
  setResults
}) {
  const router = useRouter()  // Initialize router

  const [showProfile, setShowProfile] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const [unreadCount, setUnreadCount] = useState(0);

  const removeNotification = (criteria) => {
    setNotifications(prev => {
      const filtered = prev.filter(notif => {
        if (criteria.type === 'follow_request_cancelled') {
          return !(notif.type === 'follow_request' && notif.sender_id === criteria.sender_id);
        }
        return true;
      });
      setUnreadCount(filtered.filter(n => !n.seen).length);
      return filtered;
    });
  };

  useEffect(() => {
    if (onNotificationRemoved) {
      onNotificationRemoved(removeNotification);
    }
  }, [onNotificationRemoved]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current &&
        !notificationsRef.current.contains(event.target) &&
        !notificationButtonRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      console.error("Erreur récupération notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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

      if (typeof fetchChatUsers === 'function') {
        setTimeout(() => fetchChatUsers(), 500);
      }

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
      console.error('Erreur acceptation:', err);
    }
  };

  const handleReject = async (notifId, senderId) => {
    try {
      const res = await fetch('/api/follow/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: senderId }),
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
      }
    } catch (err) {
      console.error('Erreur rejet:', err);
    }
  };

  const toggleProfile = () => {
    setShowProfile(prev => !prev)
  }

  const togglePrivacy = async () => {
    try {
      const res = await fetch('/api/user/toggle-privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_private: !isPrivate })
      })
      if (res.ok) {
        setIsPrivate(!isPrivate)
      }
    } catch (err) {
      console.error('Erreur modification confidentialité', err)
    }
  }

  useEffect(() => {
    if (user && typeof user.IsPrivate === 'boolean') {
      setIsPrivate(user.IsPrivate);
    }
  }, [user]);

  useEffect(() => {
    if (realtimeNotification) {
      if (realtimeNotification.type === "follow_request_response") {
        const { sender_id, recipient_id } = realtimeNotification;
        if (recipient_id === user?.ID) {
          setNotifications(prev => prev.filter(n => !(n.type === 'follow_request' && n.sender_id === sender_id)));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        return;
      }

      setNotifications(prev => {
        const exists = prev.some(n =>
          n.sender_id === realtimeNotification.sender_id &&
          n.type === realtimeNotification.type &&
          n.message === realtimeNotification.message
        );

        if (exists) return prev;

        const newNotif = {
          id: realtimeNotification.id,
          sender_id: realtimeNotification.sender_id,
          type: realtimeNotification.type,
          message: realtimeNotification.message,
          created_at: realtimeNotification.created_at || new Date().toISOString(),
          seen: false
        };

        const updated = [newNotif, ...prev];
        setUnreadCount(updated.filter(n => !n.seen).length);
        return updated;
      });
    }
  }, [realtimeNotification, user?.ID]);

  return (
    <nav className="bg-gray-900 shadow px-6 py-4 border-b border-gray-800 relative">
      <div className="flex items-center justify-between">
        {/* Barre de recherche */}
        {!hideSearch ? (
          <div className="max-w-xl w-full relative">
            <input
              type="text"
              placeholder="🔍 Rechercher un utilisateur..."
              onChange={handleSearch}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
            />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 bg-gray-800 mt-2 rounded-md shadow-lg z-30 border border-gray-700 max-h-64 overflow-y-auto">
                {results.map((u) => (
                  <div key={u.id} className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700">
                    <p className="font-medium text-white">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-sm text-gray-400">@{u.nickname}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div /> // Place vide pour conserver l'espace de gauche
        )}

        {/* Droite : Actions, cloche, profil */}
        <div className="flex items-center gap-4 ml-4 relative">
          {!hideActions && (
            <>
              <button onClick={togglePostForm}>
                <img src="/plus-icon.png" alt="Créer un post" className="w-6 h-6" />
              </button>

              <button onClick={openMessages} className="relative">
                <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Cloche notifications (toujours visible) */}
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
                  <p className="text-gray-400 text-sm py-2">Aucune notification</p>
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
                                e.stopPropagation()
                                handleAccept(notif.id, notif.sender_id)
                              }}
                              className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReject(notif.id, notif.sender_id)
                              }}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                            >
                              Refuser
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
                onClick={toggleProfile}
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
                      {isPrivate ? '🔒 Profil privé' : '🌍 Profil public'}
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
                  <div>
                    <button
                      onClick={() => {
                        router.push(`/profile/${user.ID}`);
                      }}
                      className="mt-3 w-full text-sm text-green-500 hover:underline"
                    >
                      show all profile
                    </button> </ div>
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
  )
}