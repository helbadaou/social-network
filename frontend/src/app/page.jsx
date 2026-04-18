'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import styles from './LandingPage.module.css'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) {
      return
    }

    if (user?.ID) {
      router.push('/home')
    }
  }, [loading, user, router])

  if (loading) {
    return <main className={styles.loading}>Loading...</main>
  }

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <p className={styles.badge}>Social Network</p>
        <h1 className={styles.title}>Connect, share, and build your community.</h1>
        <p className={styles.subtitle}>
          A modern space to post updates, follow people, chat in real time, and join groups.
        </p>

        <div className={styles.actions}>
          <Link href="/register" className={styles.primaryAction}>
            Create account
          </Link>
          <Link href="/login" className={styles.secondaryAction}>
            Login
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        <article className={styles.featureCard}>
          <h2>Share posts</h2>
          <p>Publish text and images with privacy options that match your audience.</p>
        </article>
        <article className={styles.featureCard}>
          <h2>Live messaging</h2>
          <p>Chat instantly with real-time updates and clean conversation threads.</p>
        </article>
        <article className={styles.featureCard}>
          <h2>Groups and events</h2>
          <p>Create communities, organize events, and grow meaningful connections.</p>
        </article>
      </section>
    </main>
  )
}
