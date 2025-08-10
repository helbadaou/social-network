'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PendingRequests from '../components/PendingRequests'
import PostForm from '../../home/components/PostForm'
import { use } from 'react'
import { useSharedWorker } from '../../../contexts/SharedWorkerContext'
import { useAuth } from '../../../contexts/AuthContext'
import styles from './GroupsPage.module.css'

export default function GroupDetailPage({ params }) {
  // Group and UI state
  const { groupId } = use(params)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)

  // Content state
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [creating, setCreating] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)

  // Comment state
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [loadingComments, setLoadingComments] = useState({})
  const [postingComment, setPostingComment] = useState({})

  // Chat state
  const [groupChatInput, setGroupChatInput] = useState('')
  const [groupChatMessages, setGroupChatMessages] = useState([])

  // Auth 
  const { user } = useAuth()
  
  // Try to use SharedWorker, but provide fallbacks
  let sharedWorkerContext
  try {
    sharedWorkerContext = useSharedWorker()
  } catch (error) {
    console.warn('SharedWorker context not available, using fallback')
    sharedWorkerContext = {
      sendWorkerMessage: () => console.log('SharedWorker not available'),
      isConnected: false,
      addMessageListener: () => {},
      removeMessageListener: () => {}
    }
  }
  
  const { sendWorkerMessage, isConnected, addMessageListener, removeMessageListener } = sharedWorkerContext

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: ''
  })

  // Other hooks and refs
  const router = useRouter()
  const fileInputRef = useRef()
  const [chatUsers, setChatUsers] = useState([])
  const [realtimeNotification, setRealtimeNotification] = useState(null)

  // Initialize shared worker when user is available
  useEffect(() => {
    if (user?.id) {
      console.log("Initializing SharedWorker with user ID:", user.id)
      sendWorkerMessage({ 
        type: 'INIT', 
        userId: user.id,
        userName: user.name || user.username || 'User'
      })
      
      // Join the group chat room
      sendWorkerMessage({
        type: 'JOIN_GROUP_CHAT',
        groupId: parseInt(groupId),
        userId: user.id
      })
    }
  }, [user, sendWorkerMessage, groupId])

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/chat/history`, {
          credentials: 'include'
        })
        if (res.ok) {
          const history = await res.json()
          const formattedMessages = history.map(msg => ({
            ...msg,
            isCurrentUser: msg.sender_id === user?.id,
            timestamp: msg.created_at || msg.timestamp
          }))
          setGroupChatMessages(formattedMessages)
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
      }
    }

    if (user?.id && groupId) {
      loadChatHistory()
    }
  }, [user, groupId])

  // Handle incoming messages from the shared worker
  useEffect(() => {
    if (!user?.id) return

    const messageHandler = (event) => {
      const { type, data } = event.data

      switch (type) {
        case 'group_message':
          if (data.group_id === parseInt(groupId)) {
            setGroupChatMessages(prev => [...prev, {
              ...data,
              isCurrentUser: data.sender_id === user.id
            }])
          }
          break
        case 'notification':
          setRealtimeNotification(data)
          break
        case 'status':
          // Connection status updates are already handled by the context
          break
        default:
          console.log('Unknown message type:', type)
      }
    }

    if (addMessageListener && typeof addMessageListener === 'function') {
      addMessageListener(messageHandler)
    }

    return () => {
      if (removeMessageListener && typeof removeMessageListener === 'function') {
        removeMessageListener(messageHandler)
      }
    }
  }, [groupId, user?.id, addMessageListener, removeMessageListener])

  // Send group chat message through shared worker
  const sendGroupChatMessage = () => {
    if (!groupChatInput.trim() || !user?.id || !isConnected) return

    const tempId = `temp_${Date.now()}_${Math.random()}`
    const messageContent = groupChatInput.trim()
    
    // Create the message object
    const message = {
      type: 'SEND_GROUP_MESSAGE',
      data: {
        groupId: parseInt(groupId),
        senderId: user.id,
        content: messageContent,
        timestamp: new Date().toISOString(),
        tempId: tempId
      }
    }

    // Optimistically add the message to UI
    const optimisticMessage = {
      id: tempId,
      tempId: tempId,
      content: messageContent,
      sender_id: user.id,
      sender_name: user.name || user.username || 'You',
      group_id: parseInt(groupId),
      timestamp: new Date().toISOString(),
      isCurrentUser: true,
      pending: true
    }

    setGroupChatMessages(prev => [...prev, optimisticMessage])
    setGroupChatInput('')

    // Send through shared worker
    sendWorkerMessage(message)
  }

  // Handle key press in chat input
  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendGroupChatMessage()
    }
  }

  // Handle chat input change
  const handleChatInputChange = (e) => {
    setGroupChatInput(e.target.value)
  }

  // Toggle chat visibility
  const toggleGroupChat = () => {
    console.log('Toggle chat clicked, current state:', showGroupChat)
    console.log('IsConnected:', isConnected)
    console.log('User:', user)
    
    setShowGroupChat(prev => {
      const newState = !prev
      console.log('Setting showGroupChat to:', newState)
      
      if (newState && user?.id) {
        // When opening chat, ensure we're connected to the group
        console.log('Joining group chat for group:', groupId)
        sendWorkerMessage({
          type: 'JOIN_GROUP_CHAT',
          groupId: parseInt(groupId),
          userId: user.id
        })
      }
      return newState
    })
  }

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
      })

      if (!res.ok) throw new Error('Failed to submit response')
      fetchEvents()
    } catch (err) {
      console.error('Error submitting response:', err)
    }
  }

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

      if (data?.length) {
        data.forEach(post => {
          fetchComments(post.id)
        })
      }
    } catch (err) {
      console.error('Failed to fetch posts', err)
    }
  }

  const fetchComments = async (postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to fetch comments')

      const data = await res.json()
      setComments(prev => ({
        ...prev,
        [postId]: data || []
      }))
    } catch (err) {
      console.error('Failed to fetch comments', err)
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
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

  const handleCommentSubmit = async (postId) => {
    const content = commentInputs[postId]?.trim()
    if (!content) return

    try {
      setPostingComment(prev => ({ ...prev, [postId]: true }))

      const res = await fetch(`/api/groups/${groupId}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content
        }),
        credentials: 'include'
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to post comment')
      }

      const newComment = await res.json()
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }))
      setCommentInputs(prev => ({
        ...prev,
        [postId]: ''
      }))
    } catch (err) {
      console.error('Error posting comment:', err)
    } finally {
      setPostingComment(prev => ({ ...prev, [postId]: false }))
    }
  }

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [postId]: value
    }))
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    setCreatingEvent(true)

    try {
      const requestBody = {
        group_id: parseInt(groupId),
        title: eventForm.title,
        description: eventForm.description,
        event_date: new Date(eventForm.eventDate).toISOString()
      }

      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error('Failed to create event: ' + errorText)
      }

      const newEvent = await res.json()
      setEvents(prev => [newEvent, ...prev])
      setEventForm({
        title: '',
        description: '',
        eventDate: ''
      })
      setShowEventForm(false)
    } catch (err) {
      console.error('Error creating event:', err)
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleEventChange = (e) => {
    const { name, value } = e.target
    setEventForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleJoin = async (e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to join group')

      const refreshRes = await fetch(`/api/groups/${groupId}`)
      if (refreshRes.ok) {
        setGroup(await refreshRes.json())
      }
    } catch (err) {
      console.error('Error joining group:', err)
    }
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

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingPulse}>
          <div className={styles.loadingTitle}></div>
          <div className={styles.loadingText}></div>
          <div className={styles.loadingBox}></div>
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        {error}
      </div>
    </div>
  )

  return (
    <div className={styles.pageContainer}>
      {showPostForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
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
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <form onSubmit={handleEventSubmit} className={styles.eventForm}>
              <h2 className={styles.eventFormTitle}>Create New Event</h2>

              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.formLabel}>
                  Event Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
                  rows={3}
                  className={styles.formTextarea}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="eventDate" className={styles.formLabel}>
                  Event Date & Time
                </label>
                <input
                  type="datetime-local"
                  id="eventDate"
                  name="eventDate"
                  value={eventForm.eventDate}
                  onChange={handleEventChange}
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className={styles.cancelButton}
                  disabled={creatingEvent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={creatingEvent}
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.container}>
        <div className={styles.groupHeader}>
          <h1 className={styles.groupTitle}>{group?.title}</h1>
          <p className={styles.groupDescription}>{group?.description}</p>

          <div className={styles.groupMeta}>
            <span>👥 {group?.member_count} members</span>
            <span>🕒 Created {group?.created_at ? new Date(group.created_at).toLocaleDateString() : ''}</span>
            {group?.is_creator && (
              <span className={styles.adminBadge}>
                Admin
              </span>
            )}
          </div>
        </div>

        {!group?.is_member && !group?.is_pending && !group?.is_creator && (
          <div className={styles.notMemberNotice}>
            <p className={styles.notMemberText}>You're not a member of this group</p>
            <button
              onClick={handleJoin}
              className={styles.joinButton}
            >
              Join Group
            </button>
          </div>
        )}

        {group?.is_pending && (
          <div className={styles.pendingNotice}>
            <p className={styles.pendingText}>Your join request is pending approval</p>
          </div>
        )}

        <div className={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('posts')}
            className={`${styles.tabButton} ${activeTab === 'posts' ? styles.activeTab : ''}`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`${styles.tabButton} ${activeTab === 'events' ? styles.activeTab : ''}`}
          >
            Events
          </button>
          {group?.is_creator && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`${styles.tabButton} ${activeTab === 'requests' ? styles.activeTab : ''}`}
            >
              Pending Requests
            </button>
          )}
        </div>

        {group?.is_member || group?.is_creator ? (
          <div>
            {activeTab === 'posts' && (
              <button
                onClick={togglePostForm}
                className={styles.contentButton}
              >
                Create Post
              </button>
            )}

            {activeTab === 'events' && (
              <button
                onClick={toggleEventForm}
                className={styles.contentButton}
              >
                Create Event
              </button>
            )}

            {activeTab === 'requests' && group?.is_creator && (
              <div className={styles.postsContainer}>
                <PendingRequests groupId={group.id} />
              </div>
            )}

            {activeTab === 'posts' && (
              <div className={styles.postsContainer}>
                {posts.length > 0 ? (
                  posts.map(post => (
                    <div key={post.id} className={styles.postItem}>
                      <p className={styles.postContent}>{post.content}</p>
                      {post.image && (
                        <img
                          src={`${post.image}`}
                          alt="Post"
                          className={styles.postImage}
                        />
                      )}

                      <div className={styles.commentsContainer}>
                        {loadingComments[post.id] ? (
                          <div>Loading comments...</div>
                        ) : (
                          <div>
                            {comments[post.id]?.map(comment => (
                              <div key={comment.id} className={styles.commentItem}>
                                <p className={styles.commentText}>{comment.content}</p>
                                <p className={styles.commentMeta}>
                                  {comment.creator_name} • {new Date(comment.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={styles.commentForm}>
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => handleCommentChange(post.id, e.target.value)}
                            className={styles.commentInput}
                          />
                          <button
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={postingComment[post.id]}
                            className={styles.commentButton}
                          >
                            {postingComment[post.id] ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No posts yet. Be the first to post!</p>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className={styles.eventsContainer}>
                {events.length > 0 ? (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className={styles.eventItem}
                    >
                      <div>
                        <div className={styles.eventHeader}>
                          <h3 className={styles.eventTitle}>{event.title}</h3>
                          {group?.is_creator && (
                            <span className={styles.organizerBadge}>
                              Organizer
                            </span>
                          )}
                        </div>

                        <p className={styles.eventDescription}>{event.description}</p>

                        <div className={styles.eventMeta}>
                          <div className={styles.eventDate}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(event.event_date).toLocaleString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>

                          <div className={styles.eventCreator}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {event.creator_name}
                          </div>
                        </div>

                        <div className={styles.eventVotes}>
                          <div className={styles.voteButtons}>
                            <div className={styles.voteButtonGroup}>
                              <button
                                onClick={() => handleVote(event.id, 'going')}
                                className={`${styles.voteButton} ${event.user_response === 'going' ? styles.goingButtonActive : styles.goingButton}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Going
                              </button>
                              <span className={styles.voteCount}>
                                {event.going_count || 0}
                              </span>
                            </div>

                            <div className={styles.voteButtonGroup}>
                              <button
                                onClick={() => handleVote(event.id, 'not_going')}
                                className={`${styles.voteButton} ${event.user_response === 'not_going' ? styles.notGoingButtonActive : styles.notGoingButton}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Not Going
                              </button>
                              <span className={styles.voteCount}>
                                {event.not_going_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noEvents}>
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" className={styles.noEventsIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className={styles.noEventsTitle}>No events yet</h3>
                      <p className={styles.noEventsText}>Be the first to create an event!</p>
                      <button
                        onClick={toggleEventForm}
                        className={styles.createEventButton}
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
          <div className={styles.postsContainer}>
            <p>Join the group to see posts and events</p>
          </div>
        )}
      </div>

      <button
        onClick={toggleGroupChat}
        className={styles.chatButton}
        title={`Group Chat ${!isConnected ? '(Offline)' : ''}`}
        style={{ opacity: !isConnected ? 0.6 : 1 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {showGroupChat && (
        <div className={styles.chatOverlay}>
          <div className={styles.chatContainer}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitle}>
                Group Chat: {group?.title}
                <span className={`${styles.statusIndicator} ${isConnected ? styles.statusOnline : styles.statusOffline}`}></span>
              </div>
              <button
                onClick={toggleGroupChat}
                className={styles.closeButton}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.chatMessages}>
              {groupChatMessages.length === 0 ? (
                <p className={styles.noMessages}>
                  {isConnected ? "No messages yet. Start the conversation!" : "Connecting to chat..."}
                </p>
              ) : (
                groupChatMessages.map((msg, index) => (
                  <div
                    key={msg.id || msg.tempId || index}
                    className={`${styles.messageContainer} ${msg.isCurrentUser ? styles.messageCurrentUser : styles.messageOtherUser}`}
                  >
                    <div
                      className={`${styles.messageBubble} ${msg.isCurrentUser ? styles.messageCurrentUserBubble : styles.messageOtherUserBubble} ${msg.pending ? 'opacity-70' : ''}`}
                    >
                      <p className={styles.messageText}>{msg.content}</p>
                      <p className={styles.messageMeta}>
                        {msg.isCurrentUser ? 'You' : msg.sender_name || 'User'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.pending && ' • Sending...'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.chatInputContainer}>
              <div className={styles.chatForm}>
                <input
                  type="text"
                  value={groupChatInput}
                  onChange={handleChatInputChange}
                  onKeyPress={handleChatKeyPress}
                  placeholder={isConnected ? "Type a message..." : "Connecting..."}
                  disabled={!isConnected || !user}
                  className={styles.chatInput}
                />
                <button
                  onClick={sendGroupChatMessage}
                  disabled={!groupChatInput.trim() || !isConnected || !user}
                  className={styles.chatSendButton}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}