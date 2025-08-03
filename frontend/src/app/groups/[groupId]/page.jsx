// src/app/groups/[groupId]/page.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../home/components/Navbar'
import PendingRequests from '../components/PendingRequests'
import { use } from 'react'

export default function GroupDetailPage({ params }) {
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const router = useRouter()

  // State for Navbar props
  const [navbarProps, setNavbarProps] = useState({
    user: null,
    handleSearch: () => {},
    handleLogout: () => {},
    results: [],
    openMessages: () => {},
    togglePostForm: () => {},
    realtimeNotification: null,
    fetchChatUsers: () => {},
    hideActions: false,
    hideSearch: false,
    onNotificationRemoved: () => {}
  })

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        if (!res.ok) throw new Error('Failed to fetch group')
        const data = await res.json()
        setGroup(data)
        
        // Update user in navbar props if available
        if (data.creator) {
          setNavbarProps(prev => ({
            ...prev,
            user: data.creator
          }))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupId])

  const handleJoin = async (e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/groups/${group.id}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        // Refresh the group data to update membership status
        const refreshRes = await fetch(`/api/groups/${groupId}`)
        if (refreshRes.ok) {
          setGroup(await refreshRes.json())
        }
      }
    } catch (err) {
      console.error('Error joining group:', err)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900">
      <Navbar {...navbarProps} />
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-800 rounded w-1/2"></div>
          <div className="h-6 bg-gray-800 rounded w-3/4"></div>
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-900">
      <Navbar {...navbarProps} />
      <div className="max-w-4xl mx-auto p-4 text-red-500">
        {error}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Navbar {...navbarProps} />
      
      <div className="max-w-4xl mx-auto p-4 pt-24">
        {/* Group Header */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-gray-700/50">
          <h1 className="text-3xl font-bold text-white mb-2">{group.title}</h1>
          <p className="text-gray-300 mb-4">{group.description}</p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>👥 {group.member_count} members</span>
            <span>🕒 Created {new Date(group.created_at).toLocaleDateString()}</span>
            {group.is_creator && (
              <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Membership Status */}
        {!group.is_member && !group.is_pending && !group.is_creator && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-blue-300">You're not a member of this group</p>
            <button 
              onClick={handleJoin}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Join Group
            </button>
          </div>
        )}

        {group.is_pending && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-300">Your join request is pending approval</p>
          </div>
        )}

        {/* Group Content Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button 
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 ${activeTab === 'posts' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          >
            Posts
          </button>
          <button 
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 ${activeTab === 'events' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
          >
            Events
          </button>
          {group.is_creator && (
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 ${activeTab === 'requests' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
            >
              Pending Requests
            </button>
          )}
        </div>

        {/* Group Content */}
        {group.is_member || group.is_creator ? (
          <div className="space-y-4">
            {/* Pending Requests Tab */}
            {activeTab === 'requests' && group.is_creator && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <PendingRequests groupId={group.id} />
              </div>
            )}
            
            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <p className="text-gray-400">Group posts will appear here</p>
              </div>
            )}
            
            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <p className="text-gray-400">Group events will appear here</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center">
            <p className="text-gray-400">Join the group to see posts and events</p>
          </div>
        )}
      </div>
    </div>
  )
}