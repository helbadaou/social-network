import { useAuth } from "@/providers/AuthProvider";
import styles from "./group_invite_card.module.css";
import fetchClient from "@/lib/api/client";
import { useRouter } from "next/navigation";
import ImageElem from "@/components/shared/image/Image";

export default function GroupInviteCard({ group }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleAccept = async () => {
    try {
      await fetchClient(`/api/group/${group.id}/invitations/${user.id}/accept`);
      router.push(`/groups/${group.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    try {
      await fetchClient(`/api/group/${group.id}/invitations/${user.id}/reject`);
      // Refresh the page to update the invites list
      router.refresh();
    } catch (e) {
      console.error(e);
    }
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
        <div className={styles.invite_actions}>
          <button className={styles.accept_btn} onClick={handleAccept}>
            Accept
          </button>
          <button className={styles.reject_btn} onClick={handleReject}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
} 