// src/app/groups/components/GroupList.jsx
'use client'
import { useEffect, useState } from 'react'
import GroupCard from './GroupCard'

export default function GroupList() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups', {
          credentials: 'include'
        })
        const data = await res.json()
        setGroups(data)
      } catch (err) {
        console.error('Error fetching groups:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [])

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-4 h-32 animate-pulse"></div>
      ))}
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups !== null && groups.map(group => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}