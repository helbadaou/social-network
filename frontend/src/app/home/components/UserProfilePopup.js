// src/app/home/components/UserProfilePopup.js
'use client'

import { useRouter } from 'next/navigation'

export default function UserProfilePopup({ selectedUser, currentUser, setShowPopup, followStatus, handleFollowToggle }) {
  const router = useRouter()

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
              disabled={followStatus !== ''}
              className={`mt-4 px-4 py-2 rounded-full text-sm font-medium cursor-pointer ${
                followStatus === 'accepted'
                  ? 'bg-gray-500 text-white cursor-default'
                  : followStatus === 'pending'
                  ? 'bg-yellow-500 text-white cursor-default'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {followStatus === 'accepted'
                ? '✔ Abonné'
                : followStatus === 'pending'
                ? '🕓 En attente'
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
