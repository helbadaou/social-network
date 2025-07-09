import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";

export default function useGetNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getNotifications = async () => {
    try {
      const data = await fetchClient("/api/notification");
      setNotifications(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return { notifications, setNotifications, loading, error };
}
