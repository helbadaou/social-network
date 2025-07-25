'use client'

import { useEffect, useState } from 'react'
import Modal from "../components/Modal";
import GroupDashboard from '../components/GroupDashboard';

export default function MessageSidebar({
  chatUsers,
  showMessages,
  setShowMessages,
  openChat,
  currentUserId
}) {

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')


  const [groups, setGroups] = useState([])


  const [showModal, setShowModal] = useState(false)
  const [showGroupAccessModal, setShowGroupAccessModal] = useState(false);



  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('messages')

  const [activeGroupId, setActiveGroupId] = useState(null)


  const [groupState, setGroupState] = useState("");

  const [inviteData, setInviteData] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);




  const otherUsers = chatUsers.filter(u => u.id !== currentUserId)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups')
        if (!res.ok) throw new Error('Failed to fetch groups')
        const data = await res.json()
        setGroups(data)
        console.log(data)
      } catch (err) {
        console.error('Error fetching groups:', err)
      }
    }

    fetchGroups()
  }, [])



  const filteredGroups = groups?.filter(group =>
    group.title.toLowerCase().includes(searchTerm.toLowerCase())
  )




  const handleCreateGroup = async () => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGroupName,
          description: newGroupDesc,
          creator_id: currentUserId
        })
      })

      if (!res.ok) throw new Error('Failed to create group')

      const newGroup = await res.json()
      setGroups(prev => [...prev || [], newGroup])
      setShowModal(false)
      setNewGroupName('')
      setNewGroupDesc('')
    } catch (err) {
      console.error(err)
    }
  }


  const handleGroupClick = async (groupId) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/membership`, {
        credentials: 'include',
      });
      const data = await res.json();

      setActiveGroupId(groupId);

      const selectedGroup = groups.find(group => group.id === groupId);
      
      setSelectedGroup(selectedGroup);


      

      switch (data.status) {
        case 'accepted':
          setGroupState('accepted');
          break;
        case 'pending':
          setGroupState('pending');
          break;
        case 'invited':
          setGroupState('invited');
          setInviteData({ inviter: data.inviterName });
          break;
        case 'none':
          setGroupState('none');
          break;
        case 'creator':
          setGroupState('creator');
          break;
      }

      setShowGroupAccessModal(true); // only open the group modal here

    } catch (err) {
      console.error('Failed to check group access', err);
    }
  };








  const handleJoinGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/join`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Join request failed")
      setGroupState("pending")
    } catch (err) {
      console.error("Error joining group:", err)
    }
  }

  const handleAcceptInvite = async () => {
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/invite/accept`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Accept failed")
      setGroupState("accepted")
    } catch (err) {
      console.error("Error accepting invite:", err)
    }
  }


  const handleDeclineInvite = async () => {
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/membership/decline`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Decline failed")
      setShowGroupAccessModal(false)
    } catch (err) {
      console.error("Error declining invite:", err)
    }
  }



















  return (
    <div
      className={`fixed top-0 left-0 h-full w-100 bg-gray-900 shadow-lg transform transition-transform duration-300 z-40 ${showMessages ? 'translate-x-0' : '-translate-x-full'
        }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('messages')}
            className={`text-sm font-medium ${activeTab === 'messages' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
          >
            📨 Messages
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`text-sm font-medium ${activeTab === 'groups' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-300'
              }`}
          >
            👥 Groups
          </button>
        </div>
        <button
          onClick={() => setShowMessages(false)}
          className="text-gray-400 hover:text-white"
        >
          ✖
        </button>
      </div>

      {/* Main Content */}
      <div className="overflow-y-auto max-h-[calc(100%-56px)]">
        {activeTab === 'messages' ? (
          otherUsers.length > 0 ? (
            otherUsers.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-2 mb-3 cursor-pointer hover:bg-gray-800 p-2 rounded-md"
                onClick={() => openChat(u)}
              >
                <img
                  src={
                    u.avatar
                      ? u.avatar.startsWith('http')
                        ? u.avatar
                        : `http://localhost:8080/${u.avatar}`
                      : '/avatar.png'
                  }
                  className="w-8 h-8 rounded-full"
                  alt="avatar"
                />
                <span className="text-sm font-medium text-white">{u.full_name}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm p-4">Aucun autre utilisateur</p>
          )
        ) : (
          <div className="p-4">
            {/* Group Search & Create */}
            <div className="flex justify-between items-center mb-4">
              <input
                type="text"
                placeholder="Search groups..."
                className="p-2 border rounded w-2/3 bg-gray-800 text-white border-gray-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ➕ New Group
              </button>
            </div>

            {/* Modal */}


            {showModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-gray-800 p-6 rounded shadow-md w-96 border border-gray-700">
                  <h2 className="text-lg font-semibold mb-4 text-white">Create New Group</h2>
                  <input
                    type="text"
                    placeholder="Group Title"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    className="w-full mb-3 p-2 bg-gray-700 text-white border border-gray-600 rounded"
                  />
                  <textarea
                    placeholder="Group Description"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    className="w-full mb-3 p-2 bg-gray-700 text-white border border-gray-600 rounded"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateGroup}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}


            {showGroupAccessModal && (
              <Modal onClose={() => setShowGroupAccessModal(false)}>

                {groupState === "none" && (
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-4">Join Group</h2>
                    <p className="text-gray-300 mb-4">You're not a member of this group.</p>
                    <button onClick={handleJoinGroup}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Request to Join
                    </button>
                  </div>
                )}

                {groupState === "pending" && (
                  <div className="group-access-ui">
                    <h2>Request Sent</h2>
                    <p>Your join request is pending approval.</p>
                  </div>
                )}

                {groupState === "invited" && (
                  <div className="group-access-ui">
                    <h2>You've been invited!</h2>
                    <p>Would you like to join this group?</p>
                    <button onClick={handleAcceptInvite}>Accept</button>
                    <button onClick={handleDeclineInvite}>Decline</button>
                  </div>
                )}

                {groupState === "creator" && (
                  <div className="group-access-ui">

                    <GroupDashboard group={selectedGroup} onClose={() => setShowGroupAccessModal(false)}/>

                  </div>
                )}

                {(groupState === "accepted") && (
                  <GroupDashboard group={selectedGroup} />
                )}
              </Modal>
            )}














            {/* Group List */}
            <ul className="space-y-2 mt-4">



              {filteredGroups?.length > 0 ? (
                filteredGroups.map(group => (
                  <li
                    key={group.id}
                    onClick={() => handleGroupClick(group.id)}
                    className="p-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 cursor-pointer">
                    <strong className="text-white">{group.title}</strong>
                    <p className="text-sm text-gray-400">{group.description}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-400">No groups found.</p>
              )}




            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
