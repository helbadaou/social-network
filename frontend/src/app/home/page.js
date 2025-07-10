'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [showProfile, setShowProfile] = useState(false)
  const [user, setUser] = useState(null)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

    const router = useRouter()

  // Load current user data on page load
  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/profile', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Unauthorized')
      const data = await res.json()
      setUser(data)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const toggleProfile = () => {
    setShowProfile(!showProfile)
  }

  const handleSearch = async (e) => {
    const value = e.target.value
    setSearch(value)

    if (value.length > 1) {
      try {
        const res = await fetch(`http://localhost:8080/search?query=${value}`, {
          credentials: 'include',
        })
        const data = await res.json()
        setResults(data)
      } catch (err) {
        console.error('Error searching users:', err)
      }
    } else {
      setResults([])
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/logout', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        setUser(null)
        setShowProfile(false)
         router.push('/login')
      } else {
        throw new Error('Logout failed')
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow flex justify-between items-center px-6 py-4">
      
      
          {/* Search Bar */}
      <div className="max-w-xl mx-auto mt-8 px-4">
        <input
          type="text"
          placeholder="🔍 Search users..."
          value={search}
          onChange={handleSearch}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none"
        />
        {results.length > 0 && (
          <div className="bg-white mt-2 rounded-md shadow-md">
            {results.map((u) => (
              <div
                key={u.id}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b"
              >
                <p className="font-medium">
                  {u.first_name} {u.last_name}
                </p>
                <p className="text-sm text-gray-500">@{u.nickname}</p>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* Avatar + Dropdown */}
        <div className="relative">
          <img
            src={user?.Avatar || '/avatar.png'}
            alt="Avatar"
            onClick={toggleProfile}
            className="w-10 h-10 rounded-full border cursor-pointer"
          />
          {showProfile && user && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg p-4 z-20">
              <h2 className="font-semibold">
                {user.FirstName} {user.LastName}
              </h2>
              <p className="text-sm text-gray-500">@{user.Nickname || 'anonymous'}</p>
              {user.About && <p className="text-sm text-blue-600 mt-2">{user.About}</p>}
              <p className="text-sm text-blue-600 mt-2">{user.Email}</p>
              <button
                onClick={handleLogout}
                className="mt-3 text-sm text-red-500 hover:underline"
              >
                Logout
              </button>
            </div>
          )}
        </div>

      </nav>

    
    </div>
  )
}
