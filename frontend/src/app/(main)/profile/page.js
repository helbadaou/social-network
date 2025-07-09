"use client";

import ProfileCard from "@/components/ui/Cards/profile_card/profile_card";
import styles from "./profile.module.css";
import Post from "@/components/ui/Post/Post";
import useGetProfile from "@/hooks/useGetProfile";
import { useAuth } from "@/providers/AuthProvider";
import { useParams, useSearchParams } from "next/navigation";

export default function Profile() {
  const { user } = useAuth();
  // get url params
  const params = useSearchParams();
  const userId = params.get("userId");

  const { profile, loading, error, setProfile, updateError } = useGetProfile(
    userId || user.id
  );

  function setPosts(p) {
    setProfile({ ...profile, posts: p });
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {error ? (
        <p>{error}</p>
      ) : (
        <>
          <ProfileCard
            profile={profile}
            setProfile={setProfile}
            ownProfile={userId ? userId === user.id : true}
            updateError={updateError}
          />
          {profile?.posts?.length ? (
            profile.posts
              .sort((a, b) => {
                let aDate = new Date(a.createdAt).getTime();
                let bDate = new Date(b.createdAt).getTime();
                return bDate - aDate;
              })
              .map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  posts={profile.posts}
                  setPosts={setPosts}
                  isGroup={false}
                />
              ))
          ) : (
            <p>Nothing to see here</p>
          )}
        </>
      )}
    </div>
  );
}
