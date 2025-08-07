// src/app/groups/components/GroupCard.jsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react' // Import useState

export default function GroupCard({ group }) {
  const router = useRouter()
  const [localStatus, setLocalStatus] = useState({
    isPending: group.is_pending,
    isMember: group.is_member
  }) // Add local state for immediate feedback

  const handleJoin = async (e) => {
    e.stopPropagation()
    setLocalStatus(prev => ({ ...prev, isPending: true })) // Optimistically update UI
    
    try {
      const res = await fetch(`/api/groups/${group.id}/membership/join`, {
        method: 'POST',
        credentials: 'include'
      })
      if (res.ok) {
        router.refresh() // Refresh to get actual status from server
      } else {
        // Revert if request fails
        setLocalStatus(prev => ({ ...prev, isPending: false }))
      }
    } catch (err) {
      console.error('Error joining group:', err)
      setLocalStatus(prev => ({ ...prev, isPending: false })) // Revert on error
    }
  }

  const handleVisit = (e) => {
    e.stopPropagation()
    router.push(`/groups/${group.id}`)
  }

  // Combine server and local state for display
  const displayStatus = {
    isPending: localStatus.isPending || group.is_pending,
    isMember: localStatus.isMember || group.is_member,
    isCreator: group.is_creator
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{group.title}</h3>
        {displayStatus.isCreator && (
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

        {!displayStatus.isMember && !displayStatus.isPending && !displayStatus.isCreator && (
          <button 
            onClick={handleJoin}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
          >
            Join Group
          </button>
        )}

        {displayStatus.isPending && (
          <span className="text-xs bg-yellow-600 text-white px-3 py-1 rounded">
            Pending
          </span>
        )}

        {(displayStatus.isMember || displayStatus.isCreator) && (
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