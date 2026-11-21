"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function ClientShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only these routes act on the result. Skipping the check elsewhere saves
    // two DB queries per page view on customer-facing pages (/book, /enquiry).
    const relevant = pathname === "/auth" || pathname?.startsWith("/dashboard");
    if (!relevant) return undefined;
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
