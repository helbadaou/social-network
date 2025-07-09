"use client";

import styles from "./notifications.module.css";
import useGetNotifications from "@/hooks/useGetNotifications";
import NotificationCard from "@/components/ui/Cards/notification_card/notification_card";
import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";

export default function Notifications() {
  const { notifications, setNotifications, loading, error } =
    useGetNotifications();
  const [clearErr, setClearErr] = useState(null);
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    const markasRead = async () => {
      try {
        await fetchClient("/api/notification/read_all");
      } catch (e) {
        console.error(e);
      }
    };

    markasRead();
  }, []);

  const handleClear = async (e) => {
    e.preventDefault();
    if (clearLoading) return;
    setClearLoading(true);
    try {
      await fetchClient("/api/notification/clear_all");
      setClearLoading(false);
      setNotifications([]);
    } catch (e) {
      setClearErr(e);
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Notifications</h2>
        <button onClick={handleClear} disabled={notifications.length === 0}>
          Clear All
        </button>
      </div>
      <div className={`${styles.notification_container}`}>
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>{error}</p>
        ) : !notifications || notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          notifications.map((n) => (
            <NotificationCard notification={n} key={n.id} />
          ))
        )}
      </div>
    </div>
  );
}
