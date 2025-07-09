"use client";

import Image from "next/image";
import styles from "./page.module.css";
import pfp from "../../../public/pfp.png";
import Post from "@/components/ui/Post/Post";
import Icon from "@/components/shared/icons/Icon";
import { useAuth } from "@/providers/AuthProvider";
import useGetPost from "@/hooks/useGetPosts";
import { useRef, useState } from "react";
import fetchClient from "@/lib/api/client";
import ImageElem from "@/components/shared/image/Image";
import useGetFollowers from "@/hooks/useGetFollowers";
import useGetFollowing from "@/hooks/useGetFollowing";

function AddUsersModal({ setShow, setNewPost }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(e.target.value);
  }

  async function getUsers(e) {
    e.preventDefault();
    if (loading) return;
    setErr(null);
    setLoading(true);
    if (search.trim() === "") {
      setErr("Please type in to search");
      return;
    }
    try {
      const data = await fetchClient("/api/users", {
        params: { q: search },
      });
      setUsers(data?.data?.users?.filter((u) => u.id !== user.id) || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd(userId) {
    console.log(userId);
    setSelected((prev) => {
      if (!prev.find((v) => v == userId)) {
        prev.push(userId);
      }
      return prev;
    });
  }

  function handleRemove(userId) {
    setSelected((prev) => {
      const i = prev.findIndex(userId);
      if (i > -1) {
        prev.splice(i, 1);
      }
      return prev;
    });
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modal_content}>
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>Choose who to see you profile</h2>
          <button
            className={styles.close_button}
            onClick={() => setShow(false)}
          >
            X
          </button>
        </div>
        <div className={styles.modal_body}>
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search..."
          />
          <button onClick={getUsers}>search</button>
          <div>
            {loading ? (
              <p>loading...</p>
            ) : err ? (
              <p>{err}</p>
            ) : users.length === 0 && search !== "" ? (
              <p>Type in to search for users</p>
            ) : (
              <div>
                <div>
                  {users.map((u) => (
                    <div key={u.id}>
                      <p>{`${u.firstname} ${u.lastname}`}</p>
                      {selected.find((v) => v === u.id) ? (
                        <button onClick={() => handleRemove(u.id)}>
                          remove
                        </button>
                      ) : (
                        <button onClick={() => handleAdd(u.id)}>add</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className={styles.actions}>
                  <button
                    onClick={() => {
                      setSelected([]);
                      setShow(false);
                    }}
                  >
                    cancel
                  </button>
                  <button
                    onClick={() => {
                      setNewPost((prev) => {
                        return { ...prev, users: selected };
                      });
                      setShow(false);
                    }}
                  >
                    save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { posts, setPosts, loading, error, postContainer, isDone } =
    useGetPost();
  const [newPost, setNewPost] = useState({
    content: "",
    image: "",
    privacy: 0,
    users: [],
    error: "",
    loading: false,
  });
  const fileUpload = useRef(null);
  const [show, setShow] = useState(false);
  const { followers } = useGetFollowers(user.id);
  const { following } = useGetFollowing(user.id);

  async function handleCreate() {
    if (newPost.loading) return;
    if (!newPost.content) {
      setNewPost({ ...newPost, error: "Please enter a content" });
    }

    setNewPost((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const form = new FormData();

      form.append("content", newPost.content);
      form.append("privacy", newPost.privacy);
      form.append("users", JSON.stringify(newPost.users));
      console.log(form.get("users"));
      if (newPost.image) form.append("image", newPost.image);

      await fetchClient("/api/post", {
        method: "POST",
        body: form,
      });
      setNewPost(() => ({
        content: "",
        image: "",
        privacy: 0,
        error: "",
        users: [],
        loading: false,
      }));
    } catch (e) {
      setNewPost((prev) => ({
        ...prev,
        error: e.message,
      }));
    } finally {
      setNewPost((prev) => ({ ...prev, loading: false }));
    }
  }

  const handlePostInput = (e) => {
    if (e.target.type === "file") {
      setNewPost((prev) => ({ ...prev, image: e.target.files[0] }));
    } else setNewPost({ ...newPost, [e.target.name]: e.target.value });
  };

  const handlePrivacyChange = (v) => {
    setNewPost((prev) => ({ ...prev, privacy: v }));
    console.log(v);
  };

  function handleUserClick(e) {
    e.preventDefault();
    setShow((prev) => !prev);
  }

  return (
    <div className={styles.width_constraint}>
      <div className={styles.create_post}>
        {user?.avatar ? (
          <ImageElem src={user.avatar} className={styles.pfp} />
        ) : (
          <img src={pfp.src} alt="pfp" className={styles.pfp} />
        )}
        <div className={styles.create_actions}>
          <input
            className={styles.create_input}
            name="content"
            placeholder="What is happening?"
            onChange={handlePostInput}
            value={newPost.content}
          ></input>
          {newPost.error.length !== 0 && <p>{newPost.error}</p>}
          <div className={styles.buttons}>
            <input
              type="file"
              hidden
              onChange={handlePostInput}
              ref={fileUpload}
            />
            <div className={styles.post_options}>
              <select
                className={styles.privacy_select}
                onChange={(e) => handlePrivacyChange(e.target.value)}
                value={newPost.privacy}
              >
                <option value={0}>Public</option>
                <option value={1}>Almost private</option>
                <option value={2}>Private</option>
              </select>
              {newPost.privacy == 2 && (
                <Icon name="user" size={25} onClick={handleUserClick} />
              )}
              <Icon
                name="img_msg"
                onClick={() => fileUpload.current.click()}
                size={25}
              />
            </div>
            <button className={styles.create_btn} onClick={handleCreate}>
              Post
            </button>
          </div>
        </div>
      </div>
      <div className={styles.posts} ref={postContainer}>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div>Something went wrong: {error}</div>
        ) : posts?.length ? (
          posts.map((post) => (
            <Post
              key={post.id}
              post={post}
              posts={posts}
              setPosts={setPosts}
              isGroup={false}
            />
          ))
        ) : (
          <div>No posts yet</div>
        )}
        {isDone && posts.length !== 0 && <p>No more posts</p>}
      </div>
      {show && <AddUsersModal setShow={setShow} setNewPost={setNewPost} />}
    </div>
  );
}
