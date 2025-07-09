import pfp from "../../../../../public/pfp.png";
import Image from "next/image";
import styles from "./follower_card.module.css";
import { useState } from "react";
import fetchClient from "@/lib/api/client";

export default function FollowerCard({ follower, type }) {
  const [err, setErr] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!follower) return null;

  const handleRequest = async (type) => {
    setIsLoading(true);
    setErr(null);
    const path =
      type === "accept"
        ? `/api/follow/requests/${follower.follower_id}/accept`
        : `/api/follow/requests/${follower.follower_id}/reject`;

    try {
      await fetchClient(path, { method: "PUT" });
    } catch (e) {
      setErr(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      await fetchClient(`/api/remove/follower/${follower.follower_id}`, {
        method: "DELETE",
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setIsLoading(true);
    setErr(null);
    try {
      const userId = type === "followings" ? follower.id : follower.following_id;
      
      await fetchClient(`/api/unfollow/${userId}`, {
        method: "DELETE",
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`${styles.container} ${isLoading ? "loading" : ""}`}>
      <div className={styles.detail}>
        <img
          src={follower.avatar || pfp.src}
          alt={`${type === "followings" ? `${follower.firstname} ${follower.lastname}` : follower.follower_name}'s profile picture`}
          width={48}
          height={48}
        />
        <div className={styles.names}>
          <h2 className={styles.name}>
            {type === "followings" 
              ? `${follower.firstname} ${follower.lastname}`
              : type === "follower" || type === "request"
                ? follower.follower_name
                : follower.following_name
            }
          </h2>
          <p className={styles.at}>
            {type === "request" ? "Requested to follow" : "Following since"}{" "}
            {formatDate(follower.createdAt || follower.created_at)}
          </p>
        </div>
      </div>

      {type === "follower" && (
        <button onClick={handleRemove} disabled={isLoading}>
          Remove
        </button>
      )}

      {type === "followings" && (
        <button onClick={handleUnfollow} disabled={isLoading}>
          Unfollow
        </button>
      )}

      {type === "request" && (
        <div className={styles.request_buttons}>
          <button onClick={() => handleRequest("accept")} disabled={isLoading}>
            Accept
          </button>
          <button onClick={() => handleRequest("reject")} disabled={isLoading}>
            Reject
          </button>
        </div>
      )}

      {err && <p className={styles.error}>{err}</p>}
    </div>
  );
}
