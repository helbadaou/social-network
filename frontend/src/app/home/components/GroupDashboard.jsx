import { useState, useEffect, useRef } from 'react'
import styles from './GroupDashboard.module.css'

export default function GroupDashboard({ group, onClose, currentUser }) {

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

  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMessageInput, setGroupMessageInput] = useState('');
  const [chatUsers, setChatUsers] = useState([]);
  const ws = useRef(null);


  useEffect(() => {
    if (!group?.id || !currentUser?.ID) return;

    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      console.log('✅ WebSocket connected for group chat');
      ws.current = socket;
    };

    socket.onclose = (e) => {
      console.log('❌ WebSocket disconnected for group chat', e);
      ws.current = null;
    };

    socket.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'group' && msg.group_id === group.id) {
          setGroupMessages(prev => [...prev, {
            ...msg,
            id: `${msg.from}-${msg.timestamp}-${Date.now()}`
          }])
          console.log('Message de groupe envoyé :', msg)
            ;
        }
      } catch (err) {
        console.error('Error parsing group message:', err);
      }
    };

    // Charger l'historique des messages
    const fetchGroupMessages = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/groups/${group.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setGroupMessages(data || []);
        }
      } catch (err) {
        console.error('Error fetching group messages:', err);
      }
    };
    fetchGroupMessages();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [group?.id, currentUser?.ID]);




  const handleSendGroupMessage = () => {
    console.log('🚀 handleSendGroupMessage called');
    console.log('📝 Message input:', groupMessageInput);
    console.log('🔌 WebSocket state:', ws.current?.readyState);
    console.log('🏷️ Group ID:', group.id);

    if (!groupMessageInput.trim()) {
      console.log('❌ Message is empty');
      return;
    }

    if (!ws.current) {
      console.log('❌ WebSocket is null');
      return;
    }

    if (ws.current.readyState !== WebSocket.OPEN) {
      console.log('❌ WebSocket not connected, readyState:', ws.current.readyState);
      return;
    }

    const messageContent = groupMessageInput.trim();
    console.log('✅ Sending message:', messageContent);

    // D'abord envoyer via HTTP
    fetch(`http://localhost:8080/api/groups/${group.id}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: messageContent })
    })
      .then(response => {
        console.log('📡 HTTP response status:', response.status)
        if (response.ok) {
          console.log('✅ HTTP message sent successfully');
          // Puis via WebSocket
          const message = {
            type: 'group',
            groupId: group.id,  // Attention: groupId, pas group_id
            content: messageContent.trim(),
            timestamp: new Date().toISOString()
          };
          console.log('📤 Sending WebSocket message:', message);
          ws.current.send(JSON.stringify(message));
          setGroupMessageInput('');
        } else {
          console.error('❌ HTTP request failed');
          response.text().then(text => console.error('Error:', text));
        }
      });
  };


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
    <div className={styles.groupDashboardOverlay}>
      <div className={styles.groupDashboardPopup}>
        {/* Close button */}
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>

        {/* Group title */}
        <div className={styles.groupHeader}>
          <h2>{group?.title || 'Groupe'}</h2>
          <p>{group?.description}</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('chat')}
            className={`${styles.tabButton} ${activeTab === 'chat' ? styles.active : ''}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`${styles.tabButton} ${activeTab === 'posts' ? styles.active : ''}`}
          >
            📝 Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`${styles.tabButton} ${activeTab === 'events' ? styles.active : ''}`}
          >
            📅 Events
          </button>
        </div>

        {/* Dynamic content area */}
        <div className={styles.tabContent}>
          {activeTab === 'chat' && (
            <div className={styles.chatContainer}>
              <div className={styles.chatMessages}>
                {groupMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`${styles.messageBubble} 
                    ${msg.from === currentUser.ID ? styles.sent : ''}`}
                  >
                    <div className={styles.messageSender}>
                      {(msg.from || msg.senderId) === currentUser.ID ? 'You' :
                        msg.senderNickname || 'User'}
                    </div>
                    <div>{msg.content}</div>
                    <div className={styles.messageTime}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.chatInputArea}>
                <input
                  type="text"
                  value={groupMessageInput}
                  onChange={(e) => setGroupMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendGroupMessage();
                    }
                  }}
                  placeholder="Type your message..."
                />
                <button
                  onClick={handleSendGroupMessage}
                  disabled={!groupMessageInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className={styles.postsContainer}>
              {/* Affichage des erreurs */}
              {error && (
                <div className={styles.errorMessage}>
                  <span>⚠️ {error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}

              {/* Formulaire de création de post */}
              <form onSubmit={handleCreatePost} className={styles.postForm}>
                <h3>✍️ Créer un nouveau post</h3>

                <textarea
                  placeholder="Partager quelque chose avec le groupe..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className={styles.postTextarea}
                />

                {/* Input pour l'image */}
                <div className={styles.imageUploadSection}>
                  <label className={styles.imageUploadLabel}>
                    📷 Ajouter une image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={loading}
                      className={styles.imageInput}
                    />
                  </label>

                  {newPostImage && (
                    <div className={styles.selectedImagePreview}>
                      <span>📎 {newPostImage.name}</span>
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className={styles.removeImage}
                      >
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
                  <div className={styles.emptyState}>
                    Chargement des posts...
                  </div>
                ) : posts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div>📭</div>
                    <p>Aucun post dans ce groupe</p>
                    <small>Soyez le premier à partager quelque chose !</small>
                  </div>
                ) : (
                  posts.map(post => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postHeader}>
                        <div className={styles.authorInfo}>
                          {post.author_avatar ? (
                            <img
                              src={post.author_avatar.startsWith('http')
                                ? post.author_avatar
                                : `http://localhost:8080/${post.author_avatar}`}
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
                            <span className={styles.postDate}>🕒 {formatDate(post.created_at)}</span>
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
                        <div className={styles.commentsSection}>
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
                                    />
                                  ) : (
                                    <div className={styles.defaultCommentAvatar}>
                                      {comment.author_name?.charAt(0).toUpperCase() || '👤'}
                                    </div>
                                  )}
                                  <div className={styles.commentContent}>
                                    <div className={styles.commentHeader}>
                                      <strong>{comment.author_name || 'Utilisateur'}</strong>
                                      <small>{formatDate(comment.created_at)}</small>
                                    </div>
                                    <p>{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className={styles.emptyComments}>
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
                            />
                            <button type="submit">➤</button>
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
              {/* Affichage des erreurs */}
              {error && (
                <div className={styles.errorMessage}>
                  <span>⚠️ {error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}

              {/* Formulaire de création d'événement */}
              <form onSubmit={handleCreateEvent} className={styles.eventForm}>
                <h3>📅 Créer un nouvel événement</h3>

                <div className={styles.formField}>
                  <input
                    type="text"
                    placeholder="Titre de l'événement..."
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formField}>
                  <textarea
                    placeholder="Description de l'événement..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    disabled={loading}
                    rows={3}
                  />
                </div>

                <div className={styles.formField}>
                  <input
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newEvent.title.trim() || !newEvent.event_date}
                  className={styles.eventSubmitButton}
                >
                  {loading ? '⏳ Création...' : '🎉 Créer l\'événement'}
                </button>
              </form>

              {/* Liste des événements */}
              <div className={styles.eventList}>
                {loading && events.length === 0 ? (
                  <div className={styles.emptyState}>
                    Chargement des événements...
                  </div>
                ) : events.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div>📅</div>
                    <p>Aucun événement dans ce groupe</p>
                    <small>Créez le premier événement !</small>
                  </div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h3>📅 {event.title}</h3>
                          <p>👤 Créé par {event.creator_name}</p>
                        </div>
                        <span className={`${styles.eventStatus} ${new Date(event.event_date) > new Date()
                          ? styles.upcoming
                          : styles.past
                          }`}>
                          {new Date(event.event_date) > new Date() ? 'À venir' : 'Terminé'}
                        </span>
                      </div>

                      <div className={styles.eventDescription}>
                        {event.description}
                      </div>

                      <div className={styles.eventDate}>
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