"use client";

import { useState } from "react";
import styles from "./mobile_menu.module.css";
import Icon from "@/components/shared/icons/Icon";
import SideBar from "../sidebar/SideBar";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger button */}
      <button className={styles.hamburger} onClick={toggleMenu}>
        <Icon name={isOpen ? "close" : "menu"} size={24} />
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={closeMenu}>
          <div className={styles.menu_content} onClick={(e) => e.stopPropagation()}>
            <SideBar />
          </div>
        </div>
      )}
    </>
  );
} 