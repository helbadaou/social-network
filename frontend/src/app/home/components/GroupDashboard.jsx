'use client'

import { useState } from 'react'

import styles from './GroupDashboard.module.css';


export default function GroupDashboard({ group , onClose}) {


  const [activeTab, setActiveTab] = useState('chat')


  return (
    <div className={styles.groupDashboardOverlay}>
      <div className={styles.groupDashboardPopup}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>×</button>

       <p>{group.title}</p>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('chat')}
            className={activeTab === 'chat' ? `${styles.activeTab}` : ''}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={activeTab === 'posts' ? `${styles.activeTab}` : ''}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={activeTab === 'events' ? `${styles.activeTab}` : ''}
          >
            Events
          </button>
        </div>

        {/* Dynamic content area */}
        <div className={styles.tabContent}>
          {activeTab === 'chat' && (
            <div>
              <h2>Group Chat</h2>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
              <p>Messages between members will appear here.</p>
            </div>
          )}

          {activeTab === 'posts' && (
            <div>
              <h2>Group Posts</h2>
              <p>Display latest group posts and updates here.</p>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h2>Upcoming Events</h2>
              <p>Show event cards, RSVP options, etc.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
