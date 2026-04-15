"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BookingWidget } from "@/App";

export default function BookingWidgetPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    async function detectFlow() {
      try {
        const res = await fetch(`/api/widget/business/${businessId}/info`);
        if (!res.ok) {
          setChecked(true);
          return;
        }
        const data = await res.json();
        if (data?.has_package_flow) {
          // Redirect to the multi-step flow (categories step)
          router.replace(`/book/${businessId}/packages?step=1`);
          return;
        }
      } catch {
        // fall through to existing widget
      }
      setChecked(true);
    }

    detectFlow();
  }, [businessId, router]);

  if (!checked) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          color: "#71717a",
          fontSize: "14px",
        }}
      >
        Loading…
      </div>
    );
  }

  return <BookingWidget />;
}
