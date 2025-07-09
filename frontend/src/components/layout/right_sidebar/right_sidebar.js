import styles from "./right_sidebar.module.css";
import pfp from "../../../../public/pfp.png";
import Icon from "@/components/shared/icons/Icon";
import useGetRecentUsers from "@/hooks/useGetRecentUsers";
import { useState } from "react";
import fetchClient from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";

function FollowCard({ user, onFollowSuccess }) {
  const [isFollowing, setIsFollowing] = useState(user.is_following || false);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useAuth();

  if (!user) return null;

  const handleFollow = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await fetchClient(`/api/follow/${user.id}`, {
        method: 'POST'
      });
      setIsFollowing(true);
      if (onFollowSuccess) {
        onFollowSuccess();
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.element}>
      <div className={styles.details}>
        <img src={user.avatar || pfp.src} alt="pfp" width={50} height={50} className={styles.avatar} />
        <div className={styles.name}>
          <h3>{`${user.firstname} ${user.lastname}`}</h3>
          {user.nickname ? <p>@{user.nickname}</p> : ""}
        </div>
      </div>
      <button 
        className={`${styles.button} ${isFollowing ? styles.following : ''}`}
        onClick={handleFollow}
        disabled={isLoading || isFollowing}
      >
        {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

function UsersFollow() {
  const { users, err, loading, refetch } = useGetRecentUsers();

  const handleFollowSuccess = () => {
    refetch(); // Rafraîchir la liste après un follow
  };

  return (
    <div className={styles.sugestions}>
      <h2>Who to follow</h2>
      <div className={styles.cards}>
        {err ? (
          <p>Error Loading the users</p>
        ) : loading ? (
          <p>Loading...</p>
        ) : users.length === 0 ? (
          <p>No users to follow</p>
        ) : (
          users.map((u) => (
            <FollowCard 
              key={u.id} 
              user={u} 
              onFollowSuccess={handleFollowSuccess}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function RightSideBar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`${styles.container} right_sidebar ${isCollapsed ? styles.collapsed : ''}`}>
      <button className={styles.collapseBtn} onClick={toggleCollapse}>
        <Icon name={isCollapsed ? "chevron-left" : "chevron-right"} size={20} />
      </button>
      
      <div className={styles.header}>
        <div className={styles.search_container}>
          <input
            type="text"
            placeholder="Search"
          />
          <Icon name="search" size={24} />
        </div>
      </div>
      
      <div className={styles.content}>
        <UsersFollow />
      </div>
    </div>
  );
}
