
// src/app/groups/components/PendingRequests.jsx
'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function PendingRequests({ groupId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/membership/pending_requests`, {
          credentials: 'include'
        })
        
        if (!res.ok) {
          throw new Error(res.status === 403 
            ? 'Only group admin can view pending requests' 
            : 'Failed to fetch requests')
        }

        const data = await res.json()
        setRequests(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchRequests()
  }, [groupId])

  const handleApprove = async (requestId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
        credentials: 'include'
      })
      
      if (res.ok) {
        setRequests(prev => prev.filter(req => req.request_id !== requestId))
      }
    } catch (err) {
      console.error('Error approving request:', err)
    }
  }

  const handleDecline = async (requestId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
        credentials: 'include'
      })
      
      if (res.ok) {
        setRequests(prev => prev.filter(req => req.request_id !== requestId))
      }
    } catch (err) {
      console.error('Error declining request:', err)
    }
  }

  if (loading) return <div className="text-center py-4">Loading requests...</div>
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pending Join Requests ({requests.length})</h3>
      
      {requests.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No pending requests</p>
      ) : (
        <ul className="divide-y divide-gray-700">
          {requests.map(request => (
            <li key={request.request_id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src={request.avatar || '/default-avatar.png'}
                    alt={request.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-medium">{request.username}</p>
                    <p className="text-sm text-gray-400">
                      Requested {new Date(request.requested_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(request.request_id)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecline(request.request_id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}