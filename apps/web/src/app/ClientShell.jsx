"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function ClientShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          if (pathname === "/auth") router.replace("/dashboard");
          return;
        }
        if (pathname?.startsWith("/dashboard")) router.replace("/auth");
      } catch {
        if (!cancelled && pathname?.startsWith("/dashboard")) router.replace("/auth");
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return children;
}
