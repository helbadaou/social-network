import { useState, useEffect } from 'react'

export default function GroupDashboard({ group, onClose }) {

  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [events, setEvents] = useState([])
  const [newPost, setNewPost] = useState('')
  const [newPostImage, setNewPostImage] = useState(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commentsMap, setCommentsMap] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [expandedComments, setExpandedComments] = useState({})

  // Charger les données selon l'onglet actif
  useEffect(() => {
    if (group?.id) {
      if (activeTab === 'posts') {
        fetchPosts()
      } else if (activeTab === 'events') {
        fetchEvents()
      }
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

  // Fonction pour récupérer les événements du groupe
  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`http://localhost:8080/api/groups/${group.id}/events`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const eventsData = await response.json()
        console.log('Événements récupérés:', eventsData)
        setEvents(eventsData || [])
      } else {
        const errorText = await response.text()
        console.error('Erreur lors de la récupération des événements:', response.status, errorText)
        setError(`Impossible de charger les événements: ${errorText}`)
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
        setPosts(prevPosts => [createdPost, ...prevPosts])
        setNewPost('')
        setNewPostImage(null)
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

  // Fonction pour créer un nouvel événement
  const handleCreateEvent = async (e) => {
    e.preventDefault()

    if (!newEvent.title.trim() || !newEvent.event_date) {
      setError('Veuillez remplir au moins le titre et la date')
      return
    }

    try {
      setLoading(true)
      setError('')

      const eventData = {
        group_id: group.id,
        title: newEvent.title,
        description: newEvent.description,
        event_date: new Date(newEvent.event_date).toISOString()
      }

      const response = await fetch(`http://localhost:8080/api/groups/${group.id}/events`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        const createdEvent = await response.json()
        console.log('Événement créé:', createdEvent)
        setEvents(prevEvents => [createdEvent, ...prevEvents])
        setNewEvent({ title: '', description: '', event_date: '' })
      } else {
        const errorText = await response.text()
        setError(`Erreur lors de la création de l'événement: ${errorText}`)
      }
    } catch (error) {
      console.error('Erreur réseau:', error)
      setError('Erreur de connexion lors de la création de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour répondre à un événement
  const handleEventResponse = async (eventId, response) => {
    try {
      const res = await fetch(`http://localhost:8080/api/events/${eventId}/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          response: response
        })
      })

      if (res.ok) {
        // Recharger les événements pour mettre à jour les compteurs
        fetchEvents()
      } else {
        const errorText = await res.text()
        setError(`Erreur lors de la réponse: ${errorText}`)
      }
    } catch (error) {
      console.error('Erreur lors de la réponse à l\'événement:', error)
      setError('Erreur de connexion')
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
      if (file.size > 10 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 10MB')
        return
      }

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

  // Formater la date d'événement
  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backdropFilter: 'blur(6px)',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '16px',
        padding: '2rem',
        width: '90%',
        maxWidth: '700px',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Close button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '20px',
            fontSize: '1.5rem',
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        {/* Group title */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>{group?.title || 'Groupe'}</h2>
          <p style={{ opacity: 0.8 }}>{group?.description}</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.7rem 1.5rem',
              border: 'none',
              background: activeTab === 'chat' 
                ? 'linear-gradient(135deg, #007bff, #00c3ff)' 
                : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '1rem',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: activeTab === 'chat' ? '600' : '500'
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            style={{
              padding: '0.7rem 1.5rem',
              border: 'none',
              background: activeTab === 'posts' 
                ? 'linear-gradient(135deg, #007bff, #00c3ff)' 
                : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '1rem',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: activeTab === 'posts' ? '600' : '500'
            }}
          >
            📝 Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              padding: '0.7rem 1.5rem',
              border: 'none',
              background: activeTab === 'events' 
                ? 'linear-gradient(135deg, #007bff, #00c3ff)' 
                : 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '1rem',
              borderRadius: '30px',
              cursor: 'pointer',
              fontWeight: activeTab === 'events' ? '600' : '500'
            }}
          >
            📅 Events
          </button>
        </div>

        {/* Dynamic content area */}
        <div style={{
          color: 'black',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '1.5rem',
          borderRadius: '12px',
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 200px)',
          flexGrow: 1
        }}>
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '300px' }}>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                background: '#ffffff1a',
                padding: '10px',
                borderRadius: '8px'
              }}>
                <div style={{
                  background: '#ffffffcc',
                  padding: '10px',
                  borderRadius: '10px',
                  margin: '5px 0',
                  maxWidth: '70%'
                }}>
                  Hi everyone!
                </div>
                <div style={{
                  background: '#a3d3ff',
                  padding: '10px',
                  borderRadius: '10px',
                  margin: '5px 0',
                  maxWidth: '70%',
                  alignSelf: 'flex-end'
                }}>
                  Welcome to the group 🎉
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none'
                  }}
                />
                <button style={{
                  padding: '10px 15px',
                  border: 'none',
                  backgroundColor: '#00c3ff',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}>
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
              {/* Affichage des erreurs */}
              {error && (
                <div style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #f5c6cb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>⚠️ {error}</span>
                  <button 
                    onClick={() => setError('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      color: '#721c24'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Formulaire de création de post */}
              <form onSubmit={handleCreatePost} style={{
                background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                border: '2px solid rgba(0, 123, 255, 0.1)',
                borderRadius: '15px',
                padding: '1.5rem',
                flexShrink: 0
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>✍️ Créer un nouveau post</h3>

                <textarea
                  placeholder="Partager quelque chose avec le groupe..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  disabled={loading}
                  rows={3}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '1rem',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem'
                  }}
                />

                {/* Input pour l'image */}
                <div style={{
                  margin: '1rem 0',
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '10px',
                  border: '2px dashed #ddd'
                }}>
                  <label style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #007bff, #0056b3)',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    📷 Ajouter une image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {newPostImage && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(40, 167, 69, 0.1)',
                      borderRadius: '8px',
                      color: '#28a745'
                    }}>
                      <span>📎 {newPostImage.name}</span>
                      <button 
                        type="button" 
                        onClick={removeSelectedImage}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem'
                        }}
                      >
                        ❌
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!newPost.trim() && !newPostImage)}
                  style={{
                    background: loading ? '#6c757d' : 'linear-gradient(135deg, #28a745, #20c997)',
                    color: 'white',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {loading ? '⏳ Publication...' : '🚀 Publier'}
                </button>
              </form>

              {/* Liste des posts */}
              <div style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
                {loading && posts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    Chargement des posts...
                  </div>
                ) : posts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <p>Aucun post dans ce groupe</p>
                    <small>Soyez le premier à partager quelque chose !</small>
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} style={{
                      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      marginBottom: '1.5rem',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        {post.author_avatar ? (
                          <img
                            src={post.author_avatar.startsWith('http')
                              ? post.author_avatar
                              : `http://localhost:8080/${post.author_avatar}`
                            }
                            alt="Avatar"
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #007bff, #00c3ff)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                          }}>
                            {post.author_name ? post.author_name.charAt(0).toUpperCase() : '👤'}
                          </div>
                        )}
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                            {post.author_name || 'Utilisateur'}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#666' }}>
                            🕒 {formatDate(post.created_at)}
                          </span>
                        </div>
                      </div>

                      <div style={{ margin: '1rem 0', lineHeight: 1.6 }}>
                        {post.content && <p style={{ margin: 0, color: '#333' }}>{post.content}</p>}
                        {post.image && (
                          <div style={{ margin: '1rem 0', borderRadius: '12px', overflow: 'hidden' }}>
                            <img
                              src={`http://localhost:8080/${post.image}`}
                              alt="Post"
                              style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '400px',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.1)' }}>
                        <button
                          onClick={() => toggleComments(post.id)}
                          style={{
                            background: 'rgba(0, 123, 255, 0.1)',
                            border: '1px solid rgba(0, 123, 255, 0.2)',
                            color: '#007bff',
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          💬 {expandedComments[post.id] ? 'Masquer' : 'Voir'} les commentaires
                          {post.comments_count > 0 && ` (${post.comments_count})`}
                        </button>
                      </div>

                      {expandedComments[post.id] && (
                        <div style={{
                          marginTop: '1rem',
                          background: 'white',
                          padding: '1rem',
                          borderRadius: '12px',
                          border: '1px solid #e0e0e0',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                            {commentsMap[post.id]?.length > 0 ? (
                              commentsMap[post.id].map(comment => (
                                <div key={comment.id} style={{
                                  display: 'flex',
                                  gap: '0.75rem',
                                  padding: '0.75rem',
                                  background: '#f8f9fa',
                                  borderRadius: '8px',
                                  borderLeft: '3px solid #007bff'
                                }}>
                                  {comment.author_avatar ? (
                                    <img
                                      src={comment.author_avatar.startsWith('http')
                                        ? comment.author_avatar
                                        : `http://localhost:8080/${comment.author_avatar}`}
                                      alt="Avatar"
                                      style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                      }}
                                    />
                                  ) : (
                                    <div style={{
                                      width: '35px',
                                      height: '35px',
                                      borderRadius: '50%',
                                      background: 'linear-gradient(135deg, #6c757d, #495057)',
                                      color: 'white',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold',
                                      fontSize: '0.9rem'
                                    }}>
                                      {comment.author_name?.charAt(0).toUpperCase() || '👤'}
                                    </div>
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                      <strong>{comment.author_name || 'Utilisateur'}</strong>
                                      <small style={{ color: '#666' }}>
                                        {formatDate(comment.created_at)}
                                      </small>
                                    </div>
                                    <p style={{ margin: 0 }}>{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                                {commentsMap[post.id] === undefined
                                  ? 'Chargement des commentaires...'
                                  : 'Aucun commentaire pour le moment'}
                              </div>
                            )}
                          </div>

                          <form
                            onSubmit={(e) => handleCommentSubmit(e, post.id)}
                            style={{ display: 'flex', gap: '10px' }}
                          >
                            <input
                              type="text"
                              placeholder="💭 Ajouter un commentaire..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: '1px solid #ddd',
                                borderRadius: '20px'
                              }}
                            />
                            <button 
                              type="submit"
                              style={{
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                cursor: 'pointer'
                              }}
                            >
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
              {/* Affichage des erreurs */}
              {error && (
                <div style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #f5c6cb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>⚠️ {error}</span>
                  <button 
                    onClick={() => setError('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.2rem',
                      cursor: 'pointer',
                      color: '#721c24'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Formulaire de création d'événement */}
              <form onSubmit={handleCreateEvent} style={{
                background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
                border: '2px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '15px',
                padding: '1.5rem',
                flexShrink: 0
              }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#856404' }}>📅 Créer un nouvel événement</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Titre de l'événement..."
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <textarea
                    placeholder="Description de l'événement..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    disabled={loading}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #ffc107',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newEvent.title.trim() || !newEvent.event_date}
                  style={{
                    background: loading ? '#6c757d' : 'linear-gradient(135deg, #ffc107, #e0a800)',
                    color: loading ? 'white' : '#212529',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  {loading ? '⏳ Création...' : '🎉 Créer l\'événement'}
                </button>
              </form>

              {/* Liste des événements */}
              <div style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
                {loading && events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    Chargement des événements...
                  </div>
                ) : events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                    <p>Aucun événement dans ce groupe</p>
                    <small>Créez le premier événement !</small>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} style={{
                      background: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '15px',
                      padding: '1.5rem',
                      marginBottom: '1.5rem',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: '1.3rem' }}>
                            📅 {event.title}
                          </h3>
                          <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                            👤 Créé par {event.creator_name}
                          </p>
                        </div>
                                                <span style={{
                          background: new Date(event.event_date) > new Date() 
                            ? 'linear-gradient(135deg, #28a745, #20c997)' 
                            : 'linear-gradient(135deg, #6c757d, #adb5bd)',
                          color: 'white',
                          padding: '0.4rem 1rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {new Date(event.event_date) > new Date() ? 'À venir' : 'Terminé'}
                        </span>
                      </div>

                      <div style={{ marginBottom: '1rem', color: '#555' }}>
                        {event.description}
                      </div>

                      <div style={{ fontSize: '0.9rem', color: '#888' }}>
                        📆 {formatDate(event.event_date, true)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}