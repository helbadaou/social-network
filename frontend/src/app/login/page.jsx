'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
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
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('http://localhost:8080/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const userData = await res.json()
        localStorage.setItem('user', JSON.stringify(userData))
        setMessage('✅ Login successful!')
        router.push('/home')
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
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Login</h1>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className={styles.submitButton}
          >
            Login
          </button>

          <p className={styles.registerText}>
            Pas encore de compte ?{' '}
            <Link href="/register" className={styles.registerLink}>
              Créez-en un ici
            </Link>
          </p>
        </form>
        {message && (
          <p className={`${styles.message} ${
            message.startsWith('✅') ? styles.successMessage : styles.errorMessage
          }`}>
            {message}
          </p>
        )}
      </div>
    </main>
  )
}