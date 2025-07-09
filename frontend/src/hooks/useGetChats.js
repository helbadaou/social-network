import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";

function filterDuplicateFollows(follows) {
  const seen = new Set();
  return follows.filter((follow) => {
    // Create a unique key for each relationship using sorted IDs
    const smallerId = Math.min(follow.follower_id, follow.following_id);
    const largerId = Math.max(follow.follower_id, follow.following_id);
    const relationshipKey = `${smallerId}-${largerId}`;

    // If we've seen this relationship, filter it out
    if (seen.has(relationshipKey)) {
      return false;
    }

    // Mark this relationship as seen and keep this record
    seen.add(relationshipKey);
    return true;
  });
}

export default function useGetChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getChats = async () => {
    try {
      setError(null);
      const res = await fetchClient("/api/chats");
      let filtered = res.data ? filterDuplicateFollows(res.data) : [];
      setChats(filtered);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getChats();
  }, []);

  return {
    chats,
    loading,
    error,
  };
}
