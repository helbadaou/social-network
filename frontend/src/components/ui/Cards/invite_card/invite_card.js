"use client";

import pfp from "../../../../../public/pfp.png";
import styles from "./invite_card.module.css";
import ImageElem from "@/components/shared/image/Image";
import fetchClient from "@/lib/api/client";
import { useState } from "react";

export default function InviteCard({ user, groupId }) {
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState(null);

  async function handleInvite(e) {
    e.preventDefault();
    if (isInviting) return;

    setIsInviting(true);
    setError(null);

    try {
      await fetchClient(`/api/group/${groupId}/invite/${user.id}`, {
        method: "POST",
      });
    } catch (err) {
      setError(err.message || "Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.detail}>
        {user.avatar ? (
          <ImageElem
            path={user.avatar}
            className={styles.avatar}
            width={40}
            height={40}
          />
        ) : (
          <img 
            src={pfp.src} 
            alt={`${user.firstname}'s profile picture`}
            className={styles.avatar}
            width={40}
            height={40}
          />
        )}
        <div className={styles.names}>
          <h3 className={styles.name}>
            {`${user.firstname} ${user.lastname}`}
          </h3>
          {user.nickname && (
            <span className={styles.nickname}>@{user.nickname}</span>
          )}
        </div>
      </div>
      <div>
        <button 
          className={styles.invite_button}
          onClick={handleInvite}
          disabled={isInviting}
        >
          {isInviting ? "Inviting..." : "Invite"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
