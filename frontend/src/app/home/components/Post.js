// components/Post.js

'use client'

import { useState } from 'react'
import CommentSection from './CommentSection'

export default function Post({ post, fetchUserById }) {
  const [showComments, setShowComments] = useState(false)

  const toggleComments = () => {
    setShowComments(!showComments)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow p-4 mb-6 max-w-2xl mx-auto">
      {/* Auteur */}
      <div
        onClick={() => fetchUserById(post.author_id)}
        className="flex items-center cursor-pointer mb-3"
      >
        <img
          src={post.author_avatar || '/avatar.png'}
          alt="Avatar"
          className="w-10 h-10 rounded-full border border-gray-700 mr-3"
        />
        <div>
          <div className="font-medium text-blue-400 hover:underline">
            {post.author_name}
          </div>
          <div className="text-sm text-gray-400">
            Publié le {new Date(post.created_at).toLocaleString()}
          </div>
        </div>

      </div>

      {/* Contenu du post */}
      <p className="text-gray-200 mb-2">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <img
          src={`http://localhost:8080${post.image_url}`}
          alt="Post"
          className="w-full max-w-md rounded border border-gray-700 mb-2"
        />
      )}

      {/* Icône/commentaire toggle */}
      <div className="mt-2">
        <button
          onClick={toggleComments}
          className="flex items-center text-blue-400 hover:text-blue-500 text-sm cursor-pointer"
        >
          <img src="/comment-icon.png" alt="Commenter" className="w-5 h-5 mr-2" />
          {showComments ? 'Masquer les commentaires' : 'Voir les commentaires'}
        </button>
      </div>

      {showComments && (
        <div className="mt-4">
          <CommentSection postId={post.id} />
        </div>
      )}
    </div>
  )
}
