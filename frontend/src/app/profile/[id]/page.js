'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function PublicProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!id) return
    fetch(`http://localhost:8080/api/users/${id}`, {
      credentials: 'include',
    })
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(data => setProfile(data))
      .catch(() => {
        setError("Ce profil n'existe pas.")
      })
  }, [id])

  if (error) return <p className="text-red-600">{error}</p>
  if (!profile) return <p>Chargement du profil...</p>

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">
        Profil de {profile.first_name} {profile.last_name}
      </h1>
      <img
        src={profile.avatar || '/avatar.png'}
        alt="Avatar"
        className="w-24 h-24 rounded-full border mb-4"
      />
      <p><strong>Nom d'utilisateur :</strong> @{profile.nickname}</p>
      <p><strong>Email :</strong> {profile.email}</p>
      <p><strong>À propos :</strong> {profile.about || 'N/A'}</p>
      <p><strong>Date de naissance :</strong> {profile.date_of_birth}</p>
    </main>
  )
}