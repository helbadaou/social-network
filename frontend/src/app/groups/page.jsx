// src/app/groups/page.js
'use client'
import { useState } from 'react'
import GroupList from './components/GroupList'
import CreateGroupModal from './components/CreateGroupModal'

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Create Group
        </button>
      </div>

      <GroupList />

      {showCreateModal && (
        <CreateGroupModal 
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}