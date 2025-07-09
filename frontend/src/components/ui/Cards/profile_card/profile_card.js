"use client";

import styles from "./profile_card.module.css";
import pfp from "../../../../../public/pfp.png";
import profile_banner from "../../../../../public/profilBG.png";
import Image from "next/image";
import fetchClient from "@/lib/api/client";
import { useState, useEffect, useRef } from "react";
import Icon from "@/components/shared/icons/Icon";
import ImageElem from "@/components/shared/image/Image";
import FollowerCard from "@/components/ui/Cards/follower_card/follower_card";

export default function ProfileCard({
  profile,
  setProfile,
  ownProfile,
  updateError,
}) {
  console.log(profile);
  const [newProfile, setNewProfile] = useState({ ...profile });
  const [followError, setFollowError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile"); // "profile", "followers", "following"
  const fileInputRef = useRef(null);
  const [editMode, setEditMode] = useState({
    nickname: false,
    email: false,
    dob: false,
    bio: false,
  });
  const [editValues, setEditValues] = useState({
    nickname: profile.nickname || "",
    email: profile.email || "",
    dob: profile.date_of_birth || "",
    bio: profile.about || "",
  });

  useEffect(() => {
    setNewProfile({ ...profile });
    setEditValues({
      nickname: profile.nickname || "",
      email: profile.email || "",
      dob: profile.date_of_birth || "",
      bio: profile.about || "",
    });
  }, [profile]);

  const handleFollow = async (e) => {
    e.preventDefault();
    try {
      await fetchClient(`/api/follow/${profile.id}`, {
        method: "POST",
      });
    } catch (e) {
      setFollowError(e.message);
    }
  };

  const isFollowed = () => {
    const allFollows = profile.followings;
    if (!allFollows || allFollows?.length == 0) return false;
    return allFollows?.find((f) => f.following_id === profile.id);
  };

  const handleEdit = (e, targetName) => {
    e.preventDefault();
    setEditMode({ ...editMode, [targetName]: true });
  };

  const handleChange = (e, field) => {
    setEditValues({ ...editValues, [field]: e.target.value });
  };

  const handlePrivacyToggle = (e) => {
    setNewProfile({ ...newProfile, is_public: !e.target.checked });
  };

  const handleAvatarClick = () => {
    if (ownProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real implementation, you'd upload this file to your server
      // For now, we'll just create a temporary URL
      const imageUrl = URL.createObjectURL(file);
      setNewProfile({ ...newProfile, avatarUrl: imageUrl, avatarFile: file });
    }
  };

  const handleSave = async (field) => {
    try {
      const updatedProfile = { ...newProfile };

      if (field === "nickname") updatedProfile.nickname = editValues.nickname;
      if (field === "email") updatedProfile.email = editValues.email;
      if (field === "dob") updatedProfile.date_of_birth = editValues.dob;
      if (field === "bio") updatedProfile.about = editValues.bio;

      setNewProfile(updatedProfile);
      setEditMode({ ...editMode, [field]: false });
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleCancel = (field) => {
    // Reset to original value from newProfile, not profile
    setEditValues({
      ...editValues,
      [field]:
        field === "bio"
          ? newProfile.about || ""
          : field === "dob"
          ? newProfile.date_of_birth || ""
          : newProfile[field] || "",
    });
    setEditMode({ ...editMode, [field]: false });
  };

  const saveChanges = async (e) => {
    e.preventDefault();
    setProfile({ ...newProfile });
  };

  const cancelChanges = (e) => {
    e.preventDefault();
    // Reset newProfile to the original profile
    setNewProfile({ ...profile });
    // Reset all edit values
    setEditValues({
      nickname: profile.nickname || "",
      email: profile.email || "",
      dob: profile.date_of_birth || "",
      bio: profile.about || "",
    });
  };

  const renderEditableField = (field, value, placeholder) => {
    if (editMode[field]) {
      return (
        <div className={styles.edit_container}>
          <input
            type={field === "dob" ? "date" : "text"}
            value={editValues[field]}
            onChange={(e) => handleChange(e, field)}
            placeholder={placeholder}
            className={styles.edit_input}
          />
          <div className={styles.edit_actions}>
            <Icon name="check" size={18} onClick={() => handleSave(field)} />
            <Icon name="close" size={18} onClick={() => handleCancel(field)} />
          </div>
        </div>
      );
    }

    return (
      <div className={styles.value}>
        <p>{value}</p>
        {ownProfile && (
          <Icon
            name="edit_pen"
            size={20}
            onClick={(e) => handleEdit(e, field)}
          />
        )}
      </div>
    );
  };

  const renderContent = () => {
    // Vérifier que newProfile existe
    if (!newProfile) {
      return <div>Loading...</div>;
    }

    switch (activeTab) {
      case "followers":
        return (
          <div className={styles.followers_section}>
            <h3>Followers ({newProfile?.followers?.length || 0})</h3>
            {!newProfile?.followers || newProfile.followers.length === 0 ? (
              <p>No followers yet</p>
            ) : (
              newProfile.followers.map((follower) => {
                // Adapter les données pour FollowerCard
                const followerData = {
                  id: follower.follower_id || follower.id,
                  follower_id: follower.follower_id || follower.id,
                  follower_name: follower.follower_name || `${follower.firstname} ${follower.lastname}`,
                  avatar: follower.avatar,
                  createdAt: follower.created_at || follower.createdAt
                };
                return (
                  <FollowerCard
                    key={follower.id}
                    follower={followerData}
                    type="follower"
                  />
                );
              })
            )}
          </div>
        );
      case "following":
        return (
          <div className={styles.following_section}>
            <h3>Following ({newProfile?.following?.length || 0})</h3>
            {!newProfile?.following || newProfile.following.length === 0 ? (
              <p>Not following anyone yet</p>
            ) : (
              newProfile.following.map((following) => {
                // Adapter les données pour FollowerCard
                const followingData = {
                  id: following.id,
                  firstname: following.firstname,
                  lastname: following.lastname,
                  avatar: following.avatar,
                  createdAt: following.created_at || following.createdAt
                };
                return (
                  <FollowerCard
                    key={following.id}
                    follower={followingData}
                    type="followings"
                  />
                );
              })
            )}
          </div>
        );
      default:
        return (
          <div className={styles.details}>
            {ownProfile && (
              <div className={styles.item}>
                <strong>Private mode</strong>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={!newProfile.is_public}
                    onChange={handlePrivacyToggle}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            )}
            <div className={styles.item}>
              <strong>Email:</strong>
              {renderEditableField("email", newProfile.email, "Enter email")}
            </div>
            <div className={styles.item}>
              <strong>Date of birth:</strong>
              {renderEditableField(
                "dob",
                newProfile.date_of_birth,
                "Enter date of birth"
              )}
            </div>
            <div className={`${styles.item} ${styles.bio}`}>
              <strong>About me: </strong>
              {renderEditableField(
                "bio",
                newProfile.about || "No bio",
                "Tell us about yourself"
              )}
            </div>
            {(!ownProfile || isFollowed()) && (
              <div className={styles.actions}>
                <button onClick={handleFollow}>Follow</button>
                {followError && <p>{followError}</p>}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <figure className={styles.container}>
      {!newProfile ? (
        <div>Loading...</div>
      ) : (
        <>
          <img
            src={profile_banner.src}
            alt="Profile Banner"
            className={styles.banner}
          />
          <figcaption>
            <div className={styles.main}>
              <div className={styles.pfp_container} onClick={handleAvatarClick}>
                {newProfile.avatar ? (
                  <ImageElem
                    src={newProfile.avatar}
                    className={styles.pfp}
                    alt={"pfp"}
                  />
                ) : (
                  <img src={pfp.src} alt="pfp" className={styles.pfp} />
                )}
                {ownProfile && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className={styles.file_input}
                  />
                )}
              </div>
              <div className={styles.name}>
                <h2
                  className={styles.name}
                >{`${newProfile.firstname} ${newProfile.lastname}`}</h2>
                {renderEditableField(
                  "nickname",
                  newProfile?.nickname && `@${newProfile.nickname}`,
                  "Enter nickname"
                )}
              </div>
              <div className={styles.stats}>
                <div 
                  className={`${styles.stat} ${styles.clickable}`}
                  onClick={() => setActiveTab("followers")}
                >
                  <strong>{newProfile?.followers?.length || 0}</strong>
                  <p>Followers</p>
                </div>
                <div 
                  className={`${styles.stat} ${styles.clickable}`}
                  onClick={() => setActiveTab("following")}
                >
                  <strong>{newProfile?.following?.length || 0}</strong>
                  <p>Following</p>
                </div>
              </div>
            </div>
            
            {/* Navigation tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === "profile" ? styles.active : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                Profile
              </button>
              <button
                className={`${styles.tab} ${activeTab === "followers" ? styles.active : ""}`}
                onClick={() => setActiveTab("followers")}
              >
                Followers
              </button>
              <button
                className={`${styles.tab} ${activeTab === "following" ? styles.active : ""}`}
                onClick={() => setActiveTab("following")}
              >
                Following
              </button>
            </div>

            {/* Content based on active tab */}
            {renderContent()}
          </figcaption>
          {ownProfile && activeTab === "profile" && (
            <div className={styles.actions}>
              <button className={styles.save_button} onClick={saveChanges}>
                Save
              </button>
              <button className={styles.cancel_button} onClick={cancelChanges}>
                Cancel
              </button>
            </div>
          )}
          {updateError && <p>{updateError}</p>}
        </>
      )}
    </figure>
  );
}
