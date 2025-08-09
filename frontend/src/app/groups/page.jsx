// src/app/groups/page.js
'use client'
import { useState } from 'react'
import GroupList from './components/GroupList'
import CreateGroupModal from './components/CreateGroupModal'
import styles from './GroupsPage.module.css'

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
    <div className={styles.pageContainer}>
      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header with animated gradient */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            Your Communities
          </h1>
          <p className={styles.subtitle}>
            Connect, share, and grow with like-minded people
          </p>
        </div>
        
        {/* Action Bar */}
        <div className={styles.actionBar}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={handleGroupSearch}
              className={styles.searchInput}
            />
            <svg
              className={styles.searchIcon}
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
            className={styles.createButton}
          >
            <svg
              className={styles.plusIcon}
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
        <div className={styles.groupListContainer}>
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