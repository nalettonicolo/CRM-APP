"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user) {
      authApi
        .me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("accessToken");
          router.replace("/login");
        });
    }
  }, [user, setUser, router]);

  if (!isAuthenticated && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
