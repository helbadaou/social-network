'use client'
import { useEffect, useState, useRef } from 'react'
import styles from './MessageSidebar.module.css'

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
    <div className={`${styles.sidebar} ${showMessages ? styles.open : styles.closed}`}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Messages</h2>
        <button
          onClick={() => setShowMessages(false)}
          className={styles.closeButton}
        >
          ✖
        </button>
      </div>
      
      {/* Main Content */}
      <div className={styles.content}>
        {/* Utilisateurs avec qui on peut discuter */}
        {chatableUsers.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              💬 Discussions disponibles ({chatableUsers.length})
            </h3>
            {chatableUsers.map(u => (
              <div
                key={u.id}
                className={styles.userItem}
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
                  className={styles.avatar}
                  alt="avatar"
                />
                <span className={styles.userName}>{u.full_name}</span>
                <span className={styles.mutualFollowBadge}>✓ Suivi mutuel</span>
              </div>
            ))}
          </div>
        )}
        
        {chatableUsers.length === 0 && nonChatableUsers.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Aucun autre utilisateur</p>
            <button 
              onClick={handleManualRefresh}
              className={styles.refreshButton}
            >
              Rafraîchir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}