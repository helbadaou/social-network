'use client'

import { useState, useEffect } from 'react'
import styles from './GroupDashboard.module.css';

export default function GroupDashboard({ group, onClose }) {
  
  const [activeTab, setActiveTab] = useState('chat')
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [newPostImage, setNewPostImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const response = await fetch(`http://localhost:8080/api/groups/${group.id}/posts`, {
        method: 'GET',
        credentials: 'include', // Pour inclure les cookies de session
      })

      if (response.ok) {
        const postsData = await response.json()
        setPosts(postsData || [])
      } else {
        console.error('Erreur lors de la récupération des posts:', response.status)
        setError('Impossible de charger les posts')
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

  return (
    <div className={styles.groupDashboardOverlay}>
      <div className={styles.groupDashboardPopup}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>×</button>
 
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' ? `${styles.activeTab}` : ''}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={activeTab === 'posts' ? `${styles.activeTab}` : ''}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={activeTab === 'events' ? `${styles.activeTab}` : ''}
          >
            Events
          </button>
        </div>

        {/* Dynamic content area */}
        <div className={styles.tabContent}>
          {activeTab === 'chat' && (
            <div className={styles.chatContainer}>
              <div className={styles.chatMessages}>
                {/* Example messages */}
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
                  {error}
                </div>
              )}

              {/* Formulaire de création de post */}
              <form className={styles.postForm} onSubmit={handleCreatePost}>
                <textarea 
                  placeholder="Partager quelque chose avec le groupe..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  disabled={loading}
                />
                
                {/* Input pour l'image */}
                <div className={styles.imageUpload}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    disabled={loading}
                  />
                  {newPostImage && (
                    <span className={styles.selectedFile}>
                      Image sélectionnée: {newPostImage.name}
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={loading || (!newPost.trim() && !newPostImage)}
                >
                  {loading ? 'Publication...' : 'Publier'}
                </button>
              </form>

              {/* Liste des posts */}
              <div className={styles.postList}>
                {loading && posts.length === 0 ? (
                  <div className={styles.loadingMessage}>Chargement des posts...</div>
                ) : posts.length === 0 ? (
                  <div className={styles.emptyMessage}>Aucun post dans ce groupe</div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postHeader}>
                        <div className={styles.authorInfo}>
                          {post.author_avatar && (
                            <img 
                              src={post.author_avatar} 
                              alt="Avatar" 
                              className={styles.authorAvatar}
                            />
                          )}
                          <div>
                            <h4>{post.author_name || 'Utilisateur'}</h4>
                            <span className={styles.postDate}>
                              {formatDate(post.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={styles.postContent}>
                        <p>{post.content}</p>
                        {post.image && (
                          <img 
                            src={`http://localhost:8080/${post.image}`} 
                            alt="Post" 
                            className={styles.postImage}
                          />
                        )}
                      </div>
                      
                      <div className={styles.postFooter}>
                        <span className={styles.commentsCount}>
                          {post.comments_count || 0} commentaire(s)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className={styles.eventsContainer}>
              <div className={styles.eventCard}>
                <h3>Monthly Group Meetup</h3>
                <p>Date: July 27, 2025</p>
                <p>Location: Casablanca</p>
                <button>RSVP</button>
              </div>
              {/* Add more eventCards dynamically later */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}