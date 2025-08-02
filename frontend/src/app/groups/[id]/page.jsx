// src/app/groups/[groupId]/page.js
'use client'
import { useEffect, useState } from 'react'
import GroupDashboard from '../../components/GroupDashboard'

export default function GroupDetailPage({ params }) {
  const { groupId } = params
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        const data = await res.json()
        setGroup(data)
      } catch (err) {
        console.error('Error fetching group:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroup()
  }, [groupId])

  if (loading) return <div>Loading group...</div>
  if (!group) return <div>Group not found</div>

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <GroupDashboard group={group} />
    </div>
  )
}