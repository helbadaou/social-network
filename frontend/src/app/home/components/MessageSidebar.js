'use client'

import { useEffect, useState } from 'react'

export default function MessageSidebar({
  chatUsers,
  showMessages,
  setShowMessages,
  openChat,
  currentUserId
}) {
  const [groups, setGroups] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('messages')

  const otherUsers = chatUsers.filter(u => u.id !== currentUserId)

  useEffect(() => {
    fetch('/api/groups')
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text || 'Failed to fetch groups') })
        }
        return res.json()
      })
      .then(data => setGroups(data))
      .catch(err => {
        console.error('Error fetching groups:', err)
        setGroups([])
      })
  }, [])

  const filteredGroups = groups?.filter(group =>
    group.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateGroup = async () => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGroupName,
          description: newGroupDesc,
          creator_id: currentUserId
        })
      })

      if (!res.ok) throw new Error('Failed to create group')

      const newGroup = await res.json()
      setGroups(prev => [...prev, newGroup])
      setShowModal(false)
      setNewGroupName('')
      setNewGroupDesc('')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div
      className={`fixed top-0 left-0 h-full w-100 bg-gray-900 shadow-lg transform transition-transform duration-300 z-40 ${
        showMessages ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('messages')}
            className={`text-sm font-medium ${
              activeTab === 'messages' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📨 Messages
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`text-sm font-medium ${
              activeTab === 'groups' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Groups
          </button>
        </div>
        <button
          onClick={() => setShowMessages(false)}
          className="text-gray-400 hover:text-white"
        >
          ✖
        </button>
      </div>

      {/* Main Content */}
      <div className="overflow-y-auto max-h-[calc(100%-56px)]">
        {activeTab === 'messages' ? (
          otherUsers.length > 0 ? (
            otherUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-800 p-2 rounded-md"
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
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm p-4">Aucun autre utilisateur</p>
          )
        ) : (
          <div className="p-4">
            {/* Group Search & Create */}
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                placeholder="Search groups..."
                className="p-2 border rounded w-2/3 bg-gray-800 text-white border-gray-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ➕ New Group
              </button>
            </div>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-gray-800 p-6 rounded shadow-md w-96 border border-gray-700">
                  <h2 className="text-lg font-semibold mb-4 text-white">Create New Group</h2>
                  <input
                    type="text"
                    placeholder="Group Title"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="w-full mb-3 p-2 bg-gray-700 text-white border border-gray-600 rounded"
                  />
                  <textarea
                    placeholder="Group Description"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    className="w-full mb-3 p-2 bg-gray-700 text-white border border-gray-600 rounded"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateGroup}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Group List */}
            <ul className="space-y-2 mt-4">
              {filteredGroups?.length > 0 ? (
                filteredGroups.map(group => (
                  <li
                    key={group.id}
                    className="p-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 cursor-pointer"
                  >
                    <strong className="text-white">{group.title}</strong>
                    <p className="text-sm text-gray-400">{group.description}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-400">No groups found.</p>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
