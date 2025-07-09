"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./groups.module.css";
import GroupCard from "@/components/ui/Cards/group_card/group_card";
import GroupInviteCard from "@/components/ui/Cards/group_invite_card/group_invite_card";
import CreateGroupModal from "@/components/ui/Modals/create_group/create_group";
import useGetGroups from "@/hooks/useGetGroups";

import fetchClient from "@/lib/api/client";
import { useSearchParams } from "next/navigation";

export default function Groups() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "browse_group"
  );
  const { groups, invites, loading, error } = useGetGroups(activeTab);
  const [showModal, setShowModal] = useState(false);
  const [createLaoding, setCreateLoading] = useState(false);
  const [err, setErr] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (createLaoding) return;
    setCreateLoading(true);
    try {
      setErr(null);
      const formData = new FormData(formRef.current);
      const data = await fetchClient("/api/group/create", {
        method: "POST",
        body: formData,
      });
      setShowModal(false);
      router.push(`/groups/${data.data.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreateLoading(false);
    }
  }

  function handleActiveTab(e) {
    e.preventDefault();
    if (e?.target?.id) setActiveTab(e.target.id);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.header_title}>Groups</h1>
        <div
          className={styles.create_button}
          onClick={() => {
            setShowModal((prev) => !prev);
          }}
        >
          Create Group
        </div>
      </div>

      <div className={styles.groups_tabs}>
        <div className={styles.tabs_list}>
          <div
            className={`${styles.tab} ${
              activeTab === "browse_group" ? styles.active : ""
            }`}
            id="browse_group"
            onClick={handleActiveTab}
          >
            Browse Groups
          </div>

          <div
            className={`${styles.tab} ${
              activeTab === "my_groups" ? styles.active : ""
            }`}
            id="my_groups"
            onClick={handleActiveTab}
          >
            My Groups
          </div>
          <div
            className={`${styles.tab} ${
              activeTab === "invites" ? styles.active : ""
            }`}
            id="invites"
            onClick={handleActiveTab}
          >
            Invites
          </div>
        </div>

        <div className={styles.groups_grid}>
          {error?.length ? (
            "Error loading the groups: " + error
          ) : loading ? (
            <div>Loading...</div>
          ) : activeTab === "invites" ? (
            invites.length === 0 ? (
              <div className={styles.empty_state}>No invites found.</div>
            ) : (
              invites.map((invite) => (
                <GroupInviteCard key={invite.id} group={invite} />
              ))
            )
          ) : groups.length === 0 ? (
            <div className={styles.empty_state}>No groups found.</div>
          ) : (
            groups.map((group) => <GroupCard key={group.id} group={group} />)
          )}
        </div>
      </div>
      {showModal && (
        <CreateGroupModal
          show={showModal}
          setShow={setShowModal}
          handleSubmit={handleSubmit}
          formRef={formRef}
          loading={createLaoding}
          err={err}
        />
      )}
    </div>
  );
}
