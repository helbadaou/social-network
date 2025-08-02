// src/app/groups/components/GroupCard.jsx
'use client'
import { useRouter } from 'next/navigation'

export default function GroupCard({ group }) {
  const router = useRouter()

  const handleJoin = async (e) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/groups/${group.id}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        router.refresh() // Refresh to update status
      }
    } catch (err) {
      console.error('Error joining group:', err)
    }
  }

  const handleVisit = (e) => {
    e.stopPropagation()
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{group.title}</h3>
        {group.is_creator && (
          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
            Admin
          </span>
        )}
      </div>
      
      <p className="text-gray-400 text-sm mb-4">{group.description}</p>
      
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          <span>👥 {group.member_count} members</span>
          <span className="mx-2">•</span>
          <span>🕒 {new Date(group.created_at).toLocaleDateString()}</span>
        </div>

        {!group.is_member && !group.is_pending && !group.is_creator && (
          <button 
            onClick={handleJoin}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
          >
            Join Group
          </button>
        )}

        {group.is_pending && (
          <span className="text-xs bg-yellow-600 text-white px-3 py-1 rounded">
            Pending
          </span>
        )}

        {(group.is_member || group.is_creator) && (
          <button 
            onClick={handleVisit}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
          >
            Visit Group
          </button>
        )}
      </div>
    </div>
  )
}