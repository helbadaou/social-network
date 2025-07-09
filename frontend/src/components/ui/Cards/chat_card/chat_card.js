import useGetProfile from "@/hooks/useGetProfile";
import styles from "./chat_card.module.css";
import pfp from "../../../../../public/pfp.png";
import Image from "next/image";
import ImageElem from "@/components/shared/image/Image";

export default function ChatCard({ chat, userId, openChat }) {
  const { profile, loading } = useGetProfile(
    userId === chat.following_id ? chat.follower_id : chat.following_id
  );
  if (!chat) return;
  return loading ? (
    <p>loading...</p>
  ) : (
    <div
      className={styles.chat_card}
      onClick={() =>
        openChat(
          userId === chat.following_id ? chat.follower_id : chat.following_id
        )
      }
    >
      {profile?.avatar ? (
        <ImageElem path={profile.avatar} className={styles.chat_pfp} />
      ) : (
        <img src={pfp.src} alt="pfp" className={styles.chat_pfp} height={150} width={150}/>
      )}
      <div className={styles.chat_info}>
        <div className={styles.header}>
          <p className={styles.chat_name}>
            {`${profile.lastname} ${profile.firstname}`}{" "}
            {profile.nickname && <span>@{profile.nickname}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
