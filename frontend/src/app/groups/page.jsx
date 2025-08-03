// src/app/groups/page.js
'use client'
import { useState } from 'react'
import GroupList from './components/GroupList'
import CreateGroupModal from './components/CreateGroupModal'
import Navbar from '../home/components/Navbar'

export default function GroupsPage({
  user,
  handleSearch,
  handleLogout,
  results,
  openMessages,
  togglePostForm,
  realtimeNotification,
  fetchChatUsers,
  handleNotificationRemoved
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const handleGroupSearch = (e) => {
    setSearchTerm(e.target.value)
    // You can add API search functionality here if needed
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Navbar with all required props */}
      <Navbar
        user={user}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={false}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24"> {/* Added pt-24 to account for navbar height */}
        {/* Header with animated gradient */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            Your Communities
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Connect, share, and grow with like-minded people
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={handleGroupSearch}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <svg
              className="w-5 h-5 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Create New Group
          </button>
        </div>

        {/* Group List */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
          <GroupList searchTerm={searchTerm} />
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          fetchGroups={() => {/* Add your group refresh logic here */ }}
        />
      )}
    </div>
  )
}