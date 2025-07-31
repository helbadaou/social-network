'use client'

import { useState } from 'react'

import styles from './GroupDashboard.module.css';


export default function GroupDashboard({ group, onClose, isCreator, nonMembers }) {


  const [activeTab, setActiveTab] = useState('chat')


  return (
    <div className={styles.groupDashboardOverlay}>
      <div className={styles.groupDashboardPopup}>
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose}>×</button>

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

          {isCreator && (
            <div className={styles.inviteSection}>
              <h3>Invite Members</h3>
              {nonMembers.map(user => (
                <div key={user.id} className={styles.inviteUser}>
                  <span>{user.nickname}</span>
                  <button onClick={() => inviteUser(user.id)}>Invite</button>
                </div>
              ))}
            </div>
          )}



          {activeTab === 'chat' && (
            <div className={styles.chatContainer}>
              <div className={styles.chatMessages}>
                {/* Example messages */}
                <div className={styles.messageBubble}>Hi everyone!</div>
                <div className={`${styles.messageBubble} ${styles.sent}`}>Welcome to the group 🎉</div>
              </div>
              <div className={styles.chatInputArea}>
                <input type="text" placeholder="Type your message..." />
                <button>Send</button>
              </div>
            </div>
          )}


          {activeTab === 'posts' && (
            <div className={styles.postsContainer}>
              <form className={styles.postForm}>
                <textarea placeholder="Share something with the group..."></textarea>
                <button type="submit">Post</button>
              </form>
              <div className={styles.postList}>
                <div className={styles.postCard}>
                  <h4>John Doe</h4>
                  <p>This is a cool group, excited to be here!</p>
                </div>
                {/* Add more postCards dynamically later */}
              </div>
            </div>
          )}



          {activeTab === 'events' && (
            <div className={styles.eventsContainer}>
              <div className={styles.eventCard}>
                <h3>Monthly Group Meetup</h3>
                <p>Date: July 27, 2025</p>
                <p>Location: Casablanca</p>
                <button>RSVP</button>
              </div>
              {/* Add more eventCards dynamically later */}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
