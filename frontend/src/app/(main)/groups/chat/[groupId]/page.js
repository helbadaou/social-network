import GroupChat from "@/components/ui/Chat/GroupChat";
import styles from "./page.module.css";
import { use } from "react";

export default function GroupChatPage({ params }) {
  const { groupId } = use(params);
  return (
    <div className={styles.container}>
      <GroupChat groupId={groupId} />
    </div>
  );
} 