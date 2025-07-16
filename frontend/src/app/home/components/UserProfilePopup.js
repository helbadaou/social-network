// src/app/home/components/UserProfilePopup.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserProfilePopup({
  selectedUser,
  currentUser,
  setShowPopup,
  followStatus,
  setFollowStatus,
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false);


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
        // UNFOLLOW
        const res = await fetch('http://localhost:8080/api/unfollow', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ followed_id: selectedUser.id }),
        })

        if (res.ok) {
          setFollowStatus(""); // remet à l’état initial
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
          const check = await fetch(`http://localhost:8080/api/follow/status/${selectedUser.id}`, {
            credentials: 'include'
          })
          if (check.ok) {
            const data = await check.json()
            setFollowStatus(data.status || "")
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-gray-700">
        <button
          onClick={() => setShowPopup(false)}
          className="absolute top-2 right-3 text-gray-400 hover:text-white text-xl"
        >
          ×
        </button>

        <div className="flex flex-col items-center">
          <img
            src={selectedUser.author_avatar || '/avatar.png'}
            alt="Avatar"
            className="w-20 h-20 rounded-full border border-gray-600 object-cover mb-3"
          />
          <h2 className="text-lg font-semibold text-white">
            {selectedUser.first_name} {selectedUser.last_name}
          </h2>
          <p className="text-gray-400 text-sm">@{selectedUser.nickname || ''}</p>
          {selectedUser.About && (
            <p className="mt-2 text-sm text-blue-400 text-center">{selectedUser.About}</p>
          )}
          <p className="mt-1 text-sm text-gray-400 text-center">{selectedUser.email}</p>
          {selectedUser.date_of_birth && (
            <p className="text-sm text-gray-500 mt-2">
              🎂 Né(e) le {selectedUser.date_of_birth}
            </p>
          )}

          {selectedUser.id !== currentUser?.ID && (
            <button
              onClick={handleFollowToggle}
              disabled={loading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`mt-4 px-4 py-2 rounded-full text-sm font-medium w-32 text-center transition-all duration-200 ${followStatus === 'accepted'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : followStatus === 'pending'
                  ? isHovered
                    ? 'bg-gray-700 text-white hover:bg-gray-800'
                    : 'bg-yellow-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {followStatus === 'accepted'
                ? 'Se désabonner'
                : followStatus === 'pending'
                  ? isHovered
                    ? '❌ Annuler'
                    : '🕓 En attente'
                  : '+ Suivre'}
            </button>
          )}


          <button
            className="mt-3 text-blue-400 text-sm hover:underline cursor-pointer"
            onClick={() => {
              setShowPopup(false)
              router.push(`/profile/${selectedUser.id}`)
            }}
          >
            Voir le profil complet →
          </button>
        </div>
      </div>
    </div>
  )
}