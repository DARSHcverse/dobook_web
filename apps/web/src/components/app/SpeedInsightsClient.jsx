"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

export default function SpeedInsightsClient() {
  if (process.env.NODE_ENV !== "production") return null;
  if (process.env.VERCEL !== "1") return null;
  return <SpeedInsights />;
}
