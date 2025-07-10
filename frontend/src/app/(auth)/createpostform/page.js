'use client'

import { useState } from 'react'

export default function CreatePostForm({ onPostCreated }) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    const res = await fetch('http://localhost:8080/api/posts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, privacy })
    })

    if (res.ok) {
      const newPost = await res.json()
      onPostCreated && onPostCreated(newPost)
      setContent('')
      setMessage('✅ Post created')
    } else {
      const err = await res.text()
      setMessage(`❌ ${err}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-4">
      <textarea
        className="w-full p-2 border rounded"
        placeholder="What's on your mind?"
        value={content}
        onChange={e => setContent(e.target.value)}
        required
      />
      <select value={privacy} onChange={e => setPrivacy(e.target.value)} className="border p-1 rounded">
        <option value="public">Public</option>
        <option value="followers">Followers</option>
        <option value="custom">Custom</option>
      </select>
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Post</button>
      {message && <p className="text-sm">{message}</p>}
    </form>
  )
}
