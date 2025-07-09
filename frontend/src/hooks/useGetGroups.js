import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";

function filterGroups(groups = [], activeTab) {
  if (activeTab === "browse_group") {
    return groups.filter((g) => !g.isMember) || [];
  }
  if (activeTab === "my_groups") {
    return groups.filter((g) => g.isMember) || [];
  }

  if (activeTab === "invites") {
    return groups.filter((g) => g.isInvited) || [];
  }
}

export default function useGetGroups(activeTab) {
  const [groups, setGroups] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchGroups = async () => {
    try {
      const data = await fetchClient("/api/groups");
      setGroups(filterGroups(data.data || [], activeTab));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!user) return;
    try {
      const data = await fetchClient(`/api/users/${user.id}/group-invites`);
      setInvites(data.data || []);
    } catch (e) {
      console.error("Error fetching invites:", e);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [activeTab, user]);

  return { groups, invites, loading, error };
}
