// src/app/groups/[groupId]/page.js
'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../home/components/Navbar'
import PendingRequests from '../components/PendingRequests'
import PostForm from '../../home/components/PostForm'
import { use } from 'react'

export default function GroupDetailPage({ params }) {
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const router = useRouter()
  const [realtimeNotification, setRealtimeNotification] = useState(null)
  const [chatUsers, setChatUsers] = useState([])
  const [showPostForm, setShowPostForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const fileInputRef = useRef()

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: ''
  })

  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  const toggleEventForm = () => {
    setShowEventForm(prev => !prev)
  }

  const handleNotificationRemoved = () => {
    setRealtimeNotification(null)
  }

  const handleVote = async (eventId, response) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/events/${eventId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to submit response');

      // Refresh events after voting
      fetchEvents();
    } catch (err) {
      console.error('Error submitting response:', err);
    }
  };

  const fetchChatUsers = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership`)
      if (!res.ok) throw new Error('Failed to fetch group members')
      const data = await res.json()
      setChatUsers(data)
    } catch (err) {
      console.error('Failed to fetch group members', err)
    }
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/posts`)
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setPosts(data || [])
    } catch (err) {
      console.error('Failed to fetch posts', err)
    }
  }

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/events`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data || [])
    } catch (err) {
      console.error('Failed to fetch events', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setCreating(true)

    const formData = new FormData()
    formData.append('content', content)
    formData.append('group_id', groupId)
    if (image) formData.append('image', image)

    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to create post')

      const newPost = await res.json()
      setPosts(prev => [newPost, ...prev])
      setContent('')
      setImage(null)
      setShowPostForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error creating post:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);

    try {
      // Create the request object matching exactly the Go struct
      const requestBody = {
        group_id: parseInt(groupId), // Ensure it's a number
        title: eventForm.title,
        description: eventForm.description,
        event_date: new Date(eventForm.eventDate).toISOString()
      };

      console.log("Request payload:", requestBody); // For debugging

      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error('Failed to create event: ' + errorText);
      }

      const newEvent = await res.json();
      setEvents(prev => [newEvent, ...prev]);
      setEventForm({
        title: '',
        description: '',
        eventDate: ''
      });
      setShowEventForm(false);
    } catch (err) {
      console.error('Error creating event:', err);
      // Optionally show error to user
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        if (!res.ok) throw new Error('Failed to fetch group')
        const data = await res.json()
        setGroup(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
    fetchPosts()
    fetchEvents()
  }, [groupId])

  const handleJoin = async (e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to join group')

      // Refresh group data
      const refreshRes = await fetch(`/api/groups/${groupId}`)
      if (refreshRes.ok) {
        setGroup(await refreshRes.json())
      }
    } catch (err) {
      console.error('Error joining group:', err)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900">
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />
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
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />
      <div className="max-w-4xl mx-auto p-4 text-red-500">
        {error}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Navbar
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />

      {showPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <PostForm
              content={content}
              setContent={setContent}
              image={image}
              setImage={setImage}
              handleSubmit={handleSubmit}
              creating={creating}
              fileInputRef={fileInputRef}
              onClose={() => setShowPostForm(false)}
              isGroupPost={true}
            />
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Create New Event</h2>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium text-gray-300 mb-1">
                  Event Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={eventForm.eventDate}
                  onChange={handleEventChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  disabled={creatingEvent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  disabled={creatingEvent}
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            {/* Create Post Button (only visible in posts tab) */}
            {activeTab === 'posts' && (
              <button
                onClick={togglePostForm}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Post
              </button>
            )}

            {/* Create Event Button (only visible in events tab) */}
            {activeTab === 'events' && (
              <button
                onClick={toggleEventForm}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Event
              </button>
            )}

            {/* Pending Requests Tab */}
            {activeTab === 'requests' && group.is_creator && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                <PendingRequests groupId={group.id} />
              </div>
            )}

            {/* Posts Tab */}
            {activeTab === 'posts' && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                {posts.length > 0 ? (
                  posts.map(post => (
                    <div key={post.id} className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-white">{post.content}</p>
                      {post.image && (
                        <img
                          src={`${post.image}`}
                          alt="Post"
                          className="mt-2 rounded-lg max-w-full h-auto"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No posts yet. Be the first to post!</p>
                )}
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                {events !== null ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold text-white">{event.title}</h3>
                          {group.is_creator && (
                            <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-xs">
                              Organizer
                            </span>
                          )}
                        </div>

                        <p className="text-gray-300">{event.description}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(event.eventDate).toLocaleString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>

                          <div className="flex items-center text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {event.creatorName}
                          </div>
                        </div>

                        {/* Voting section */}
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <div className="flex items-center gap-4">
                            {/* Going button */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVote(event.id, 'going')}
                                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${event.user_response === 'going'
                                    ? 'bg-green-600/20 text-green-400 border border-green-600/50'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
                                  }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Going
                              </button>
                              <span className="text-gray-300 text-sm px-2 py-1 bg-gray-700/50 rounded-lg">
                                {event.going_count || 0}
                              </span>
                            </div>

                            {/* Not Going button */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVote(event.id, 'not_going')}
                                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${event.user_response === 'not_going'
                                    ? 'bg-red-600/20 text-red-400 border border-red-600/50'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50'
                                  }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Not Going
                              </button>
                              <span className="text-gray-300 text-sm px-2 py-1 bg-gray-700/50 rounded-lg">
                                {event.not_going_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700/50">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-400">No events yet</h3>
                      <p className="text-gray-500">Be the first to create an event!</p>
                      <button
                        onClick={toggleEventForm}
                        className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Event
                      </button>
                    </div>
                  </div>
                )}
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