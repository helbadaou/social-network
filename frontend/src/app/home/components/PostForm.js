// src/app/home/components/PostForm.js
'use client'

import { forwardRef } from 'react'

const PostForm = forwardRef(function PostForm(
  { content, setContent, image, setImage, privacy, setPrivacy, handleSubmit, creating },
  fileInputRef
) {
  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 p-4 rounded-xl shadow mb-6 flex flex-col gap-4 border border-gray-700">
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
        <option value="private">Privé</option>
      </select>
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
