'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {

   const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nickname: '',
    about: '',
    avatar: '',
  })

  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setMessage('✅ Registered successfully!')
        setForm({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          date_of_birth: '',
          nickname: '',
          about: '',
          avatar: '',
        })
         router.push('/login') // redirect to home or profile
      } else {
        const errText = await res.text()
        setMessage(`❌ Error: ${errText}`)
      }
    } catch (err) {
      console.error(err)
      setMessage('❌ Network error')
    }
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Register</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" value={form.email} onChange={handleChange} className="input" />
        <input name="password" type="password" required placeholder="Password" value={form.password} onChange={handleChange} className="input" />
        <input name="first_name" required placeholder="First Name" value={form.first_name} onChange={handleChange} className="input" />
        <input name="last_name" required placeholder="Last Name" value={form.last_name} onChange={handleChange} className="input" />
        <input name="date_of_birth" type="date" required value={form.date_of_birth} onChange={handleChange} className="input" />
        <input name="nickname" placeholder="Nickname (optional)" value={form.nickname} onChange={handleChange} className="input" />
        <textarea name="about" placeholder="About Me (optional)" value={form.about} onChange={handleChange} className="input" />
        <input name="avatar" placeholder="Avatar (image name, optional)" value={form.avatar} onChange={handleChange} className="input" />

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Register</button>
      </form>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </main>
  )
}
