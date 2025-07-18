'use client'

import { useState, useEffect } from 'react'

export default function Sidebar({ chatUsers, onOpenChat }) {
  const [activeTab, setActiveTab] = useState('friends')
  const [search, setSearch] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])
  const [filteredGroups, setFilteredGroups] = useState([])
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (activeTab === 'friends') {
      const lower = search.toLowerCase()
      const filtered = chatUsers.filter(u =>
        u.full_name.toLowerCase().includes(lower) || u.nickname?.toLowerCase().includes(lower)
      )
      setFilteredUsers(filtered)
    } else if (activeTab === 'groups') {
      const lower = search.toLowerCase()
      const filtered = groups.filter(g =>
        g.name.toLowerCase().includes(lower)
      )
      setFilteredGroups(filtered)
    }
  }, [search, chatUsers, groups, activeTab])

  const handleCreateGroup = () => {
    // You can open a modal or navigate to a create-group page
    console.log('Open create group modal')
  }

  return (
    <div className="fixed top-0 left-0 h-full w-72 bg-gray-900 shadow-lg z-40 border-r border-gray-800">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => { setActiveTab('friends'); setSearch('') }}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'friends' ? 'text-white bg-gray-800' : 'text-gray-400'
          }`}
        >
          Friends
        </button>
        <button
          onClick={() => { setActiveTab('groups'); setSearch('') }}
          className={`flex-1 p-3 text-sm font-medium ${
            activeTab === 'groups' ? 'text-white bg-gray-800' : 'text-gray-400'
          }`}
        >
          Groups
        </button>
      </div>

      {/* Search + Create Group */}
      <div className="p-2">
        <input
          type="text"
          placeholder={`🔍 Search ${activeTab === 'friends' ? 'friends' : 'groups'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400"
        />

        {activeTab === 'groups' && (
          <button
            onClick={handleCreateGroup}
            className="w-full mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
          >
            ➕ Create Group
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[calc(100%-140px)] px-2">
        {activeTab === 'friends' ? (
          <>
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
          </>
        ) : (
          <>
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded cursor-pointer"
                onClick={() => onOpenChat(group)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  👥
                </div>
                <div className="text-sm text-white">{group.name}</div>
              </div>
            ))}
            {filteredGroups.length === 0 && (
              <p className="text-gray-500 text-sm px-2">No groups found.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
