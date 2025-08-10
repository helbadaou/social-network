"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './GroupDashboard.module.css';
import PostForm from '@/app/home/components/PostForm';
import Navbar from '@/app/home/components/Navbar';
import MessageSidebar from '@/app/messages/components/MessageSidebar';

export default function GroupDashboard({ group, onClose, isCreator, nonMembers, inviteUser, currentUser }) {
  // States
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showMessages, setShowMessages] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [realtimeNotification, setRealtimeNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commentsMap, setCommentsMap] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [chatUsers, setChatUsers] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [creating, setCreating] = useState(false);
  const [postSuccess, setPostSuccess] = useState("");

  const removeNotificationCallback = useRef(null);
  const ws = useRef(null);
  const fileInputRef = useRef();

  const togglePostForm = () => {
    setShowPostForm(prev => !prev)
  }

  // Placeholder functions for missing handlers
  const handleSearch = (searchTerm) => {
    setSearch(searchTerm);
    // Implement search logic
  };

  const handleLogout = () => {
    // Implement logout logic
  };

  const openMessages = () => {
    setShowMessages(true);
  };

  const handleNotificationRemoved = () => {
    setRealtimeNotification(null);
  };

  // Fetch group posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/posts`, {
        credentials: 'include',
      });
      const data = await res.json();
      setPosts(data || []);
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch group events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/events`, {
        credentials: 'include',
      });
      const data = await res.json();
      setEvents(data || []);
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Fetch group members
  const fetchChatUsers = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/members`);
      const data = await res.json();
      setChatUsers(data);
    } catch (err) {
      console.error('Failed to fetch group members', err);
    }
  };

  // Handle post submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const formData = new FormData();
    formData.append('content', content);
    formData.append('group_id', group.id);
    if (image) formData.append('image', image);

    try {
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const newPost = await res.json();
        setPosts(prev => [newPost, ...prev]);
        setContent('');
        setImage(null);
        setPostSuccess('Post created successfully!');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        throw new Error(await res.text());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // WebSocket setup for group chat
  useEffect(() => {
    if (!group?.id || !currentUser?.ID) return;

    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      ws.current = socket;
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'group' && msg.group_id === group.id) {
          setGroupMessages(prev => [...prev, {
            ...msg,
            id: `${msg.from}-${msg.timestamp}-${Date.now()}`
          }]);
        }
      } catch (err) {
        console.error('WebSocket error:', err);
      }
    };

    // Load message history
    const loadMessages = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/groups/${group.id}/messages`);
        const data = await res.json();
        setGroupMessages(data || []);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    loadMessages();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [group?.id, currentUser?.ID]);

  // Load data when tab changes
  useEffect(() => {
    if (!group?.id) return;

    if (activeTab === 'posts') fetchPosts();
    else if (activeTab === 'events') fetchEvents();
    else if (activeTab === 'chat') fetchChatUsers();
  }, [activeTab, group?.id]);

  return (
    <div className={styles.groupDashboardOverlay}>
      <Navbar
        user={currentUser}
        handleSearch={handleSearch}
        handleLogout={handleLogout}
        results={results}
        openMessages={openMessages}
        togglePostForm={togglePostForm}
        realtimeNotification={realtimeNotification}
        fetchChatUsers={fetchChatUsers}
        hideActions={true}
        hideSearch={true}
        onNotificationRemoved={handleNotificationRemoved}
      />

      {showMessages && (
        <MessageSidebar
          chatUsers={chatUsers}
          showMessages={showMessages}
          setShowMessages={setShowMessages}
          openChat={(user) => {
            // Implement open chat logic if needed
          }}
          currentUserId={currentUser?.ID}
          fetchChatUsers={fetchChatUsers}
        />
      )}

      {showPostForm && (
        <div className={styles.postFormOverlay}>
          <div className={styles.postFormModal}>
            <PostForm
              content={content}
              setContent={setContent}
              image={image}
              setImage={setImage}
              handleSubmit={handleSubmit}
              creating={creating}
              error={error}
              success={postSuccess}
              ref={fileInputRef}
              onClose={() => setShowPostForm(false)}
              isGroupPost={true}
            />
          </div>
        </div>
      )}

      <div className={styles.groupDashboardPopup}>
        <div className={styles.header}>
          <h2 className={styles.title}>{group.title}</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'posts' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'chat' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
        </div>

        <div className={styles.content}>
          {loading && <div className={styles.loading}>Loading...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {activeTab === 'posts' && (
            <div className={styles.postsSection}>
              {posts.length === 0 && !loading ? (
                <div className={styles.emptyState}>No posts yet</div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className={styles.postCard}>
                    <div className={styles.postHeader}>
                      <span className={styles.postAuthor}>{post.author}</span>
                      <span className={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    {post.image && (
                      <img src={post.image} alt="Post" className={styles.postImage} />
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className={styles.eventsSection}>
              {isCreator && (
                <div className={styles.createEventForm}>
                  <h3>Create Event</h3>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className={styles.input}
                  />
                  <textarea
                    placeholder="Event description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className={styles.textarea}
                  />
                  <input
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                    className={styles.input}
                  />
                  <button className={styles.createButton}>Create Event</button>
                </div>
              )}
              
              {events.length === 0 && !loading ? (
                <div className={styles.emptyState}>No events scheduled</div>
              ) : (
                events.map(event => (
                  <div key={event.id} className={styles.eventCard}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    <p className={styles.eventDescription}>{event.description}</p>
                    <span className={styles.eventDate}>
                      {new Date(event.event_date).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className={styles.chatSection}>
              <div className={styles.chatMessages}>
                {groupMessages.map(msg => (
                  <div key={msg.id} className={styles.chatMessage}>
                    <span className={styles.chatAuthor}>{msg.from}:</span>
                    <span className={styles.chatText}>{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className={styles.chatInput}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={groupMessageInput}
                  onChange={(e) => setGroupMessageInput(e.target.value)}
                  className={styles.input}
                />
                <button className={styles.sendButton}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}