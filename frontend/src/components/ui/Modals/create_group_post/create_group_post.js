"use client";

import styles from "./create_group_post.module.css";
import { useRef, useState } from "react";
import fetchClient from "@/lib/api/client";

export default function CreateGroupPost({ show, setShow, groupId }) {
  const [newPost, setNewPost] = useState({
    content: "",
    image: "",
    error: "",
    loading: false,
  });
  const fileUpload = useRef(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (newPost.loading) return;
    
    if (!newPost.content.trim()) {
      setNewPost(prev => ({ ...prev, error: "Please enter some content" }));
      return;
    }

    setNewPost(prev => ({ ...prev, loading: true, error: "" }));
    
    try {
      const form = new FormData();
      form.append("content", newPost.content);
      if (newPost.image) {
        form.append("image", newPost.image);
      }

      await fetchClient(`/api/group-posts/create/${groupId}`, {
        method: "POST",
        body: form,
      });
      
      setNewPost({
        content: "",
        image: "",
        error: "",
        loading: false,
      });
      setShow(false);
    } catch (err) {
      setNewPost(prev => ({
        ...prev,
        error: err.message || "Failed to create post",
        loading: false,
      }));
    }
  };

  const handlePostInput = (e) => {
    const { type, name, value, files } = e.target;
    if (type === "file") {
      setNewPost(prev => ({ ...prev, image: files[0] }));
    } else {
      setNewPost(prev => ({ ...prev, [name]: value, error: "" }));
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modal} onClick={() => setShow(false)}>
      <div className={styles.modal_content} onClick={e => e.stopPropagation()}>
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>Create Post</h2>
          <button
            className={styles.close_button}
            onClick={() => setShow(false)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className={styles.modal_body}>
          <textarea
            className={styles.create_input}
            name="content"
            placeholder="What's on your mind?"
            onChange={handlePostInput}
            value={newPost.content}
            disabled={newPost.loading}
          />
          
          {newPost.error && (
            <p className={styles.error_message}>{newPost.error}</p>
          )}

          {newPost.image && (
            <div className={styles.selected_image}>
              <span>Selected image: {newPost.image.name}</span>
              <button
                onClick={() => setNewPost(prev => ({ ...prev, image: "" }))}
                className={styles.close_button}
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          )}

          <div className={styles.buttons}>
            <div className={styles.post_options}>
              <input
                type="file"
                hidden
                onChange={handlePostInput}
                ref={fileUpload}
                accept="image/*"
              />
              <button
                className={styles.image_button}
                onClick={() => fileUpload.current.click()}
                disabled={newPost.loading}
                aria-label="Add image"
              >
                📷
              </button>
            </div>
            <div className={styles.action_buttons}>
              <button
                className={styles.cancel_button}
                onClick={() => setShow(false)}
                disabled={newPost.loading}
              >
                Cancel
              </button>
              <button
                className={styles.post_button}
                onClick={handleCreate}
                disabled={newPost.loading}
              >
                {newPost.loading ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
