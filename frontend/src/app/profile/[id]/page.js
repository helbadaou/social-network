'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function PublicProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('posts'); // 'posts' | 'followers' | 'following'
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);



  useEffect(() => {
    if (!id) return
    fetch(`http://localhost:8080/api/users/${id}`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setProfile(data)
        if (!data.is_private || data.is_followed || data.is_owner) {
          // Si je peux voir le contenu : charger posts + followers
          loadPosts(id)
          // loadFollowData(id)
        }
      })
      .catch((err) => {
        console.error('Erreur chargement profil :', err)
        setError("Ce profil n'existe pas.")
      })
  }, [id])


  const loadPosts = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/user-posts/${id}`, {
        credentials: 'include',
      })

      const text = await res.text()

      if (!res.ok) {
        throw new Error(text)
      }

      const data = JSON.parse(text)
      setPosts(data)
    } catch (err) {
      console.error('Erreur chargement posts :', err.message)
      setError(err.message)
    }

  }

  const loadFollowers = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/users-followers/${id}`, {
        credentials: 'include',
      });
      console.log("userId utilisé :", id)


      const text = await res.text();

      if (!res.ok) {
        throw new Error(text);
      }

      const data = JSON.parse(text);
      setFollowers(data);
    } catch (err) {
      console.error("Erreur chargement followers:", err.message);
    }
  };


  const loadFollowing = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/users-following/${id}`, {
        credentials: 'include',
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text);
      }

      const data = JSON.parse(text);
      setFollowing(data);
    } catch (err) {
      console.error("Erreur chargement following:", err.message);
    }
  };


  const handleTabClick = (newTab) => {
    setTab(newTab);

    if (newTab === 'followers' && followers.length === 0) {
      loadFollowers();
    }
    if (newTab === 'following' && following.length === 0) {
      loadFollowing();
    }
  };


  if (error) return <p className="text-red-600">{error}</p>
  if (!profile) return <p>Chargement du profil...</p>

  return (
    <main className="min-h-screen bg-black text-gray-100 px-4 py-6">
      <button
        onClick={() => router.push('/home')}
        className="mb-4 text-sm text-blue-400 hover:text-blue-300 underline cursor-pointer"
      >
        ← Retour à l’accueil
      </button>

      <div className="max-w-xl mx-auto">

        <h1 className="text-3xl font-bold mb-6 text-blue-500">
          Profil de {profile.first_name} {profile.last_name}
        </h1>

        <div className="bg-gray-900 rounded-xl p-4 shadow-md border border-gray-700">
          <img
            src={
              profile.avatar
                ? profile.avatar.startsWith('http')
                  ? profile.avatar
                  : `http://localhost:8080/${profile.avatar}`
                : '/avatar.png'
            }
            alt="Avatar"
            className="w-24 h-24 rounded-full border-2 border-blue-500 object-cover mb-4"
          />
          <p><strong className="text-blue-400">Nom d'utilisateur :</strong> {profile.first_name} {profile.last_name}</p>
          <p><strong className="text-blue-400">Email :</strong> {profile.email}</p>
          <p><strong className="text-blue-400">À propos :</strong> {profile.about || 'N/A'}</p>
          <p><strong className="text-blue-400">Date de naissance :</strong> {profile.date_of_birth}</p>
        </div>

        {/* 🔄 Onglets */}
        <div className="flex space-x-4 mt-8 mb-4 text-sm font-semibold">
          <button
            onClick={() => handleTabClick('posts')}
            className={`px-4 py-2 rounded ${tab === 'posts' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Publications
          </button>
          <button
            onClick={() => handleTabClick('followers')}
            className={`px-4 py-2 rounded ${tab === 'followers' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Abonnés
          </button>
          <button
            onClick={() => handleTabClick('following')}
            className={`px-4 py-2 rounded ${tab === 'following' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            Abonnements
          </button>
        </div>

        {tab === 'posts' && (
          posts.length === 0 ? (
            <p className="text-gray-400">Aucune publication pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-gray-800 shadow-md rounded-xl p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">
                    🕒 {new Date(post.created_at).toLocaleString()}
                  </div>
                  <p className="text-gray-100 mb-3 whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && (
                    <img
                      src={post.image_url.startsWith('http') ? post.image_url : `http://localhost:8080${post.image_url}`}
                      alt="Post"
                      className="w-full max-w-md rounded border border-gray-700 mb-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'followers' && (
          <div className="space-y-3">
            {followers.length === 0 ? (
              <p className="text-gray-400">Aucun abonné pour l’instant.</p>
            ) : (
              followers.map(user => (
                <div key={user.id} className="flex items-center space-x-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                  <img
                    src={user.avatar ? `http://localhost:8080/${user.avatar}` : '/avatar.png'}
                    className="w-10 h-10 rounded-full object-cover"
                    alt="avatar"
                  />
                  <div>
                    <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'following' && (
          <div className="space-y-3">
            {following.length === 0 ? (
              <p className="text-gray-400">Cet utilisateur ne suit personne.</p>
            ) : (
              following.map(user => (
                <div key={user.id} className="flex items-center space-x-4 bg-gray-800 p-3 rounded-xl border border-gray-700">
                  <img
                    src={user.avatar ? `http://localhost:8080/${user.avatar}` : '/avatar.png'}
                    className="w-10 h-10 rounded-full object-cover"
                    alt="avatar"
                  />
                  <div>
                    <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-gray-400 text-sm">@{user.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}


      </div>
    </main>
  )
}