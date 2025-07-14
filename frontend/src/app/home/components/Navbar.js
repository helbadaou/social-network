// src/app/home/components/Navbar.js
'use client'

import { useState } from 'react'

export default function Navbar({ user, handleSearch, handleLogout, results, openMessages }) {
  const [showProfile, setShowProfile] = useState(false)
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false)

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
        {/* Icône message */}
        <button onClick={openMessages} className="relative">
          <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
        </button>

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
