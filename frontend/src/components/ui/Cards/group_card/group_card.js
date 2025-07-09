import ImageElem from "@/components/shared/image/Image";
import styles from "./group_card.module.css";
import { useState } from "react";
import fetchClient from "@/lib/api/client";
import { useRouter } from "next/navigation";

export default function GroupCard({ group }) {
  const [err, setErr] = useState(null);
  const router = useRouter();
  if (!group) return null;

  const handleJoin = async () => {
    if (group.isInvited || group.isRequested) {
      setErr("You are already invited or requested to join this group.");
    }
    setErr(null);
    try {
      await fetchClient(`/api/group/${group.id}/request`);
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleOpen = () => {
    router.push(`/groups/${group.id}`);
  };

  return (
    <div className={styles.card}>
      <div className={styles.card_header}>
        <div className={styles.card_cover}>
          <ImageElem
            src={group.image}
            width={100}
            height={100}
            alt={"Group image"}
          />
        </div>
        <h3 className={styles.card_title}>{group.title}</h3>
      </div>
      <div className={styles.card_content}>
        <p className={styles.card_description}>{group.description}</p>
      </div>
      <div className={styles.card_footer}>
        <div
          className={styles.join_button}
          onClick={group.isMember ? handleOpen : handleJoin}
        >
          {group.isMember
            ? "Open Group"
            : group.isInvited || group.isRequested
            ? "Pending"
            : "Join Group"}
        </div>
        {err && <p>{err}</p>}
      </div>
    </div>
  );
}
