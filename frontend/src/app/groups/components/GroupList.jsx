// src/app/groups/components/GroupList.jsx
'use client'
import { useEffect, useState } from 'react'
import GroupCard from './GroupCard'
import { useRouter } from 'next/navigation'

export default function GroupList() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups')
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

  const handleGroupClick = (groupId) => {
    router.push(`/groups/${groupId}`)
  }

  if (loading) return <div>Loading groups...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map(group => (
        <GroupCard 
          key={group.id}
          group={group}
          onClick={() => handleGroupClick(group.id)}
        />
      ))}
    </div>
  )
}