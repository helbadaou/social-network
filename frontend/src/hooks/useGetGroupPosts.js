import fetchClient from "@/lib/api/client";
import { useEffect, useRef, useState } from "react";

export default function useGetGroupPosts(groupId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [isDone, setIsDone] = useState(false);
  const [oldScroll, setOldScroll] = useState(0);
  const postContainer = useRef(null);

  const fetchGroupPosts = async (nextPage) => {
    if (isDone || loading || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchClient(`/api/group-posts/list/${groupId}`, {
        params: { page: nextPage },
      });
      console.log(res);
      // Correctly handle the response structure
      if (res.data) {
        const postsData = res.data;

        if (!postsData.posts || postsData.posts.length === 0) {
          setIsDone(true);
          return;
        }

        // If we're on the last page of results
        if (postsData.currentPage * postsData.perPage >= postsData.totalCount) {
          setIsDone(true);
        }

        console.log(postsData.posts);
        setPosts((prevPosts) => [...prevPosts, ...postsData.posts]);
      } else {
        // Handle unexpected response format
        setError("Invalid response format");
        setIsDone(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentContainer = postContainer.current;
    if (currentContainer) {
      currentContainer.addEventListener("scroll", handleLoadMore);
    }

    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener("scroll", handleLoadMore);
      }
    };
  }, []);

  useEffect(() => {
    if (groupId) {
      // Reset state when groupId changes
      setPosts([]);
      setPage(1);
      setIsDone(false);
      setOldScroll(0);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      (async () => {
        setOldScroll(postContainer?.current?.scrollTop || 0);
        await fetchGroupPosts(page);
      })();
    }
  }, [page, groupId]);

  useEffect(() => {
    if (postContainer.current) {
      postContainer.current.scroll({
        top: oldScroll,
      });
    }
  }, [posts, isDone]);

  function handleLoadMore(e) {
    if (e.target.scrollTop + e.target.offsetHeight >= e.target.scrollHeight) {
      setPage((curr) => curr + 1);
    }
  }

  const refreshPosts = async () => {
    setPosts([]);
    setPage(1);
    setIsDone(false);
    setOldScroll(0);
    await fetchGroupPosts(1);
  };

  return {
    posts,
    setPosts,
    loading,
    isDone,
    error,
    fetchGroupPosts,
    page,
    setPage,
    postContainer,
    refreshPosts,
  };
}
