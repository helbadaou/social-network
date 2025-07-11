'use client'
import React from 'react'

export default function UserProfilePopup({ user, onClose }) {
  if (!user) return null

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
        >
          ×
        </button>
        <div className="flex flex-col items-center">
          <img
            src={user.avatar && user.avatar.trim() !== '' ? user.avatar : '/avatar.png'}
            alt="avatar"
            className="w-24 h-24 rounded-full border mb-4 object-cover"
          />
          <h2 className="text-xl font-semibold">{user.first_name} {user.last_name}</h2>
          <p className="text-gray-500">@{user.nickname}</p>
          {user.about && (
            <p className="mt-2 text-blue-600 text-sm text-center">{user.about}</p>
          )}
          {user.email && (
            <p className="mt-1 text-sm text-gray-600">{user.email}</p>
          )}
        </div>
      </div>
    </div>
  )
}
