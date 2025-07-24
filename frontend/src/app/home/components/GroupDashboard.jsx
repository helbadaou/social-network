'use client'

import { useState } from 'react'

export default function GroupDashboard({ group }) {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="group-dashboard">
      <h2>{group.title}</h2>

      {/* TAB SWITCHER */}
      <div className="tabs">
        <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'active' : ''}>Chat</button>
        <button onClick={() => setActiveTab('posts')} className={activeTab === 'posts' ? 'active' : ''}>Posts</button>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'active' : ''}>Events</button>
      </div>

      {/* TAB CONTENT */}
      <div className="tab-content">
        {activeTab === 'chat' && <div><p>💬 Group Chat coming soon...</p></div>}
        {activeTab === 'posts' && <div><p>📝 Group Posts will go here...</p></div>}
        {activeTab === 'events' && <div><p>📅 Group Events section...</p></div>}
      </div>
    </div>
  )
}
