import fetchClient from "@/lib/api/client";
import { useEffect, useRef, useState } from "react";

export default function useGetPost() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [isDone, setIsDone] = useState(false);
  const [oldScroll, setOldScroll] = useState(0);
  const postContainer = useRef(null);
  const isLoadingMore = useRef(false);

  const fetchPosts = async (nextPage) => {
    if (isDone || loading) return;

    // Capture scroll position before loading new posts
    if (nextPage > 1) {
      const currentScroll = postContainer?.current?.scrollTop || 0;
      setOldScroll(currentScroll);
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchClient("/api/posts", {
        params: { page: nextPage },
      });
      const postsData = res.data.Data;
      if (!postsData.Posts) {
        setIsDone(true);
        return;
      }

      setPosts((posts) => [...posts, ...postsData.Posts]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    postContainer?.current?.addEventListener("scroll", handleLoadMore);
    return () => {
      postContainer?.current?.removeEventListener("scroll", handleLoadMore);
    };
  }, []);

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  useEffect(() => {
    if (page > 1 && postContainer.current && oldScroll > 0) {
      postContainer.current.scrollTop = oldScroll;
    }
  }, [posts, isDone]);

  async function handleLoadMore(e) {
    if (isLoadingMore.current || loading || isDone) return;

    const target = e.target;
    const scrolledToBottom =
      Math.round(target.scrollTop + target.offsetHeight) + 100 >=
      target.scrollHeight;

    if (scrolledToBottom) {
      isLoadingMore.current = true;
      setPage((curr) => curr + 1);
      // Reset the loading flag after a short delay
      setTimeout(() => {
        isLoadingMore.current = false;
      }, 100);
    }
  }

  return {
    posts,
    setPosts,
    loading,
    isDone,
    error,
    fetchPosts,
    page,
    setPage,
    postContainer,
  };
}
