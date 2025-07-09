"use client";

import styles from "./chats.module.css";
import profile_banner from "../../../../public/profilBG.png";
import pfp from "../../../../public/pfp.png";
import Image from "next/image";
import ImageElem from "@/components/shared/image/Image";
import { useAuth } from "@/providers/AuthProvider";
import useGetChats from "@/hooks/useGetChats";
import ChatCard from "@/components/ui/Cards/chat_card/chat_card";
import { useRouter } from "next/navigation";

export default function Chats() {
  const { user } = useAuth();
  const { chats, loading, error } = useGetChats();
  const router = useRouter();

  const openChat = (user_id) => {
    router.push(`/chats/${user_id}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          
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
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p>{error}</p>
          ) : chats.length === 0 ? (
            <p>No chats found.</p>
          ) : (
            chats.map((chat) => (
              <ChatCard
                chat={chat}
                userId={user.id}
                key={chat.id}
                openChat={openChat}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
