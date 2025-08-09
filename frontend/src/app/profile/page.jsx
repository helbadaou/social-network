'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('http://localhost:8080/api/profile', {
      credentials: 'include', // important to send cookie
    })
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated')
        return res.json()
      })
      .then(data => setProfile(data))
      .catch(() => {
        setError('Please login to view your profile')
        setTimeout(() => router.push('/login'), 2000)
      })
  }, [])

  if (error) {
    return <p className={styles.error}>{error}</p>
  }

  if (!profile) {
    return <p className={styles.loading}>Loading...</p>
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Your Profile</h1>
      <p className={styles.field}><strong>Email:</strong> {profile.email}</p>
      <p className={styles.field}><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
      <p className={styles.field}><strong>Date of Birth:</strong> {profile.date_of_birth}</p>
      <p className={styles.field}><strong>Nickname:</strong> {profile.nickname || 'N/A'}</p>
      <p className={styles.field}><strong>About Me:</strong> {profile.about || 'N/A'}</p>
      <p className={styles.field}><strong>Avatar:</strong> {profile.avatar || 'N/A'}</p>

      <button
        className={styles.logoutButton}
        onClick={async () => {
          try {
            const res = await fetch('http://localhost:8080/api/logout', {
              method: 'POST',
              credentials: 'include',
            });
            if (res.ok) {
              router.push('/login');  // redirect to login after logout
            } else {
              alert('Logout failed');
            }
          } catch (error) {
            console.error('Logout error:', error);
            alert('Network error during logout');
          }
        }}
      >
        Logout
      </button>
    </main>
  )
}