"use client";

import Chat from "@/components/ui/Chat/chat";
import styles from "./chat.module.css";
import { use } from "react";

export default function ChatPage({ params }) {
  const { user_id } = use(params);

  return (
    <div className={styles.container}>
      <Chat userId={user_id} />
    </div>
  );
}
