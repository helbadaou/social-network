'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HomePage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [image, setImage] = useState(null)
  const [privacy, setPrivacy] = useState('public')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  //// AVATAR ET DROPDOWN
  const [user, setUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  ///// FENETRE POPUP
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPopup, setShowPopup] = useState(false)

  //// BOUTON FOLLOW/UNFOLLOW
  const [isFollowing, setIsFollowing] = useState(false)
  const [followStatus, setFollowStatus] = useState('') // '', 'accepted', 'pending'




  const router = useRouter()

  // Charger utilisateur
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

  // Charger posts
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

  // Publication d’un post
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

  const toggleProfile = () => {
    setShowProfile(!showProfile)
  }

  const handleSearch = async (e) => {
    const value = e.target.value
    setSearch(value)

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/search?query=${value}`, {
          credentials: 'include',
        })
        const data = await res.json()
        setResults(data)
        console.log(data);
      } catch (err) {
        console.error('Error searching users:', err)
      }
    } else {
      setResults([])
    }
  }

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

  const handleUserClick = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur chargement profil')
      const data = await res.json()
      setSelectedUser(data)

      // 👇 Vérifie le statut de follow
      const followRes = await fetch(`http://localhost:8080/api/follow/status/${userId}`, {
        credentials: 'include',
      })
      if (followRes.ok) {
        const { status } = await followRes.json()
        setFollowStatus(status) // 'accepted' | 'pending' | '' (non suivi)
      } else {
        setFollowStatus('')
      }
      setShowPopup(true)
    } catch (err) {
      console.error('Erreur chargement profil :', err.message)
    }
  }



  const fetchUserById = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/users/${userId}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Erreur chargement profil')
      const data = await res.json()
      setSelectedUser(data)
      setIsFollowing(data.is_following || false)
      setFollowStatus(data.follow_status || '')
      setShowPopup(true)
    } catch (err) {
      console.error('Erreur chargement profil utilisateur:', err)
    }
  }

  //// FOLLOW/ UNFOLLOW
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
      // alert(`⛔ ${err.message}`)
    }
  }

//   const closePopup = () => {
//     setShowPopup(false)
//     setSelectedUser(null)
//     setFollowStatus('')
//   }

//   const PopupProfil = ({ user, followStatus, setFollowStatus, onClose }) => {
//   return (
//     <div className="popup">
//       <button onClick={onClose}>Fermer</button>
//       <h2>{user.nickname}</h2>
//       {/* Suivre / suivre déjà, etc. */}
//     </div>
//   )
// }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🌐 NAVBAR */}
      <nav className="bg-white shadow flex justify-between items-center px-6 py-4">
        {/* 🔍 Search */}
        <div className="max-w-xl mx-auto mt-8 px-4">
          <input
            type="text"
            placeholder="🔍 Search users..."
            value={search}
            onChange={handleSearch}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none"
          />
          {results.length > 0 && (
            <div className="bg-white mt-2 rounded-md shadow-md">
              {results.map((u) => (
                <div
                  key={u.id}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                  onClick={() => handleUserClick(u.id)}
                >

                  <p className="font-medium">

                    {u.first_name}{u.last_name}
                  </p>
                  <p className="text-sm text-gray-500">@{u.nickname}</p>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* 👤 Avatar + Dropdown */}
        <div className="relative ml-4">
          <img
            src={user?.author_avatar && user.author_avatar.trim() !== '' ? user.author_avatar : '/avatar.png'}
            alt="Avatar"
            onClick={toggleProfile}
            className="w-10 h-10 rounded-full border cursor-pointer"
          />

          {showProfile && user && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg p-4 z-20">
              <h2 className="font-semibold">
                {user.FirstName} {user.LastName}
              </h2>
              <p className="text-sm text-gray-500">@{user.Nickname || 'anonymous'}</p>
              {user.About && <p className="text-sm text-blue-600 mt-2">{user.About}</p>}
              <p className="text-sm text-blue-600 mt-2">{user.Email}</p>
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

      {/* 💬 FORMULAIRE DE POST */}
      <div className="max-w-xl mx-auto mt-6 px-4">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow mb-6 flex flex-col gap-4">
          <textarea
            placeholder="Exprimez-vous..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border p-2 rounded resize-none text-sm text-gray-500"
            rows={3}
            required
          />
          <input type="file" accept="image/*"
            className="border p-2 rounded text-sm text-gray-500"
            onChange={(e) => setImage(e.target.files[0])}
          />
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            className="border p-2 rounded text-sm text-gray-500"
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
          {error && <p className="text-red-600">{error}</p>}
          {success && <p className="text-green-600">{success}</p>}
        </form>

        {/* 📄 AFFICHAGE DES POSTS */}
        {loading ? (
          <p>Chargement...</p>
        ) : posts.length === 0 ? (
          <p>Aucun post pour le moment.</p>
        ) : (
          posts.map((post, i) => (
            <div
              key={i}
              className="bg-white shadow rounded-xl p-4 mb-4 border"
            >
              <div
                onClick={() => fetchUserById(post.author_id)}
                className="flex items-center gap-3 mb-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
              >
                <img
                  src={post.author_avatar || '/avatar.png'}
                  alt={post.author_name}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div>
                  <div className="font-medium text-blue-600 hover:underline">
                    {post.author_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Publié le {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700">{post.content}</div>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="post"
                  className="mt-2 max-h-60 object-contain rounded"
                />
              )}
            </div>
          ))
        )}

        {showPopup && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative animate-fade-in">
              {/* ❌ Bouton fermer */}
              <button
                onClick={() => setShowPopup(false)}
                className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl"
              >
                ×
              </button>

              {/* 👤 Avatar */}
              <div className="flex flex-col items-center">
                <img
                  src={selectedUser.author_avatar || '/avatar.png'}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full border object-cover mb-3"
                />
                <h2 className="text-lg font-semibold text-center text-gray-500">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h2>
                <p className="text-gray-500 text-sm">{selectedUser.nickname || 'anonymous'}</p>
                {selectedUser.About && (
                  <p className="mt-2 text-sm text-blue-600 text-center text-gray-500">
                    {selectedUser.About || 'Vide'}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-600 text-center">{selectedUser.email}</p>
                {selectedUser.date_of_birth && (
                  <p className="text-sm text-gray-400 mt-2">
                    🎂 Né(e) le {selectedUser.date_of_birth}
                  </p>
                )}
                {selectedUser.id !== user?.ID && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={followStatus !== ''}
                    className={`mt-4 px-4 py-2 rounded-full text-sm font-medium ${followStatus === 'accepted'
                      ? 'bg-gray-300 text-gray-700 cursor-default'
                      : followStatus === 'pending'
                        ? 'bg-yellow-400 text-white cursor-default'
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}