'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/profile', {
          credentials: 'include',
        })
        if (res.ok) {
          router.push('/home')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
      }
    }
    checkAuth()
  }, [router])

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

  const [message, setMessage] = useState({ type: '', text: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value) formData.append(key, value)
    })

    try {
      const res = await fetch('http://localhost:8080/api/register', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Registered successfully!' })
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
        setTimeout(() => router.push('/login'), 1000)
      } else {
        const errText = await res.text()
        setMessage({ type: 'error', text: `❌ ${errText}` })
      }
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: '❌ Network error' })
    }
  }

  return (
    <main className="max-w-xl mx-auto px-6 py-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Create your account</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-xl shadow-md">
        <Input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <Input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
        <Input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} required />
        <Input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} required />
        <Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
        <Input name="nickname" placeholder="Nickname (optional)" value={form.nickname} onChange={handleChange} />
        <Textarea name="about" placeholder="About Me (optional)" value={form.about} onChange={handleChange} />
        <input
          type="file"
          name="avatar"
          accept="image/*"
          onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.files[0] }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-400"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Register
        </button>

        <p className="text-center text-sm mt-4 text-gray-600">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Connectez-vous ici
          </Link>
        </p>
      </form>

      {message.text && (
        <p
          className={`mt-4 text-center font-medium ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </main>
  )
}

function Input({ name, type = 'text', ...props }) {
  return (
    <input
      name={name}
      type={type}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  )
}

function Textarea({ name, ...props }) {
  return (
    <textarea
      name={name}
      rows="4"
      className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  )
}
