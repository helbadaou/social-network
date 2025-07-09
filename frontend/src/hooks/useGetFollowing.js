import fetchClient from "@/lib/api/client";
import { useEffect, useState, useCallback } from "react";

export default function useGetFollowing(userId) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getFollowing = useCallback(async () => {
    if (!userId) {
      setError("User ID is required");
      return;
    }
    setError(null);
    try {
      const data = await fetchClient(`/api/followings/${userId}`);
      setFollowing(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    getFollowing();
  }, [getFollowing]);

  return {
    following,
    followingLoading: loading,
    followingError: error,
    refreshFollowing: getFollowing
  };
} 