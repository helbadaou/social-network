// src/app/home/components/PostForm.js
'use client'

import { useEffect, useState, forwardRef } from 'react'
import styles from './PostForm.module.css'

const PostForm = forwardRef(function PostForm(
  { content, setContent, image, setImage, privacy, setPrivacy, handleSubmit, creating, onClose },
  fileInputRef
) {
  const [recipients, setRecipients] = useState([])
  const [recipientIds, setRecipientIds] = useState([])

  useEffect(() => {
    if (privacy === 'custom') {
      fetch('http://localhost:8080/api/recipients', {
        credentials: 'include',
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`Erreur serveur: ${text}`)
          }
          return res.json()
        })
        .then((data) => {
          console.log("RÉCIPIENTS :", data)
          setRecipients(data)
        })
        .catch((err) => {
          console.error('Erreur chargement des abonnés :', err.message)
        })
    }
  }, [privacy])

  const handleCheckboxChange = (id) => {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    )
  }

  const onSubmit = (e) => {
    handleSubmit(e, recipientIds)
    setRecipientIds([])
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {/* Add close button at top-right */}
      <button 
        type="button" 
        onClick={onClose}
        className={styles.closeButton}
        aria-label="Fermer le formulaire"
      >
        ×
      </button>
      
      <textarea
        placeholder="Exprimez-vous..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={styles.textarea}
        rows={3}
        required
      />
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className={styles.fileInput}
        onChange={(e) => setImage(e.target.files[0])}
      />
      <select
        value={privacy}
        onChange={(e) => setPrivacy(e.target.value)}
        className={styles.select}
      >
        <option value="public">Public</option>
        <option value="followers">Abonnés</option>
        <option value="custom">Privé</option>
      </select>

      {privacy === 'custom' && (
        <div className={styles.recipientsContainer}>
          <div className={styles.recipientsTitle}>Choisissez les destinataires :</div>
          {Array.isArray(recipients) && recipients.length === 0 ? (
            <div className={styles.emptyRecipients}>Aucun abonné disponible.</div>
          ) : (
            (recipients || []).map((user) => (
              <label key={user.id} className={styles.recipientItem}>
                <input
                  type="checkbox"
                  checked={recipientIds.includes(user.ID)}
                  onChange={() => handleCheckboxChange(user.ID)}
                  className={styles.checkbox}
                />
                <span>{user.Nickname}</span>
              </label>
            ))
          )}
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={creating}
        >
          {creating ? 'Publication...' : 'Publier'}
        </button>
      </div>
    </form>
  )
})

export default PostForm