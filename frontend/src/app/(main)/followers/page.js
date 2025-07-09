"use client";

import styles from "./followers.module.css";
import profile_banner from "../../../../public/profilBG.png";
import pfp from "../../../../public/pfp.png";
import Image from "next/image";
import { useState, useCallback } from "react";
import useGetFollowers from "@/hooks/useGetFollowers";
import { useAuth } from "@/providers/AuthProvider";
import FollowerCard from "@/components/ui/Cards/follower_card/follower_card";
import useGetFollowRequests from "@/hooks/useGetFollowRequests";
import ImageElem from "@/components/shared/image/Image";

export default function Followers() {
  const [activeTab, setActiveTab] = useState("followers");
  const { user } = useAuth();
  const { followers, followersError, followersLoading, refreshFollowers } = useGetFollowers(
    user.id,
    activeTab
  );
  const { requests, requestError, requestLoading, refreshRequests } = useGetFollowRequests();

  const handleFollowSuccess = useCallback(() => {
    refreshFollowers();
    refreshRequests();
  }, [refreshFollowers, refreshRequests]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Image
            src={profile_banner}
            alt="Profile Banner"
            className={styles.banner_img}
            priority
          />
          {user?.avatar ? (
            <ImageElem path={user.avatar} className={styles.pfp} />
          ) : (
            <img src={pfp.src} alt="pfp" className={styles.pfp} />
          )}
        </div>
        <div className={styles.names}>
          <p className={styles.name}>{`${user.lastname} ${user.firstname}`}</p>
          {user?.nickname && (
            <span className={styles.username}>@{user.nickname}</span>
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.nav}>
            <div
              className={`${styles.nav_item} ${
                activeTab === "followers" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("followers")}
            >
              Followers
            </div>
            <div
              className={`${styles.nav_item} ${
                activeTab === "followings" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("followings")}
            >
              Following
            </div>
            <div
              className={`${styles.nav_item} ${
                activeTab === "request" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("request")}
            >
              Request
            </div>
          </div>
          <div className={styles.content}>
            {activeTab === "followers" && (
              <div>
                {followersLoading ? (
                  <p>Loading...</p>
                ) : followersError ? (
                  <p>Something went wrong</p>
                ) : followers?.length === 0 ? (
                  <p>No followers yet</p>
                ) : (
                  followers.map((follower) => (
                    <FollowerCard
                      follower={follower}
                      type={"follower"}
                      key={follower.id}
                      onFollowSuccess={handleFollowSuccess}
                    />
                  ))
                )}
              </div>
            )}
            {activeTab === "followings" && (
              <div>
                {followersLoading ? (
                  <p>Loading...</p>
                ) : followersError ? (
                  <p>Something went wrong</p>
                ) : followers?.length === 0 ? (
                  <p>No Following yet</p>
                ) : (
                  followers.map((following) => (
                    <FollowerCard
                      follower={following}
                      type={"followings"}
                      key={following.id}
                      onFollowSuccess={handleFollowSuccess}
                    />
                  ))
                )}
              </div>
            )}
            {activeTab === "request" && (
              <div>
                {requestLoading ? (
                  <p>Loading...</p>
                ) : requestError ? (
                  <p>Something went wrong</p>
                ) : requests?.length === 0 ? (
                  <p>No requests yet</p>
                ) : (
                  requests.map((request) => (
                    <FollowerCard
                      follower={request}
                      type={"request"}
                      key={request.id}
                      onFollowSuccess={handleFollowSuccess}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
