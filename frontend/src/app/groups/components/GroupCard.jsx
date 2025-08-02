// src/app/groups/components/GroupCard.jsx
'use client'
export default function GroupCard({ group, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
    >
      <h3 className="text-lg font-semibold mb-2">{group.title}</h3>
      <p className="text-gray-400 text-sm mb-3">{group.description}</p>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{group.member_count} members</span>
        <span>Created: {new Date(group.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}