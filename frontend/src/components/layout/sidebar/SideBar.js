"use client";

import styles from "./sidebar.module.css";
import pfp from "../../../../public/pfp.png";
import Image from "next/image";
import Icon from "@/components/shared/icons/Icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import ImageElem from "@/components/shared/image/Image";
import { useState } from "react";

export default function SideBar() {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.sidebar} sidebar ${collapsed ? styles.collapsed : ""}`}>
      <button className={styles.collapseBtn} onClick={() => setCollapsed((c) => !c)}>
        <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={20} />
      </button>
      <h2 className={styles.logo} style={{display: collapsed ? 'none' : undefined}}>Social</h2>
      <div className={styles.sidebar_body}>
        <div className={styles.item_list}>
          <Link
            href="/"
            className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}
          >
            <Icon name="home" size={20} />
            {!collapsed && <span>Home</span>}
          </Link>
          <Link
            className={`${styles.item} ${pathname === "/profile" ? styles.active : ""}`}
            href="/profile"
          >
            <Icon name="user" size={20} />
            {!collapsed && <span>Profile</span>}
          </Link>
          <Link
            className={`${styles.item} ${pathname === "/followers" ? styles.active : ""}`}
            href="/followers"
          >
            <Icon name="followers" size={20} />
            {!collapsed && <span>Followers</span>}
          </Link>
          <Link
            className={`${styles.item} ${pathname === "/groups" ? styles.active : ""}`}
            href="/groups"
          >
            <Icon name="group" size={20} />
            {!collapsed && <span>Groups</span>}
          </Link>
          <Link
            className={`${styles.item} ${pathname === "/notifications" ? styles.active : ""}`}
            href="/notifications"
          >
            <Icon name="notification" size={20} />
            {!collapsed && <span>Notifications</span>}
          </Link>
          <Link
            className={`${styles.item} ${pathname === "/chats" ? styles.active : ""}`}
            href="/chats"
          >
            <Icon name="chat" size={20} />
            {!collapsed && <span>Chats</span>}
          </Link>
        </div>
        <div className={styles.sidebar_fouter}>
          <div className={styles.profile}>
            {user?.avatar ? (
              <ImageElem src={user.avatar} width={40} height={40} />
            ) : (
              <img src={pfp.src} alt="pfp" />
            )}
            {!collapsed && (
              <div className={styles.profile_details}>
                <h5>{`${user?.lastname} ${user?.firstname}`}</h5>
                {user?.nickname && <p>@{user.nickname}</p>}
              </div>
            )}
          </div>
          <button className={styles.logout} onClick={logout}>
            <Icon name="logout" size={20} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
