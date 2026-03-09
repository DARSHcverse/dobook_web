"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LandingCtaClient({
  getStartedHref = "/auth",
  startFreeHref = "/auth?mode=signup&plan=free",
  customerHref = "/discover",
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem("dobook_token");
      setHasSession(Boolean(token));
    } finally {
      setReady(true);
    }
  }, []);

  const primaryHref = useMemo(() => (hasSession ? "/dashboard" : getStartedHref), [getStartedHref, hasSession]);
  const primaryLabel = useMemo(() => (hasSession ? "Go to dashboard" : "Get started"), [hasSession]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      <button
        type="button"
        onClick={() => router.push(primaryHref)}
        className={cn(
          "h-12 px-6 rounded-full font-semibold",
          "bg-rose-600 text-white hover:bg-rose-700",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
          "transition-colors",
        )}
      >
        {ready ? primaryLabel : "Get started"}
      </button>

      {!hasSession ? (
        <button
          type="button"
          onClick={() => router.push(startFreeHref)}
          className={cn(
            "h-12 px-6 rounded-full font-semibold",
            "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
            "transition-colors",
          )}
        >
          Start free
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => router.push(customerHref)}
        className={cn(
          "h-12 px-6 rounded-full font-semibold",
          "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
          "transition-colors",
        )}
      >
        Find services
      </button>
    </div>
  );
}
