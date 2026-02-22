"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SplashScreen from "@/components/app/SplashScreen";

const SPLASH_DURATION_MS = 1100;
const SPLASH_SEEN_KEY = "dobook_splash_seen";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
}

export default function ClientShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileViewport());
    const onResize = () => setMobile(isMobileViewport());
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SPLASH_SEEN_KEY);
      if (seen) {
        setShowSplash(false);
        return;
      }
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => {
      setShowSplash(false);
      try {
        sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
      } catch {
        // ignore
      }
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showSplash) return;

    const token = localStorage.getItem("dobook_token");
    if (token) {
      if (pathname === "/" || pathname === "/auth") router.replace("/dashboard");
      return;
    }

    if (pathname?.startsWith("/dashboard")) {
      router.replace("/auth");
      return;
    }
  }, [mobile, pathname, router, showSplash]);

  return (
    <>
      <SplashScreen open={showSplash} />
      {children}
    </>
  );
}
