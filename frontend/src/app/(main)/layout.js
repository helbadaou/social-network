"use client";

import SideBar from "@/components/layout/sidebar/SideBar";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { WsProvider } from "@/providers/WsProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { redirect, RedirectType } from "next/navigation";
import RightSideBar from "@/components/layout/right_sidebar/right_sidebar";
import MobileNav from "@/components/layout/mobile_nav/MobileNav";
import MobileMenu from "@/components/layout/mobile_menu/MobileMenu";

function LayoutContent({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    redirect("/login", RedirectType.push);
  }

  return (
    <div className="app_container">
      <MobileMenu />
      <SideBar />
      <div className="main_wrapper">{children}</div>
      <RightSideBar />
      <MobileNav />
    </div>
  );
}

export default function MainLayout({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <WsProvider>
          <LayoutContent>{children}</LayoutContent>
        </WsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
