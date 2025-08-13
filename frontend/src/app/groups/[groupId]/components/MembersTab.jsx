import { useState, useEffect } from 'react';
import styles from './MembersTab.module.css'

export default function MembersTab({ groupId, showInviteForm, setShowInviteForm }) {

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log('MembersTab rendered with group:', groupId);

  // Fetch group members
  const fetchMembers = async () => {
    console.log('caled here');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.status}`);
      }

      const data = await response.json();
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch members when the component is rendered (members tab is active)
  useEffect(() => {
    console.log('MembersTab mounted, calling fetchMembers');
    fetchMembers();
  }, [groupId]); // Add group.ID as dependency to refetch when group changes

  // Use fetched members if available, otherwise fallback to group.members
  const displayMembers = members.length > 0 ? members : (groupId || []);

  return (
    <>
      <button
        onClick={() => setShowInviteForm(true)}
        className={styles.inviteButton}
      >
        Invite Members
      </button>
      <button
        onClick={fetchMembers} // Fixed: was missing parentheses
        className={styles.inviteButton}
      >
        Refresh Members
      </button>

      <div className={styles.membersContainer}>
        <h3 className={styles.title}>Group Members</h3>

        {loading && <p className={styles.loadingText}>Loading members...</p>}

        {error && <p className={styles.errorText}>Error: {error}</p>}

        {!loading && !error && displayMembers.length > 0 ? (
          <div className={styles.membersList}>
            {members.map(member => (
              <MemberItem key={member.id} member={member} />
            ))}
          </div>
        ) : !loading && !error ? (
          <p className={styles.noMembersText}>No members in this group yet</p>
        ) : null}
      </div>
    </>
  );
}

function MemberItem({ member }) {
  const [imageError, setImageError] = useState(false);
  
  const displayName = member.username;
  
  const getAvatarUrl = (member) => {
    if (member.avatar) {
      return member.avatar;
    }
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=40&background=0D8ABC&color=fff`;
    
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.memberItem}>
      <div className={styles.avatar}>
        {!imageError ? (
          <img
            src={getAvatarUrl(member)}
            alt={`${displayName}'s avatar`}
            onError={handleImageError}
            className={styles.avatarImage}
          />
        ) : (
          <div className={styles.avatarFallback}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className={styles.memberInfo}>
        <p className={styles.memberName}>{displayName}</p>
        <p className={styles.memberDetails}>
          {member.joined_at && `Joined ${new Date(member.joined_at).toLocaleDateString()}`}
          {member.is_admin && (
            <span className={styles.adminBadge}>
              Admin
            </span>
          )}
        </p>
      </div>
    </div>
  )
}