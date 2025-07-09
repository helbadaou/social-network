import Icon from "@/components/shared/icons/Icon";
import fetchClient from "@/lib/api/client";
import { useState } from "react";

export function Like({ post, setPost }) {
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let endPoint = post.group_id
        ? `/api/group-posts/post/${post.id}/react`
        : `/api/react/post/${post.id}`;

      let reaction = "LIKE";
      if (post.group_id) {
        reaction = post.is_user_liked ? "" : "LIKE";
      } else {
        reaction = post?.isUserLiked ? "" : "LIKE";
      }

      await fetchClient(endPoint, {
        params: { reaction },
      });
      const newPost = { ...post };
      if (post.group_id) {
        newPost.is_user_liked = !newPost.is_user_liked;
      } else {
        newPost.isUserLiked = !newPost.isUserLiked;
      }
      console.log(newPost);
      setPost(newPost);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Icon
      name="heart"
      color="red"
      size={24}
      onClick={handleLike}
      fill={post.group_id ? !!post.is_user_liked : !!post.isUserLiked}
      style={{
        cursor: "pointer",
      }}
    />
  );
}
