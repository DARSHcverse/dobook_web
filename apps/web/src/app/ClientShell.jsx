"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function ClientShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("dobook_token");
    if (token) {
      if (pathname === "/auth") router.replace("/dashboard");
      return;
    }

    if (pathname?.startsWith("/dashboard")) {
      router.replace("/auth");
      return;
    }
  }, [pathname, router]);

  return children;
}
