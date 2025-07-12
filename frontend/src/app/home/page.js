'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [privacy, setPrivacy] = useState('public')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
 
  // Avatar and dropdown
  const [user, setUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  // Messages sidebar
  const [showMessages, setShowMessages] = useState(false)
  // Popup user profile
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  // Follow status
  const [followStatus, setFollowStatus] = useState('') // '', 'accepted', 'pending'

  // Chat users & open chat windows
  const [chatUsers, setChatUsers] = useState([])
  const [openChats, setOpenChats] = useState([])

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const ws = useRef(null)


  const router = useRouter()

  // Open a chat window if not already opened
  const openChat = (user) => {
    if (!openChats.some((c) => c.id === user.id)) {
      setOpenChats((prev) => [...prev, user])
    }
  }

  // Fetch chat users on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('http://localhost:8080/api/chat-users', {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to fetch users')
        const data = await res.json()
        setChatUsers(data)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    })();
  }, [])

  // Fetch logged-in user profile on mount
  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/profile', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setUser(data)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  // Fetch posts
  const fetchPosts = () => {
    setLoading(true)
    fetch('http://localhost:8080/api/posts', {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`Erreur ${res.status}: ${text}`)
          })
        }
        return res.json()
      })
      .then(data => {
        setPosts(data)
      })
      .catch(err => {
        console.error('Erreur fetch :', err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  // Handle new post submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setCreating(true)

    const formData = new FormData()
    formData.append('content', content)
    formData.append('privacy', privacy)
    if (image) formData.append('image', image)

    try {
      const res = await fetch('http://localhost:8080/api/posts', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Erreur lors de la publication')

      setSuccess('✅ Post publié !')
      setContent('')
      setImage(null)
      setPrivacy('public')
      fetchPosts()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Toggle profile dropdown visibility
  const toggleProfile = () => {
    setShowProfile(!showProfile)
  }

  // Search users on input
  const handleSearch = async (e) => {
    const value = e.target.value
    setSearch(value)

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/search?query=${value}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to search users')
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error('Error searching users:', err)
      }
    } else {
      setResults([])
    }
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setUser(null)
        setShowProfile(false)
        router.push('/login')
      } else {
        throw new Error('Logout failed')
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (!Array.isArray(posts)) {
    return <p>Erreur lors du chargement des posts.</p>
  }

  // Open user popup and check follow status
  const handleUserClick = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur chargement profil')
      const data = await res.json()
      setSelectedUser(data)

      const followRes = await fetch(`http://localhost:8080/api/follow/status/${userId}`, {
        credentials: 'include',
      })
      if (followRes.ok) {
        const { status } = await followRes.json()
        setFollowStatus(status)
      } else {
        setFollowStatus('')
      }
      setShowPopup(true)
    } catch (err) {
      console.error('Erreur chargement profil :', err.message)
    }
  }

  // Fetch user by id to show profile popup (alternative)
  const fetchUserById = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur chargement profil')
      const data = await res.json()
      setSelectedUser(data)
      setFollowStatus(data.follow_status || '')
      setShowPopup(true)
    } catch (err) {
      console.error('Erreur chargement profil utilisateur:', err)
    }
  }

  // Follow / unfollow toggle
  const handleFollowToggle = async () => {
    if (!selectedUser || followStatus !== '') return

    try {
      const res = await fetch('http://localhost:8080/api/follow', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followed_id: selectedUser.id }),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erreur lors de la requête follow')
      }

      if (selectedUser.is_private) {
        setFollowStatus('pending')
      } else {
        setFollowStatus('accepted')
      }
    } catch (err) {
      console.error('Erreur follow :', err?.message || err)
    }
  }

  // ChatBox component inside HomePage
  function ChatBox({ currentUser, recipient, onClose }) {



    useEffect(() => {
      ws.current = new WebSocket('ws://localhost:8080/ws');

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected')
      }

      ws.current.onmessage = (event) => {
        const msg = JSON.parse(event.data)

        if (
          (msg.from === currentUser.ID && msg.to === recipient.ID) ||
          (msg.from === recipient.ID && msg.to === currentUser.ID)
        ) {
          setMessages((prev) => [...prev, msg])
        }
      }

      ws.current.onclose = () => {
        console.log('❌ WebSocket disconnected')
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };


      return () => {
        if (ws.current) {
          ws.current.close();
        }
      };
    }, [recipient.ID, currentUser.ID]);


    const sendMessage = () => {
      if (input.trim()) {
        //if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          const messageObj = {
            from: currentUser.ID,
            to: recipient.ID,
            content: input,
            type: 'private',
          };

          ws.current.send(JSON.stringify(messageObj));
          setMessages((prev) => [...prev, messageObj]);
          setInput('');
       // } else {
        //  console.warn('WebSocket not open. Cannot send message.');
       // }
      }
    }

    return (
      <div className="w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-white">{recipient.full_name}</span>
          <button
            className="text-red-400 text-xs"
            onClick={onClose}
          >
            ✖
          </button>
        </div>
        <div className="h-32 overflow-y-auto bg-gray-900 rounded p-2 text-sm text-gray-300 flex-1 mb-2">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">Aucun message pour le moment...</p>
          ) : (
            messages.map((m, idx) => (
              <p key={idx} className={`mb-1 ${m.from === currentUser.ID ? 'text-right text-blue-400' : 'text-left text-gray-300'}`}>
                {m.content}
              </p>
            ))
          )}
        </div>
        <div className="flex">
          <input
            type="text"
            placeholder="Écrire un message..."
            className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-l px-2 py-1 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }}
          />
          <button
            className="bg-blue-600 text-white px-2 rounded-r text-sm"
            onClick={sendMessage}
          >
            Envoyer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* NAVBAR */}
      <nav className="bg-gray-900 shadow flex justify-between items-center px-6 py-4 border-b border-gray-800">
        {/* SEARCH */}
        <div className="max-w-xl w-full relative">
          <input
            type="text"
            placeholder="🔍 Rechercher un utilisateur..."
            value={search}
            onChange={handleSearch}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 bg-gray-800 mt-2 rounded-md shadow-lg z-30 border border-gray-700 max-h-64 overflow-y-auto">
              {results.map((u) => (
                <div
                  key={u.id}
                  className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700"
                  onClick={() => handleUserClick(u.id)}
                >
                  <p className="font-medium text-white">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-sm text-gray-400">@{u.nickname}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MESSAGE ICON */}
        <button onClick={() => setShowMessages(true)} className="relative">
          <img src="/message-icon.png" alt="Messages" className="w-6 h-6" />
        </button>

        {/* AVATAR + DROPDOWN */}
        <div className="relative ml-6">
          <img
            src={user?.author_avatar?.trim() ? user.author_avatar : '/avatar.png'}
            alt="Avatar"
            onClick={toggleProfile}
            className="w-10 h-10 rounded-full border border-blue-600 cursor-pointer"
          />

          {showProfile && user && (
            <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-4 z-20">
              <h2 className="font-semibold text-white">
                {user.FirstName} {user.LastName}
              </h2>
              <p className="text-sm text-gray-400">@{user.Nickname || 'anonymous'}</p>
              {user.About && <p className="text-sm text-blue-400 mt-2">{user.About}</p>}
              <p className="text-sm text-blue-400 mt-2">{user.Email}</p>
              <button
                onClick={handleLogout}
                className="mt-3 text-sm text-red-500 hover:underline"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* MESSAGES SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-gray-900 shadow-lg transform transition-transform duration-300 z-40 ${showMessages ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-400">📨 Messages</h2>
          <button
            onClick={() => setShowMessages(false)}
            className="text-gray-400 hover:text-white"
          >
            ✖
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100%-56px)]">
          {chatUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-800 p-2 rounded-md"
              onClick={() => openChat(u)}
            >
              <img src={u.avatar || '/avatar.png'} className="w-8 h-8 rounded-full" alt="avatar" />
              <span className="text-sm font-medium text-white">{u.full_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* OPEN CHAT BOXES */}
      <div className="fixed bottom-4 right-72 flex gap-4 z-40">
        {openChats.map((u) => (
          <ChatBox
            key={u.id}
            recipient={u}
            currentUser={user}
            onClose={() => setOpenChats(openChats.filter((c) => c.id !== u.id))}
          />
        ))}
      </div>

      {/* POST FORM + POSTS */}
      <div className="max-w-xl mx-auto mt-6 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 p-4 rounded-xl shadow mb-6 flex flex-col gap-4 border border-gray-700"
        >
          <textarea
            placeholder="Exprimez-vous..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-gray-800 border border-gray-700 p-2 rounded resize-none text-sm text-white"
            rows={3}
            required
          />
          <input
            type="file"
            accept="image/*"
            className="bg-gray-800 border border-gray-700 p-2 rounded text-sm text-white"
            onChange={(e) => setImage(e.target.files[0])}
          />
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="bg-gray-800 border border-gray-700 p-2 rounded text-sm text-white"
          >
            <option value="public">Public</option>
            <option value="followers">Abonnés</option>
            <option value="private">Privé</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            disabled={creating}
          >
            {creating ? 'Publication...' : 'Publier'}
          </button>
          {error && <p className="text-red-400">{error}</p>}
          {success && <p className="text-green-400">{success}</p>}
        </form>

        {loading ? (
          <p className="text-gray-400">Chargement...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400">Aucun post pour le moment.</p>
        ) : (
          posts.map((post, i) => (
            <div
              key={i}
              className="bg-gray-800 shadow rounded-xl p-4 mb-4 border border-gray-700"
            >
              <div
                onClick={() => fetchUserById(post.author_id)}
                className="flex items-center gap-3 mb-2 cursor-pointer hover:bg-gray-700 p-2 rounded"
              >
                <img
                  src={post.author_avatar || '/avatar.png'}
                  alt={post.author_name}
                  className="w-10 h-10 rounded-full object-cover border border-gray-600"
                />
                <div>
                  <div className="font-medium text-blue-400 hover:underline">
                    {post.author_name}
                  </div>
                  <div className="text-sm text-gray-400">
                    Publié le {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-200 whitespace-pre-wrap">{post.content}</div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="post"
                  className="mt-2 max-h-60 object-contain rounded border border-gray-700"
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* USER PROFILE POPUP */}
      {showPopup && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-gray-700">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>

            <div className="flex flex-col items-center">
              <img
                src={selectedUser.author_avatar || '/avatar.png'}
                alt="Avatar"
                className="w-20 h-20 rounded-full border border-gray-600 object-cover mb-3"
              />
              <h2 className="text-lg font-semibold text-center text-white">
                {selectedUser.first_name} {selectedUser.last_name}
              </h2>
              <p className="text-gray-400 text-sm">@{selectedUser.nickname || ''}</p>
              {selectedUser.About && (
                <p className="mt-2 text-sm text-blue-400 text-center">{selectedUser.About}</p>
              )}
              <p className="mt-1 text-sm text-gray-400 text-center">{selectedUser.email}</p>
              {selectedUser.date_of_birth && (
                <p className="text-sm text-gray-500 mt-2">
                  🎂 Né(e) le {selectedUser.date_of_birth}
                </p>
              )}
              {selectedUser.id !== user?.ID && (
                <button
                  onClick={handleFollowToggle}
                  disabled={followStatus !== ''}
                  className={`mt-4 px-4 py-2 rounded-full text-sm font-medium cursor-pointer ${followStatus === 'accepted'
                      ? 'bg-gray-500 text-white cursor-default'
                      : followStatus === 'pending'
                        ? 'bg-yellow-500 text-white cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {followStatus === 'accepted'
                    ? '✔ Abonné'
                    : followStatus === 'pending'
                      ? '🕓 En attente'
                      : '+ Suivre'}
                </button>
              )}

              <button
                className="mt-3 text-blue-400 text-sm hover:underline cursor-pointer"
                onClick={() => {
                  setShowPopup(false)
                  router.push(`/profile/${selectedUser.id}`)
                }}
              >
                Voir le profil complet →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
