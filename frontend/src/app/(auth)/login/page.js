'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // this is important to receive the cookie!
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        setMessage('✅ Login successful!')
        router.push('/profile') // redirect to home or profile
      } else {
        const text = await res.text()
        setMessage(`❌ ${text}`)
      }
    } catch (err) {
      console.error(err)
      setMessage('❌ Network error')
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
      </form>
      {message && <p className="mt-4 text-red-600 text-sm">{message}</p>}
    </main>
  )
}
