import fetchClient from "@/lib/api/client";
import { useEffect, useState, useRef } from "react";

export default function useGetProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoadComplete = useRef(false);

  function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return null;
    }

    const year = date.getFullYear();
    // Month is 0-indexed, so we add 1 and pad with leading zero if needed
    const month = String(date.getMonth() + 1).padStart(2, "0");
    // Day of month needs padding with leading zero if needed
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const getProfile = async () => {
    setLoading(true);
    setError(null);
    if (!userId) {
      setError("Invalid user ID");
      setLoading(false);
      return;
    }
    try {
      const data = await fetchClient(`/api/profile/${userId}`);
      setProfile({
        ...data.data,
        date_of_birth: formatDate(new Date(data.data.date_of_birth)),
      });
      // Mark initial load as complete after first successful fetch
      initialLoadComplete.current = true;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setError(false);
    }
  };

  const updateProfile = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("email", profile.email);
      form.set("firstname", profile.firstname);
      form.set("lastname", profile.lastname);
      form.set("date_of_birth", formatDate(new Date(profile.date_of_birth)));
      form.set("nickname", profile.nickname);
      form.set("about", profile.about);
      form.set("avatar", profile.avatarFile || profile.avatar);
      form.set("is_public", profile.is_public);

      await fetchClient("/api/profile/update", {
        method: "POST",
        body: form,
      });
    } catch (e) {
      setUpdateError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || !initialLoadComplete.current) return;

    if (initialLoadComplete.current && !profile.userModified) return;

    updateProfile();
  }, [profile]);

  useEffect(() => {
    initialLoadComplete.current = false;
    getProfile();
  }, [userId]);

  const setUserModifiedProfile = (newProfileData) => {
    setProfile({
      ...newProfileData,
      userModified: true,
    });
  };

  return {
    profile,
    error,
    loading,
    setProfile: setUserModifiedProfile,
    updateError,
  };
}
