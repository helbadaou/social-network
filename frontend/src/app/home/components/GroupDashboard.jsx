'use client'

import { useState, useEffect } from 'react'
import styles from './GroupDashboard.module.css';

export default function GroupDashboard({ group, onClose }) {

  const [activeTab, setActiveTab] = useState('posts') // Changed default to posts
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [newPostImage, setNewPostImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commentsMap, setCommentsMap] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [expandedComments, setExpandedComments] = useState({})

  // Charger les posts au montage du composant et quand l'onglet posts est sélectionné
  useEffect(() => {
    if (activeTab === 'posts' && group?.id) {
      fetchPosts()
    }
  }, [activeTab, group?.id])

  // Fonction pour récupérer les posts du groupe
  const fetchPosts = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`http://localhost:8080/api/groups/${group.id}/posts`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const postsData = await response.json()
        console.log('Posts récupérés:', postsData)
        setPosts(postsData || [])
      } else {
        const errorText = await response.text()
        console.error('Erreur lors de la récupération des posts:', response.status, errorText)
        setError(`Impossible de charger les posts: ${errorText}`)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour créer un nouveau post
  const handleCreatePost = async (e) => {
    e.preventDefault()

    if (!newPost.trim() && !newPostImage) {
      setError('Veuillez saisir du contenu ou sélectionner une image')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Utiliser FormData pour gérer l'upload d'image
      const formData = new FormData()
      formData.append('group_id', group.id.toString())
      formData.append('content', newPost)

      if (newPostImage) {
        formData.append('image', newPostImage)
      }

      const response = await fetch(`http://localhost:8080/api/groups/${group.id}/posts`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (response.ok) {
        const createdPost = await response.json()
        console.log('Post créé:', createdPost)
        // Ajouter le nouveau post en haut de la liste
        setPosts(prevPosts => [createdPost, ...prevPosts])

        // Réinitialiser le formulaire
        setNewPost('')
        setNewPostImage(null)

        // Réinitialiser l'input file
        const fileInput = document.querySelector('input[type="file"]')
        if (fileInput) fileInput.value = ''

      } else {
        const errorText = await response.text()
        setError(`Erreur lors de la création du post: ${errorText}`)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
      setError('Erreur de connexion lors de la création du post')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (postId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/posts/${postId}/comments`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        console.log(`Commentaires pour post ${postId}:`, data)
        setCommentsMap(prev => ({ ...prev, [postId]: data || [] }))
      } else {
        console.error('Erreur récupération commentaires:', await res.text())
        setCommentsMap(prev => ({ ...prev, [postId]: [] }));
      }
    } catch (error) {
      console.error('Erreur récupération commentaires:', error)
      setCommentsMap(prev => ({ ...prev, [postId]: [] }));
    }
  }

  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault()
    const content = commentInputs[postId]
    if (!content?.trim()) return

    try {
      const res = await fetch(`http://localhost:8080/api/groups/${group.id}/posts/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const newComment = await res.json()
        console.log('Commentaire créé:', newComment)
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment],
        }))
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
      } else {
        const errorText = await res.text()
        console.error('Erreur création commentaire:', errorText)
        setError(`Erreur lors de l'ajout du commentaire: ${errorText}`)
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi du commentaire:', err)
      setError('Erreur de connexion lors de l\'ajout du commentaire')
    }
  }

  const toggleComments = async (postId) => {
    setExpandedComments(prev => {
      const isVisible = !!prev[postId];
      if (!isVisible && !commentsMap[postId]) {
        fetchComments(postId);
      }
      return { ...prev, [postId]: !isVisible };
    });
  }

  // Gérer la sélection d'image
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Vérifier la taille du fichier (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 10MB')
        return
      }

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('Veuillez sélectionner un fichier image')
        return
      }

      setNewPostImage(file)
      setError('')
    }
  }

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Fonction pour supprimer l'image sélectionnée
  const removeSelectedImage = () => {
    setNewPostImage(null)
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className={styles.groupDashboardOverlay}>
      <div className={styles.groupDashboardPopup}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>×</button>

        {/* Group title */}
        <div className={styles.groupHeader}>
          <h2>{group?.title || 'Groupe'}</h2>
          <p className={styles.groupDescription}>{group?.description}</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' ? styles.activeTab : ''}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={activeTab === 'posts' ? styles.activeTab : ''}
          >
            📝 Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={activeTab === 'events' ? styles.activeTab : ''}
          >
            📅 Events
          </button>
        </div>

        {/* Dynamic content area */}
        <div className={styles.tabContent}>
          {activeTab === 'chat' && (
            <div className={styles.chatContainer}>
              <div className={styles.chatMessages}>
                <div className={styles.messageBubble}>Hi everyone!</div>
                <div className={`${styles.messageBubble} ${styles.sent}`}>Welcome to the group 🎉</div>
              </div>
              <div className={styles.chatInputArea}>
                <input type="text" placeholder="Type your message..." />
                <button>Send</button>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className={styles.postsContainer}>
              {/* Affichage des erreurs */}
              {error && (
                <div className={styles.errorMessage}>
                  <span>⚠️ {error}</span>
                  <button onClick={() => setError('')} className={styles.closeError}>×</button>
                </div>
              )}

              {/* Formulaire de création de post */}
              <form className={styles.postForm} onSubmit={handleCreatePost}>
                <div className={styles.postFormHeader}>
                  <h3>✍️ Créer un nouveau post</h3>
                </div>

                <textarea
                  className={styles.postTextarea}
                  placeholder="Partager quelque chose avec le groupe..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  disabled={loading}
                  rows={3}
                />

                {/* Input pour l'image */}
                <div className={styles.imageUploadSection}>
                  <label htmlFor="image-upload" className={styles.imageUploadLabel}>
                    📷 Ajouter une image
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={loading}
                    className={styles.imageInput}
                  />

                  {newPostImage && (
                    <div className={styles.selectedImagePreview}>
                      <span>📎 {newPostImage.name}</span>
                      <button type="button" onClick={removeSelectedImage} className={styles.removeImage}>
                        ❌
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!newPost.trim() && !newPostImage)}
                  className={styles.postSubmitButton}
                >
                  {loading ? '⏳ Publication...' : '🚀 Publier'}
                </button>
              </form>

              {/* Liste des posts */}
              <div className={styles.postList}>
                {loading && posts.length === 0 ? (
                  <div className={styles.loadingMessage}>
                    <div className={styles.loadingSpinner}></div>
                    Chargement des posts...
                  </div>
                ) : posts.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    <div className={styles.emptyIcon}>📭</div>
                    <p>Aucun post dans ce groupe</p>
                    <small>Soyez le premier à partager quelque chose !</small>
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postHeader}>
                        <div className={styles.authorInfo}>
                          {post.avatar ? (
                            <img
                              src={post.author_avatar
                                ? post.author_avatar.startsWith('http')
                                  ? post.author_avatar
                                  : `http://localhost:8080/${post?.author_avatar}`
                                : '/avatar.png'
                              }
                              alt="Avatar"
                              className={styles.authorAvatar}
                            />
                          ) : (
                            <div className={styles.defaultAvatar}>
                              {post.author_name ? post.author_name.charAt(0).toUpperCase() : '👤'}
                            </div>
                          )}
                          <div className={styles.authorDetails}>
                            <h4>{post.author_name || 'Utilisateur'}</h4>
                            <span className={styles.postDate}>
                              🕒 {formatDate(post.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.postContent}>
                        {post.content && <p>{post.content}</p>}
                        {post.image && (
                          <div className={styles.postImageContainer}>
                            <img
                              src={`http://localhost:8080/${post.image}`}
                              alt="Post"
                              className={styles.postImage}
                            />
                          </div>
                        )}
                      </div>

                      <div className={styles.postActions}>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className={styles.commentToggle}
                        >
                          💬 {expandedComments[post.id] ? 'Masquer' : 'Voir'} les commentaires
                          {post.comments_count > 0 && ` (${post.comments_count})`}
                        </button>
                      </div>

                      {expandedComments[post.id] && (
                        <div className={styles.commentsSection} style={{ border: '2px solid red' }}>
                          <div className={styles.commentsList}>
                            {commentsMap[post.id]?.length > 0 ? (
                              commentsMap[post.id].map(comment => (
                                <div key={comment.id} className={styles.comment}>
                                  {comment.author_avatar ? (
                                    <img
                                      src={comment.author_avatar.startsWith('http')
                                        ? comment.author_avatar
                                        : `http://localhost:8080/${comment.author_avatar}`}
                                      alt="Avatar"
                                      className={styles.commentAvatar}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/avatar.png';
                                      }}
                                    />
                                  ) : (
                                    <div className={styles.defaultCommentAvatar}>
                                      {comment.author_name?.charAt(0).toUpperCase() || '👤'}
                                    </div>
                                  )}
                                  <div className={styles.commentContent}>
                                    <div className={styles.commentHeader}>
                                      <strong>{comment.author_name || 'Utilisateur'}</strong>
                                      <small className={styles.commentDate}>
                                        {formatDate(comment.created_at)}
                                      </small>
                                    </div>
                                    <p>{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className={styles.noComments}>
                                {commentsMap[post.id] === undefined
                                  ? 'Chargement des commentaires...'
                                  : 'Aucun commentaire pour le moment'}
                              </div>
                            )}
                          </div>

                          <form
                            onSubmit={(e) => handleCommentSubmit(e, post.id)}
                            className={styles.commentForm}
                          >
                            <input
                              type="text"
                              placeholder="💭 Ajouter un commentaire..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className={styles.commentInput}
                            />
                            <button type="submit" className={styles.commentSubmit}>
                              ➤
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className={styles.eventsContainer}>
              <div className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <h3>📅 Monthly Group Meetup</h3>
                  <span className={styles.eventBadge}>À venir</span>
                </div>
                <div className={styles.eventDetails}>
                  <p><strong>📅 Date:</strong> July 27, 2025</p>
                  <p><strong>📍 Lieu:</strong> Casablanca</p>
                  <p><strong>👥 Participants:</strong> 12 personnes</p>
                </div>
                <div className={styles.eventActions}>
                  <button className={styles.rsvpButton}>✅ Je participe</button>
                  <button className={styles.rsvpButtonDecline}>❌ Je ne peux pas</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}