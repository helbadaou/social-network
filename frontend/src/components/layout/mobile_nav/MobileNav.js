"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/shared/icons/Icon";
import styles from "./mobile_nav.module.css";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: "home", label: "Home" },
    { href: "/profile", icon: "user", label: "Profile" },
    { href: "/followers", icon: "followers", label: "Followers" },
    { href: "/groups", icon: "group", label: "Groups" },
    { href: "/notifications", icon: "notification", label: "Notifications" },
    { href: "/chats", icon: "chat", label: "Chats" },
  ];

  return (
    <nav className={styles.mobile_nav}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.mobile_nav_item} ${
            pathname === item.href ? styles.active : ""
          }`}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
} 