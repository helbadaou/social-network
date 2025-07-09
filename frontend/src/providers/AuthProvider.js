"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import fetchClient from "@/lib/api/client";

// Create context
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const fetchUser = async () => {
        try {
          const response = await fetchClient("/api/auth/me");
          setUser(response.data);
          setLoading(false);
        } catch (error) {
          console.error(error);
          setLoading(false);
        }
      };
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = async () => {
    try {
      // Clear token from localStorage first
      
      // Clear cookie
      const deleteCookie = (name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      };
      
      // Clear user state
      deleteCookie("token");
      setUser(null);

      // Call logout API
      await fetchClient("/api/logout", {
        method: "POST",
      });
      localStorage.removeItem("token");

      // Redirect to login page
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, ensure user is logged out locally
      localStorage.removeItem("token");
      setUser(null);
      router.push("/login");
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
