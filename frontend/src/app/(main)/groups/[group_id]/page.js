"use client";

import React, { use, useEffect, useState } from "react";
import styles from "./groups.module.css";
import useGetGroup from "@/hooks/useGetGroup";
import { useRouter } from "next/navigation";
import Post from "@/components/ui/Post/Post";
import useGetProfile from "@/hooks/useGetProfile";
import fetchClient from "@/lib/api/client";
import AddUserModal from "@/components/ui/Modals/add_user/add_user";
import CreateGroupPost from "@/components/ui/Modals/create_group_post/create_group_post";
import { useAuth } from "@/providers/AuthProvider";
import Image from "next/image";
import pfp from "../../../../../public/pfp.png";
import ImageElem from "@/components/shared/image/Image";
import CreateEventModal from "@/components/ui/Modals/create_event/create_event";
import EventCard from "@/components/ui/Cards/EventCard/EventCard";

function RequestCard({ request, group }) {
  const { profile, loading, error } = useGetProfile(request.user_id);

  async function handleAccept(e) {
    e.preventDefault();
    try {
      await fetchClient(`/api/group/${group.id}/accept/${request.user_id}`);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    try {
      await fetchClient(`/api/group/${group.id}/reject/${request.user_id}`);
    } catch (e) {
      console.log(e);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.invite}>
      <span className={styles.inviteName}>
        {`${profile.firstname} ${profile.lastname}`}
      </span>
      <div className={styles.inviteActions}>
        <button className={styles.acceptBtn} onClick={handleAccept}>
          Accept
        </button>
        <button className={styles.declineBtn} onClick={handleReject}>
          Decline
        </button>
      </div>
    </div>
  );
}

export default function Group({ params }) {
  const router = useRouter();
  const { user } = useAuth();
  const unwrappedParams = React.use(params);
  const group_id = unwrappedParams.group_id;
  const [activeTab, setActiveTab] = useState("posts");
  const { group, loading, err, refetch } = useGetGroup(group_id);
  const [show, setShow] = useState(false);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleOpenChat = () => {
    router.push(`/groups/chat/${group_id}`);
  };

  const fetchEvents = async () => {
    try {
      const data = await fetchClient(`/api/group/${group_id}/events`);
      setEvents(data.data || []);
    } catch (err) {
      console.error("Oops, something went wrong!", err);
    }
  };

  useEffect(() => {
    if (group_id) {
      fetchEvents();
    }
  }, [group_id]);

  const handleTabChange = (tab) => setActiveTab(tab);

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (err)
    return (
      <div className={styles.container}>
        <p>{err}</p>
        <button onClick={() => router.back()}>Go back</button>
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{group.title}</h1>
        <div className={styles.headerAction}>
          <button
            className={styles.addUserBtn}
            onClick={() => setShow((prev) => !prev)}
          >
            Add User
          </button>
          <button
            className={styles.addUserBtn}
            onClick={() => setShowCreateModal((prev) => !prev)}
          >
            Create Post
          </button>
          <button className={styles.addUserBtn} onClick={handleOpenChat}>
            Open Chat
          </button>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {[
            "posts",
            "invites",
            ...(user.id === group.creatorId ? ["requests"] : []),
            "events",
          ].map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${
                activeTab === tab ? styles.active : ""
              }`}
              onClick={() => handleTabChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "posts" && (
          <div className={styles.postsSection}>
            {group.posts?.length === 0 ? (
              <p>No posts yet</p>
            ) : (
              group.posts.map((post) => (
                <Post key={post.id} post={post} posts={group.posts} isGroup={true} />
              ))
            )}
          </div>
        )}

        {activeTab === "invites" && (
          <div className={styles.invitesSection}>
            {group.invites?.length === 0 ? (
              <p>No invites yet</p>
            ) : (
              group.invites.map((invite) => (
                <div key={invite.id} className={styles.invite}>
                  <span className={styles.inviteName}>{invite.name}</span>
                  <div className={styles.inviteActions}>
                    <button className={styles.acceptBtn}>Accept</button>
                    <button className={styles.declineBtn}>Decline</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "requests" && user.id === group.creatorId && (
          <div className={styles.invitesSection}>
            {group.requests?.length === 0 ? (
              <p>No requests yet</p>
            ) : (
              group.requests.map((request) => (
                <RequestCard key={request.id} request={request} group={group} />
              ))
            )}
          </div>
        )}

        {activeTab === "events" && (
          <div className={styles.eventsSection}>
            <button className={styles.newEventBtn} onClick={() => setShowEventModal(true)}>
              Create Event
            </button>
            {events.length === 0 ? (
              <p>No events yet</p>
            ) : (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  groupId={group_id}
                  onResponseUpdate={fetchEvents}
                />
              ))
            )}
          </div>
        )}
      </div>

      {show && <AddUserModal show={show} setShow={setShow} groupId={group_id} />}
      {showCreateModal && (
        <CreateGroupPost
          show={showCreateModal}
          setShow={setShowCreateModal}
          groupId={group_id}
          onPostCreated={refetch}
        />
      )}
      {showEventModal && (
        <CreateEventModal
          show={showEventModal}
          setShow={setShowEventModal}
          groupId={group_id}
          onEventCreated={fetchEvents}
        />
      )}
    </div>
  );
}
