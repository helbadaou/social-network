'use client'

import { useState, useRef } from 'react'

export default function CommentSection({ postId }) {
    const [comments, setComments] = useState([])
    const [content, setContent] = useState('')
    const fileInputRef = useRef(null)

    const fetchComments = async () => {
        try {
            const res = await fetch(`http://localhost:8080/api/comments/post?id=${postId}`, {
                credentials: 'include',
            })
            if (res.ok) {
                const data = await res.json()
                setComments(data)
            }
        } catch (err) {
            console.error('Erreur chargement commentaires', err)
        }
    }


    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!content.trim() && !fileInputRef.current.files[0]) {
            alert("Vous devez écrire un message ou ajouter une image.");
            return;
        }

        const formData = new FormData()
        formData.append('post_id', postId)
        formData.append('content', content)
        if (fileInputRef.current.files[0]) {
            formData.append('image', fileInputRef.current.files[0])
        }

        try {
            const res = await fetch(`http://localhost:8080/api/comments`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })


            if (res.ok) {
                setContent('')
                if (fileInputRef.current) fileInputRef.current.value = ''
                fetchComments()
            }
        } catch (err) {
            console.error('Erreur ajout commentaire', err)
        }
    }

    // Auto-fetch des commentaires au chargement
    useState(() => {
        fetchComments()
    }, [])

    return (
        <div className="mt-4 border-t border-gray-700 pt-4">
            <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Écrire un commentaire..."
                    className="bg-gray-800 border border-gray-600 text-white p-2 rounded resize-none"
                />
                <input type="file" accept="image/jpeg,image/png,image/gif" ref={fileInputRef} />
                <button
                    type="submit"
                    className="self-end bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
                >
                    Publier
                </button>
            </form>

            {/* Liste des commentaires */}
            <div className="space-y-4">
                {comments && comments.length > 0 ? (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-800 p-3 rounded shadow border border-gray-700">
                            <div className="flex items-center mb-2">
                                <img
                                    src={
                                        comment.author.avatar
                                            ? comment.author.avatar.startsWith('http')
                                                ? comment.author.avatar
                                                : `http://localhost:8080/${comment.author.avatar}`
                                            : '/avatar.png'
                                    }
                                    alt="Avatar"
                                    className="w-8 h-8 rounded-full border border-gray-600 mr-2"
                                />
                                <div>
                                    <div className="font-medium text-blue-400 hover:underline">
                                        {comment.author.first_name} {comment.author.last_name}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Publié le {new Date(comment.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <p className="text-white text-sm mb-1">{comment.content}</p>
                            {comment.image_url && (
                                <img
                                    src={`http://localhost:8080${comment.image_url}`}
                                    alt="Image commentaire"
                                    className="w-full max-w-xs rounded border border-gray-600 mt-1"
                                />
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 text-sm italic">Aucun commentaire pour l’instant. Soyez le premier à en écrire un !</p>
                )}


            </div>
        </div>
    )
}
