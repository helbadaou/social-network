'use client'

import { useEffect, useState, useRef } from 'react'

export default function MessageSidebar({
  chatUsers,
  showMessages,
  setShowMessages,
  openChat,
  currentUserId,
  fetchChatUsers
}) {
  // Référence pour l'intervalle de polling
  const pollingInterval = useRef(null);

  // Filtrer les utilisateurs qui peuvent discuter
  const chatableUsers = chatUsers.filter(u => u.id !== currentUserId && u.can_chat)
  const nonChatableUsers = chatUsers.filter(u => u.id !== currentUserId && !u.can_chat)

  // Polling automatique quand la sidebar des messages est ouverte
  useEffect(() => {
    if (showMessages && fetchChatUsers) {
      // Rafraîchir immédiatement
      fetchChatUsers();
      
      // Puis toutes les 3 secondes
      pollingInterval.current = setInterval(() => {
        fetchChatUsers();
      }, 3000);
    } else {
      // Nettoyer l'intervalle si on ferme la sidebar
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    // Nettoyage à la fermeture du composant
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [showMessages, fetchChatUsers]);

  // Fonction pour gérer le clic sur un utilisateur non-chatable
  const handleNonChatableUserClick = (user) => {
    alert(`Vous ne pouvez pas discuter avec ${user.full_name}. Vous devez vous suivre mutuellement pour pouvoir discuter.`);
  }

  // Fonction pour forcer le rafraîchissement manuel
  const handleManualRefresh = () => {
    if (fetchChatUsers) {
      fetchChatUsers();
    }
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full w-100 bg-gray-900 shadow-lg transform transition-transform duration-300 z-40 ${
        showMessages ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-medium">Messages</h2>
        <button
          onClick={() => setShowMessages(false)}
          className="text-gray-400 hover:text-white"
        >
          ✖
        </button>
      </div>

      {/* Main Content */}
      <div className="overflow-y-auto max-h-[calc(100%-56px)] p-4">
        {/* Utilisateurs avec qui on peut discuter */}
        {chatableUsers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-green-400 mb-3">
              💬 Discussions disponibles ({chatableUsers.length})
            </h3>
            {chatableUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-800 p-2 rounded-md border-l-2 border-green-500 transition-colors"
                onClick={() => openChat(u)}
              >
                <img
                  src={
                    u.avatar
                      ? u.avatar.startsWith('http')
                        ? u.avatar
                        : `http://localhost:8080/${u.avatar}`
                      : '/avatar.png'
                  }
                  className="w-8 h-8 rounded-full"
                  alt="avatar"
                />
                <span className="text-sm font-medium text-white">{u.full_name}</span>
                <span className="text-xs text-green-400">✓ Suivi mutuel</span>
              </div>
            ))}
          </div>
        )}

        {chatableUsers.length === 0 && nonChatableUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Aucun autre utilisateur</p>
            <button 
              onClick={handleManualRefresh}
              className="mt-2 text-blue-400 hover:text-blue-300 text-xs"
            >
              Rafraîchir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}