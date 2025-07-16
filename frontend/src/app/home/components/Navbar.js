// src/app/home/components/Navbar.js
'use client'

import { useState, useEffect } from 'react'

export default function Navbar({ user, handleSearch, handleLogout, results, openMessages }) {
  const [showProfile, setShowProfile] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/notifications", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Erreur chargement notifications", err);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  const handleAccept = async (notifId, senderId) => {
    try {
      await fetch("http://localhost:8080/api/follow/accept", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: senderId, notification_id: notifId }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Erreur acceptation :", err);
    }
  };

  const handleReject = async (notifId, senderId) => {
    try {
      await fetch("http://localhost:8080/api/follow/reject", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follower_id: senderId, notification_id: notifId }),
      });
      fetchNotifications();
    } catch (err) {
      console.error("Erreur refus :", err);
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
    console.log("📦 USER reçu dans Navbar :", user);
    if (user && typeof user.IsPrivate === 'boolean') {
      setIsPrivate(user.IsPrivate);
    }
  }, [user]);

  return (
    <nav className="bg-gray-900 shadow flex justify-between items-center px-6 py-4 border-b border-gray-800 relative">
      {/* Champ de recherche */}
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

      {/* Section à droite : messages + avatar */}
      <div className="flex items-center gap-4 ml-4 relative">
        {/* Icône notifications */}
        <button onClick={toggleNotifications}>
          <img src="/notif-icon.png" className="w-6 h-6" alt="Notifications" />
        </button>

        {/* Icône message */}
        <button onClick={openMessages} className="relative">
          <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
        </button>

        {showNotifications && (
          <div className="absolute top-12 right-20 w-80 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 z-40 max-h-96 overflow-y-auto">
            <h3 className="text-lg text-white font-semibold mb-2">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune notification</p>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="mb-3 p-2 border border-gray-700 rounded">
                  <p className="text-sm text-white mb-1">{notif.message}</p>
                  {notif.type === 'follow_request' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(notif.id, notif.sender_id)}
                        className="text-green-400 text-sm hover:underline"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleReject(notif.id, notif.sender_id)}
                        className="text-red-400 text-sm hover:underline"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}


        {/* Avatar utilisateur */}
        {user && (
          <div className="relative">
            <img
              src={user.author_avatar?.trim() ? user.author_avatar : '/avatar.png'}
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
    </nav>
  )
}