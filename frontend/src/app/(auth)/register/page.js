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

  const [message, setMessage] = useState({ type: '', text: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
        <Input name="avatar" placeholder="Avatar (image name, optional)" value={form.avatar} onChange={handleChange} />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Register
        </button>
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

