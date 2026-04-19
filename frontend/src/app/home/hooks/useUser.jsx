// src/app/home/hooks/useUser.js
import { useState, useEffect } from 'react'
import { apiUrl } from '@/lib/api'

export function useUser() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch(apiUrl('/api/profile'), { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      }
    }
    fetchUser()
  }, [])

  return [user, setUser]
}
