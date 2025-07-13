// src/app/home/components/Navbar.js
'use client'

import { useState } from 'react'

export default function Navbar({ user, handleSearch, handleLogout, results }) {
  return (
    <nav className="bg-gray-900 shadow flex justify-between items-center px-6 py-4 border-b border-gray-800">
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
      <button onClick={handleLogout} className="text-red-500">Logout</button>
    </nav>
  )
}
