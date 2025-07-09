import fetchClient from "@/lib/api/client";
import { useEffect, useState } from "react";

export default function useGetComments(post, isGroup) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    try {
      let endpoint = isGroup
        ? `/api/group-posts/${post.id}`
        : `/api/post/${post.id}`;
      const data = await fetchClient(endpoint);
      console.log(data);
      const com = data?.data?.data?.Comments || data?.data?.Data?.Comments;
      setComments(com || []);
    } catch (e) {
      console.log(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  return {
    comments,
    setComments,
    commentLoading: loading,
    commentError: error,
  };
}
