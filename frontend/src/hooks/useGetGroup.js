import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";

export default function useGetGroup(group_id) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchGroup = async () => {
    try {
      if (!group_id) {
        setErr("Invalid group id");
      }
      const data = await fetchClient(`/api/group/${group_id}`);
      let current = { ...data.data };
      if (!current.posts) current.posts = [];
      if (!current.invites) current.invites = [];
      if (!current.requests) current.requests = [];
      if (!current.events) current.events = [];

      setGroup(current);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [group_id]);

  return {
    group,
    loading,
    err,
  };
}
