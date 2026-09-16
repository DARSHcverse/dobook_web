"use client";

import { Suspense } from "react";
import { Dashboard } from "@/App";

// No auth gate here on purpose. This page previously awaited /api/auth/me and
// rendered null until it resolved, which put an extra serial round trip in front
// of every dashboard load before any data fetching could even start. The
// Dashboard's own requests carry the session cookie, and a 401 from any of them
// redirects to /auth via the shared axios interceptor in @/App.
//
// Dashboard reads useSearchParams(), so it needs a Suspense boundary to prerender.
// The old `if (!ready) return null` gate was masking that requirement.
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
