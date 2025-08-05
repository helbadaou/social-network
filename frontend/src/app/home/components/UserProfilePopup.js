// src/app/home/components/UserProfilePopup.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './styles/UserProfilePopup.module.css'

export default function UserProfilePopup({
  selectedUser,
  currentUser,
  setShowPopup,
  followStatus,
  setFollowStatus,
  fetchChatUsers,
  realtimeNotification, // ✅ Nouveau prop pour les notifications WebSocket
  onNotificationRemoved // ✅ Nouveau callback pour supprimer les notifications du parent
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false);

  // ✅ Écouter les notifications WebSocket pour mettre à jour le statut
  useEffect(() => {
    if (realtimeNotification && selectedUser) {
      console.log("🔄 Notification WebSocket reçue:", realtimeNotification);

      // Si on reçoit une notification de mise à jour de statut de suivi
      if (realtimeNotification.type === "follow_status_update") {
        // Actualiser le statut de suivi pour cet utilisateur
        refetchFollowStatus();
      }

      // ✅ Si on reçoit une notification d'acceptation/rejet de demande
      if (realtimeNotification.type === "follow_request_response") {
        const { sender_id, recipient_id, action } = realtimeNotification;

        console.log("📩 Réponse follow request:", { sender_id, recipient_id, action, selectedUserId: selectedUser.id, currentUserId: currentUser?.ID });

        // Si c'est une réponse à notre demande (nous sommes le sender)
        if (sender_id === currentUser?.ID && recipient_id === selectedUser.id) {
          if (action === "accepted") {
            console.log("✅ Demande acceptée");
            setFollowStatus("accepted");
          } else if (action === "rejected") {
            console.log("❌ Demande refusée - retour à l'état initial");
            setFollowStatus(""); // Retour à l'état initial = bouton "Suivre"
          }
        }
      }

      // ✅ Si on reçoit une notification d'annulation de demande
      if (realtimeNotification.type === "follow_request_cancelled") {
        const { sender_id, recipient_id } = realtimeNotification;

        // Si nous sommes celui qui a annulé la demande
        if (sender_id === currentUser?.ID && recipient_id === selectedUser.id) {
          setFollowStatus(""); // Retour à l'état initial
        }
      }
    }
  }, [realtimeNotification, selectedUser, currentUser]);

  // ✅ Fonction pour re-fetch le statut de suivi
  const refetchFollowStatus = async () => {
    if (!selectedUser?.id || selectedUser.id === currentUser?.ID) return;

    try {
      const res = await fetch(`http://localhost:8080/api/follow/status/${selectedUser.id}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFollowStatus(data.status || "");
        console.log("🔄 Follow status mis à jour:", data.status);
      } else {
        setFollowStatus("");
      }
    } catch (err) {
      console.error("Erreur récupération follow status", err);
      setFollowStatus("");
    }
  };

  useEffect(() => {
    async function fetchFollowStatus() {
      if (!selectedUser?.id || selectedUser.id === currentUser?.ID) return

      try {
        const res = await fetch(`http://localhost:8080/api/follow/status/${selectedUser.id}`, {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setFollowStatus(data.status || "")
        } else {
          setFollowStatus("")
        }
      } catch (err) {
        console.error("Erreur récupération follow status", err)
        setFollowStatus("")
      }
    }

    fetchFollowStatus()
  }, [selectedUser])

  const handleFollowToggle = async () => {
    if (!selectedUser?.id || selectedUser.id === currentUser?.ID) return
    setLoading(true)

    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        // UNFOLLOW / CANCEL REQUEST
        const res = await fetch('http://localhost:8080/api/unfollow', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            followed_id: selectedUser.id,
            cancel_request: followStatus === 'pending' // ✅ Indiquer qu'il s'agit d'une annulation
          }),
        })

        if (res.ok) {
          setFollowStatus(""); // remet à l'état initial

          // ✅ Si c'était une demande en attente, supprimer la notification côté frontend
          if (followStatus === 'pending') {
            try {
              await fetch('/api/notifications/cancel-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sender_id: currentUser.ID,
                  recipient_id: selectedUser.id
                }),
                credentials: 'include',
              });

              // ✅ Callback pour supprimer la notification du state parent (Navbar)
              if (onNotificationRemoved) {
                onNotificationRemoved({
                  type: 'follow_request_cancelled',
                  sender_id: currentUser.ID,
                  recipient_id: selectedUser.id
                });
              }

            } catch (err) {
              console.error('Erreur suppression notification:', err);
            }
          }

          // ✅ Rafraîchir la liste des utilisateurs pour que les autres composants soient mis à jour
          if (fetchChatUsers) {
            setTimeout(() => fetchChatUsers(), 500);
          }
        }
      } else {
        // FOLLOW
        const res = await fetch('http://localhost:8080/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ followed_id: selectedUser.id }),
        })

        if (res.ok) {
          // ✅ Vérifier immédiatement le nouveau statut
          await refetchFollowStatus();

          // ✅ Rafraîchir la liste des utilisateurs
          if (fetchChatUsers) {
            setTimeout(() => fetchChatUsers(), 500);
          }
        }
      }
    } catch (err) {
      console.error("Erreur follow/unfollow", err)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedUser) return null

  // ✅ Vérifier si l'utilisateur doit voir les infos complètes en temps réel
  const canViewFullProfile = !selectedUser.is_private ||
    followStatus === 'accepted' ||
    selectedUser.id === currentUser?.ID;

  if (selectedUser.restricted || (selectedUser.is_private && followStatus !== 'accepted' && selectedUser.id !== currentUser?.ID)) {
    return (
      <div className={styles.popup}>
        <div className={styles.popupContainer}>
          <button
            onClick={() => setShowPopup(false)}
            className={styles.closeButton}
          >
            ×
          </button>
          <div className={styles.popupContent}>
            <img
              src={
                selectedUser.avatar || selectedUser.author_avatar
                  ? (selectedUser.avatar || selectedUser.author_avatar).startsWith('http')
                    ? (selectedUser.avatar || selectedUser.author_avatar)
                    : `http://localhost:8080/${selectedUser.avatar || selectedUser.author_avatar}`
                  : '/avatar.png'
              }
              alt="Avatar"
              className={styles.avatar}
            />
            <h2 className={styles.userName}>
              {selectedUser.nickname || `${selectedUser.first_name} ${selectedUser.last_name}`}
            </h2>
            <p className={styles.privateNotice}>🔒 Profil privé, veuillez vous abonner pour voir les informations.</p>

            {selectedUser.id !== currentUser?.ID && (
              <button
                onClick={handleFollowToggle}
                disabled={loading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`${styles.followButton} ${followStatus === 'accepted'
                  ? styles.unfollowButton
                  : followStatus === 'pending'
                    ? isHovered
                      ? styles.cancelPendingButton
                      : styles.pendingButton
                    : styles.followButtonDefault
                  }`}
              >
                {loading ? '...' :
                  followStatus === 'accepted'
                    ? 'Se désabonner'
                    : followStatus === 'pending'
                      ? isHovered
                        ? '❌ Annuler'
                        : '🕓 En attente'
                      : '+ Suivre'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContainer}>
        <button
          onClick={() => setShowPopup(false)}
          className={styles.closeButton}
        >
          ×
        </button>

        <div className={styles.popupContent}>
          <img
            src={
              selectedUser.author_avatar
                ? selectedUser.author_avatar.startsWith('http')
                  ? selectedUser.author_avatar
                  : `http://localhost:8080/${selectedUser.author_avatar}`
                : '/avatar.png'
            }
            alt="Avatar"
            className={styles.avatar}
          />
          <h2 className={styles.userName}>
            {selectedUser.first_name} {selectedUser.last_name}
          </h2>
          <p className={styles.userNickname}>{selectedUser.nickname}</p>
          {selectedUser.About && (
            <p className={styles.userAbout}>{selectedUser.About}</p>
          )}
          <p className={styles.userEmail}>{selectedUser.email}</p>
          {selectedUser.date_of_birth && (
            <p className={styles.userBirthday}>
              🎂 Né(e) le {selectedUser.date_of_birth}
            </p>
          )}

          {selectedUser.id !== currentUser?.ID && (
            <button
              onClick={handleFollowToggle}
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`${styles.followButton} ${followStatus === 'accepted'
                ? styles.unfollowButton
                : followStatus === 'pending'
                  ? isHovered
                    ? styles.cancelPendingButton
                    : styles.pendingButton
                  : styles.followButtonDefault
                }`}
            >
              {loading ? '...' :
                followStatus === 'accepted'
                  ? 'Se désabonner'
                  : followStatus === 'pending'
                    ? isHovered
                      ? '❌ Annuler'
                      : '🕓 En attente'
                    : '+ Suivre'}
            </button>
          )}

          {!canViewFullProfile && (
            <p className={styles.privateNotice}>🔒 Profil privé, veuillez vous abonner pour voir les informations complètes.</p>
          )}

          {canViewFullProfile && (
            <button
              className={styles.viewProfileButton}
              onClick={() => {
                setShowPopup(false);
                router.push(`/profile/${selectedUser.id}`);
              }}
            >
              Voir le profil complet →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}