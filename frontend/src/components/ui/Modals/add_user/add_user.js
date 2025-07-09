"use client";
import { useState } from "react";
import styles from "./add_user.module.css";
import fetchClient from "@/lib/api/client";
import InviteCard from "../../Cards/invite_card/invite_card";

export default function AddUserModal({ show, setShow, groupId }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (search.trim() === "") {
      setError("Please enter a search term");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await fetchClient("/api/users", {
        params: { q: search, groupId },
      });
      setUsers(data.data.users || []);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modal} onClick={() => setShow(false)}>
      <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>Add User to Group</h2>
          <button
            className={styles.close_button}
            onClick={() => setShow(false)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className={styles.modal_body}>
          <form onSubmit={handleSubmit} className={styles.search_container}>
            <input
              type="search"
              className={styles.search_input}
              value={search}
              onChange={handleSearch}
              placeholder="Search users..."
              aria-label="Search users"
            />
            <button type="submit" className={styles.search_button}>
              Search
            </button>
          </form>

          {error && <p className={styles.error_message}>{error}</p>}

          <div className={styles.users_list}>
            {loading ? (
              <p className={styles.loading_message}>Searching for users...</p>
            ) : users.length === 0 ? (
              <p className={styles.empty_message}>
                {search === "" 
                  ? "Type a name to search for users" 
                  : "No users found"}
              </p>
            ) : (
              users.map((user) => (
                <InviteCard 
                  key={user.id} 
                  user={user} 
                  groupId={groupId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
