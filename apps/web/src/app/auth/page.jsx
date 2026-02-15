"use client";

import { Suspense } from "react";
import AuthScreen from "@/components/app/AuthScreen";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthScreen />
    </Suspense>
  );
}
