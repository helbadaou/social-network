import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";
import useGetFollowing from "@/hooks/useGetFollowing";
import { useAuth } from "@/providers/AuthProvider";

export default function useGetFollowRequests(userId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getRequest = async () => {
    try {
      const data = await fetchClient("/api/follow/requests");
     
      setRequests(data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRequest();
  }, []);

  const { following, followingLoading, followingError, refreshFollowing } = useGetFollowing(userId);

  return {
    requests,
    requestLoading: loading,
    requestError: error,
  };
}
