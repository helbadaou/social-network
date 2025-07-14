'use client'

import { useState, useEffect } from 'react'

export default function Sidebar({ chatUsers, onOpenChat }) {
  const [activeTab, setActiveTab] = useState('friends')
  const [search, setSearch] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredUsers(chatUsers)
    } else {
      const lower = search.toLowerCase()
      setFilteredUsers(
        chatUsers.filter(u =>
          u.full_name.toLowerCase().includes(lower) || u.nickname?.toLowerCase().includes(lower)
        )
      )
    }
  }, [search, chatUsers])

  return (
    <div className="fixed top-0 left-0 h-full w-72 bg-gray-900 shadow-lg z-40 border-r border-gray-800">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 p-3 text-sm font-medium ${activeTab === 'friends' ? 'text-white bg-gray-800' : 'text-gray-400'
            }`}
        >
          Friends
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 p-3 text-sm font-medium ${activeTab === 'groups' ? 'text-white bg-gray-800' : 'text-gray-400'
            }`}
          disabled // We'll enable it later when we work on groups
        >
          Groups
        </button>
      </div>

      {/* Search */}
      <div className="p-2">
        <input
          type="text"
          placeholder="🔍 Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400"
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[calc(100%-130px)] px-2">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer"
            onClick={() => onOpenChat(u)}
          >
            <img
              src={u.avatar || '/avatar.png'}
              alt="avatar"
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm text-white">{u.full_name}</div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <p className="text-gray-500 text-sm px-2">No users found.</p>
        )}
      </div>
    </div>
  )
}
