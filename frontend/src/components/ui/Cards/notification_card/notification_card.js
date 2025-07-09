import { useAuth } from "@/providers/AuthProvider";
import styles from "./notification_card.module.css";
import fetchClient from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/icons/Icon";
import { formatDate } from "@/lib/utils";

export default function NotificationCard({ notification }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleNotificationClick = () => {
    if (notification.type === "GROUP_INVITE") {
      router.push("/groups?tab=invites");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "GROUP_INVITE":
        return "group";
      case "LIKE":
        return "like";
      case "COMMENT":
        return "comment";
      case "FOLLOW":
        return "profile";
      case "MESSAGE":
        return "chat";
      default:
        return "notification";
    }
  };

  return (
    <div
      className={`${styles.notification} ${
        notification.type === "GROUP_INVITE" ? styles.clickable : ""
      } ${!notification.isRead ? styles.unread : ""}`}
      onClick={handleNotificationClick}
    >
      <div className={styles.notification_icon}>
        {/* <Icon name={getNotificationIcon(notification.type)} size={20} /> */}
      </div>
      <div className={styles.notification_content}>
        <div className={styles.notification_header}>
          <h2>{notification.userName}</h2>
          <span className={styles.notification_time}>
            {formatDate(new Date(notification.createdAt))}
          </span>
        </div>
        <p>{notification.content}</p>
      </div>
    </div>
  );
}
