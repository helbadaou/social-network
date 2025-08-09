'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from './PublicProfilePage.module.css'

export default function PublicProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('posts'); // 'posts' | 'followers' | 'following'
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/profile", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setCurrentUser(data);
    } catch (err) {
      console.error("Error loading profile:", err);
      router.push('/login');
    }
  };

  const fetchChatUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/chat-users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    if (!id) return
    fetch(`http://localhost:8080/api/users/${id}`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setProfile(data)
        if (!data.is_private || data.is_followed || data.is_owner) {
          loadPosts(id)
          loadFollowers();
          loadFollowing();
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
  };

  if (error) return <p className={styles.error}>{error}</p>
  if (!profile) return <p className={styles.loading}>Chargement du profil...</p>
  
  return (
    <>
      <main className={styles.container}>
        <button
          onClick={() => router.push('/home')}
          className={styles.backButton}
        >
          ← Retour à l'accueil
        </button>

        <div className={styles.profileContainer}>
          <h1 className={styles.title}>
            Profil de {profile.first_name} {profile.last_name}
          </h1>

          <div className={styles.profileCard}>
            <img
              src={
                profile.avatar
                  ? profile.avatar.startsWith('http')
                    ? profile.avatar
                    : `http://localhost:8080/${profile.avatar}`
                  : '/avatar.png'
              }
              alt="Avatar"
              className={styles.avatar}
            />
            <p className={styles.profileField}>
              <strong className={styles.fieldLabel}>Nom d'utilisateur :</strong> {profile.first_name} {profile.last_name}
            </p>
            <p className={styles.profileField}>
              <strong className={styles.fieldLabel}>Email :</strong> {profile.email}
            </p>
            <p className={styles.profileField}>
              <strong className={styles.fieldLabel}>À propos :</strong> {profile.about || 'N/A'}
            </p>
            <p className={styles.profileField}>
              <strong className={styles.fieldLabel}>Date de naissance :</strong> {profile.date_of_birth}
            </p>

            {/* Follow button section */}
            {!profile.is_owner && (
              <div className={styles.followSection}>
                <FollowButton
                  profile={profile}
                  currentUser={currentUser}
                  onFollowChange={(newStatus) => {
                    setProfile(prev => ({
                      ...prev,
                      is_followed: newStatus.is_followed,
                      is_pending: newStatus.is_pending
                    }))
                  }}
                />
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className={styles.tabContainer}>
            <button
              onClick={() => handleTabClick('posts')}
              className={`${styles.tabButton} ${tab === 'posts' ? styles.tabActive : styles.tabInactive}`}
            >
              Publications
            </button>
            <button
              onClick={() => handleTabClick('followers')}
              className={`${styles.tabButton} ${tab === 'followers' ? styles.tabActive : styles.tabInactive}`}
            >
              Abonnés
            </button>
            <button
              onClick={() => handleTabClick('following')}
              className={`${styles.tabButton} ${tab === 'following' ? styles.tabActive : styles.tabInactive}`}
            >
              Abonnements
            </button>
          </div>

          {tab === 'posts' && (
            posts === null ? (
              <p className={styles.emptyMessage}>Aucune publication pour le moment.</p>
            ) : (
              <div className={styles.postsContainer}>
                {posts.map(post => (
                  <div key={post.id} className={styles.postCard}>
                    <div className={styles.postDate}>
                      🕒 {new Date(post.created_at).toLocaleString()}
                    </div>
                    <p className={styles.postContent}>{post.content}</p>
                    {post.image_url && (
                      <img
                        src={post.image_url.startsWith('http') ? post.image_url : `http://localhost:8080${post.image_url}`}
                        alt="Post"
                        className={styles.postImage}
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'followers' && (
            <div className={styles.usersContainer}>
              {!Array.isArray(followers) ? (
                <p className={styles.emptyMessage}>Chargement des abonnés...</p>
              ) : followers.length === 0 ? (
                <p className={styles.emptyMessage}>Aucun abonné pour l'instant.</p>
              ) : (
                followers.map(user => (
                  <div
                    key={user.ID}
                    className={styles.userCard}
                    onClick={() => router.push(`/profile/${user.ID}`)}
                  >
                    <img
                      src={user.Avatar ? `http://localhost:8080/${user.Avatar}` : '/avatar.png'}
                      className={styles.userAvatar}
                      alt="avatar"
                    />
                    <div className={styles.userInfo}>
                      <p className={styles.userName}>{user.FirstName} {user.LastName}</p>
                      <p className={styles.userNickname}>@{user.Nickname}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'following' && (
            <div className={styles.usersContainer}>
              {!Array.isArray(following) ? (
                <p className={styles.emptyMessage}>Chargement des suivis...</p>
              ) : following.length === 0 ? (
                <p className={styles.emptyMessage}>Cet utilisateur ne suit personne.</p>
              ) : (
                following.map(user => (
                  <div
                    key={user.ID}
                    className={styles.userCard}
                    onClick={() => router.push(`/profile/${user.ID}`)}
                  >
                    <img
                      src={user.Avatar ? `http://localhost:8080/${user.Avatar}` : '/avatar.png'}
                      className={styles.userAvatar}
                      alt="avatar"
                    />
                    <div className={styles.userInfo}>
                      <p className={styles.userName}>{user.FirstName} {user.LastName}</p>
                      <p className={styles.userNickname}>@{user.Nickname}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function FollowButton({ profile, currentUser, onFollowChange }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (!currentUser?.ID || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ followed_id: profile.id }),
      })

      if (res.ok) {
        onFollowChange({
          is_followed: !profile.is_private,
          is_pending: profile.is_private
        });
      }
    } catch (err) {
      console.error('Follow error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser?.ID || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/unfollow', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          followed_id: profile.id,
        }),
      })

      if (res.ok) {
        onFollowChange({
          is_followed: false,
          is_pending: false
        });
      }
    } catch (err) {
      console.error('Unfollow error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (profile.is_followed) {
    return (
      <button
        onClick={handleUnfollow}
        disabled={isLoading}
        className={`${styles.followButton} ${styles.unfollowButton}`}
      >
        {isLoading ? 'Chargement...' : 'Se désabonner'}
      </button>
    );
  }

  if (profile.is_pending) {
    return (
      <button
        disabled
        className={`${styles.followButton} ${styles.pendingButton}`}
      >
        En attente d'approbation
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`${styles.followButton} ${styles.followButtonPrimary}`}
    >
      {isLoading ? 'Chargement...' : profile.is_private ? 'Demander à suivre' : 'Suivre'}
    </button>
  );
}