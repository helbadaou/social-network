import styles from "./post.module.css";
import pfp from "../../../../public/pfp.png";
import Image from "next/image";
import Icon from "@/components/shared/icons/Icon";
import { useState } from "react";
import Comments from "../Comment/comments";
import { Like } from "./Like";
import ImageElem from "@/components/shared/image/Image";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import GroupComments from "../GroupComment/comments";

export default function Post({ post, posts, onLikePost, isGroup }) {
  const [openComments, setOpenComments] = useState(false);
  const [currentPost, setCurrentPost] = useState({ ...post });
  const router = useRouter();

  if (!post) {
    return null;
  }
  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        style={{ cursor: "pointer" }}
        onClick={() => router.push(`/profile?userId=${currentPost?.userId}`)}
      >
        {currentPost?.avatar ? (
          <ImageElem src={currentPost?.avatar} className={styles.pfp} />
        ) : (
          <img src={pfp.src} alt="pfp" className={styles.pfp} />
        )}
        <div className={styles.header_detail}>
          <h2>{currentPost?.name}</h2>
          <p>
            {formatDate(
              new Date(currentPost?.createdAt || currentPost?.created_at)
            )}
          </p>
        </div>
      </div>
      <div className={styles.content}>
        <p>
          {currentPost?.content} 
        </p>
        {/* Post banner */}
        {currentPost?.image && (
          <ImageElem
            src={currentPost?.image}
            alt={"Post Pic"}
          />
        )}
      </div>
      <div className={styles.actions}>
        <Like post={currentPost} setPost={setCurrentPost} />
        <Icon
          name="comment"
          onClick={() => setOpenComments((prev) => !prev)}
          size={24}
        />
      </div>
      {openComments && !isGroup && (
        <Comments post={currentPost} isGroup={isGroup} />
      )}
      {openComments && isGroup && <GroupComments post={currentPost} />}
    </div>
  );
}
