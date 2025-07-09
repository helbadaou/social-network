import fetchClient from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";

export default function useGetRecentUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchRecentUsers = async () => {
    setErr(null);
    try {
      const data = await fetchClient("/api/users/recent");
      setUsers(data.data.users?.filter((u) => u.id !== user.id) || []);
    } catch (e) {
      if (e.status !== 404) {
        setErr(e.message);
      } else {
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentUsers();
  }, []);

  return {
    users,
    err,
    loading,
    refetch: fetchRecentUsers,
  };
} 