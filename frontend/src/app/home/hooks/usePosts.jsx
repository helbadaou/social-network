// src/app/home/hooks/usePosts.js
import { useState, useEffect } from 'react'
import { apiUrl } from '@/lib/api'

export function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const res = await fetch(apiUrl('/api/posts'), { credentials: 'include' })
        if (!res.ok) throw new Error('Error fetching posts')
        const data = await res.json()
        console.log('Posts fetched:', data) // Assure-toi que les données sont correctes
        setPosts(data)
      } catch (err) {
        console.error('Error fetching posts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return [posts, loading, setPosts]
}
