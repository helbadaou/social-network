  // src/app/home/components/PostForm.js
  'use client'

  import { useEffect, useState, forwardRef } from 'react'

  const PostForm = forwardRef(function PostForm(
    { content, setContent, image, setImage, privacy, setPrivacy, handleSubmit, creating },
    fileInputRef
  ) {

    const [recipients, setRecipients] = useState([])
    const [recipientIds, setRecipientIds] = useState([])

    // Charger les abonnés quand privacy devient "custom"
    useEffect(() => {
      if (privacy === 'custom') {
        fetch('http://localhost:8080/api/recipients', {
          credentials: 'include',
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text(); // lecture en texte brut si erreur
              throw new Error(`Erreur serveur: ${text}`);
            }
            return res.json(); // uniquement si res.ok
          })
          .then((data) => {
            console.log("RÉCIPIENTS :", data);
            setRecipients(data);
          })
          .catch((err) => {
            console.error('Erreur chargement des abonnés :', err.message);
          });
      }
    }, [privacy]);


    const handleCheckboxChange = (id) => {
      setRecipientIds((prev) =>
        prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
      )
    }

    const onSubmit = (e) => {
      handleSubmit(e, recipientIds)
      setRecipientIds([]) // reset après publication
    }


    return (
      <form onSubmit={onSubmit} className="bg-gray-900 p-4 rounded-xl shadow mb-6 flex flex-col gap-4 border border-gray-700">
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
          ref={fileInputRef}
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
          <option value="custom">Privé</option>
        </select>

        {/* Checkbox si custom */}
        {privacy === 'custom' && (
          <div className="bg-gray-800 p-3 rounded border border-gray-700 text-white text-sm space-y-2 max-h-52 overflow-y-auto">
            <div className="text-gray-400 mb-1 font-semibold">Choisissez les destinataires :</div>
            {Array.isArray(recipients) && recipients.length === 0 ? (
              <div className="text-gray-500">Aucun abonné disponible.</div>
            ) : (
              (recipients || []).map((user) => (
                <label key={user.id} className="flex items-center gap-2 bg-gray-700 text-white p-2 rounded">
                  <input
                    type="checkbox"
                    checked={recipientIds.includes(user.ID)}
                    onChange={() => handleCheckboxChange(user.ID)}
                    className="accent-blue-600"
                  />
                  <span>{user.Nickname}</span>
                </label>
              ))
            )}
          </div>
        )}

        <button
          type="submit"
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          disabled={creating}
        >
          {creating ? 'Publication...' : 'Publier'}
        </button>
      </form>
    )
  })

  export default PostForm