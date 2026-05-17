"use client";

import { createContext, useContext } from "react";

type ShellContextValue = {
  mobileOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell must be used within AppShell");
  }
  return ctx;
}
