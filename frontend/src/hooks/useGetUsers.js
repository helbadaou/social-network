import fetchClient from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";

function getRandomLetter() {
  const min = 97; // 'a'
  const max = 122; // 'z'

  const randomCharCode = Math.floor(Math.random() * (max - min + 1)) + min;

  return String.fromCharCode(randomCharCode);
}

export default function useGetUsers(q) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("null");

  const fetchUsers = async () => {
    setErr(null);
    try {
      const data = await fetchClient("/api/users/search", {
        params: {
          q: q && q.length > 0 ? q : getRandomLetter(),
        },
      });
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
    fetchUsers();
  }, [q]);

  return {
    users,
    err,
    loading,
  };
}
