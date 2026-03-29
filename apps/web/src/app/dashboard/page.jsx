"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/App";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
        if (cancelled) return;
        if (!res.ok) {
          router.replace("/auth");
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) router.replace("/auth");
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) return null;
  return <Dashboard />;
}
