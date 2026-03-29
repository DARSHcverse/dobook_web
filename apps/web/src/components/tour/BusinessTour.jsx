"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { minimizeBusinessForStorage } from "@/lib/businessStorage";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const API = `${API_BASE}/api`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!Number.isFinite(r.width) || !Number.isFinite(r.height) || r.width <= 0 || r.height <= 0) return null;
  return r;
}

function findFirstVisibleElement(selector) {
  if (!selector) return { el: null, rect: null };
  const nodes = Array.from(document.querySelectorAll(selector));
  for (const node of nodes) {
    const rect = getRect(node);
    if (rect) return { el: node, rect };
  }
  return { el: null, rect: null };
}

function tooltipPositionForRect(rect, width = 360) {
  const margin = 12;
  const viewportW = window.innerWidth || 0;
  const viewportH = window.innerHeight || 0;

  const left = clamp(rect.left + rect.width / 2 - width / 2, margin, Math.max(margin, viewportW - width - margin));

  const preferBelow = rect.bottom + 12 + 160 < viewportH;
  const top = preferBelow ? rect.bottom + 12 : Math.max(margin, rect.top - 12 - 160);
  return { top, left };
}

export default function BusinessTour({ business, open, onOpenChange, onBusinessUpdated }) {
  const steps = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome to DoBook",
        body: "Quick tour: where to manage bookings, invoices, your public profile, and your booking widget. You can restart this tour anytime from Account Settings.",
        target: null,
      },
      {
        id: "bookings",
        title: "Bookings",
        body: "View and manage all customer bookings in one list.",
        target: '[data-tour="nav-bookings"]',
      },
      {
        id: "calendar",
        title: "Calendar view",
        body: "See your schedule by day/week/month and plan at a glance.",
        target: '[data-tour="nav-calendar"]',
      },
      {
        id: "invoices",
        title: "Invoice templates",
        body: "Customize invoice templates and generate invoices for bookings.",
        target: '[data-tour="nav-invoices"]',
      },
      {
        id: "widget",
        title: "Booking widget",
        body: "Copy a booking link or embed the widget on your website so customers can book online.",
        target: '[data-tour="nav-widget"]',
      },
      {
        id: "public",
        title: "Public profile (optional)",
        body: "Enable your public directory listing so customers can find you via “Find services”.",
        target: '[data-tour="nav-public_profile"]',
      },
      {
        id: "settings",
        title: "Account settings",
        body: "Update your business details, logo, payment link, and optional surcharges.",
        target: '[data-tour="nav-settings"]',
      },
    ],
    [],
  );

  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 40, left: 16 });
  const [saving, setSaving] = useState(false);

  const rafRef = useRef(0);

  const current = steps[index] || steps[0];
  const isLast = index >= steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const selector = current?.target;
      const { rect } = selector ? findFirstVisibleElement(selector) : { rect: null };
      setTargetRect(rect);
      if (rect) setTooltipPos(tooltipPositionForRect(rect));
      else setTooltipPos({ top: 40, left: 16 });
    };

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0;
        compute();
      });
    };

    compute();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [current?.target, open]);

  const goNext = () => {
    for (let i = index + 1; i < steps.length; i += 1) {
      const step = steps[i];
      if (!step?.target) {
        setIndex(i);
        return;
      }
      const { rect } = findFirstVisibleElement(step.target);
      if (rect) {
        setIndex(i);
        return;
      }
      // skip missing targets (e.g. mobile vs desktop nav)
    }
    setIndex(steps.length - 1);
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const markCompleted = async () => {
    try {
      const businessId = business?.id ? String(business.id) : "";
      if (businessId) localStorage.setItem(`dobook_tour_seen_${businessId}`, "1");

      setSaving(true);
      const payload = { onboarding_tour_completed_at: new Date().toISOString() };
      const res = await axios.put(`${API}/business/profile`, payload);

      const updated = res?.data || null;
      if (updated) {
        localStorage.setItem("dobook_business", JSON.stringify(minimizeBusinessForStorage(updated)));
        onBusinessUpdated?.(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const rememberSeen = () => {
    const businessId = business?.id ? String(business.id) : "";
    if (businessId) localStorage.setItem(`dobook_tour_seen_${businessId}`, "1");
  };

  const close = () => {
    rememberSeen();
    onOpenChange?.(false);
  };

  const finish = async () => {
    await markCompleted();
    close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/55" onClick={close} aria-hidden="true" />

      {targetRect ? (
        <div
          className="absolute rounded-xl border-2 border-rose-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none"
          style={{
            left: `${Math.max(8, targetRect.left - 6)}px`,
            top: `${Math.max(8, targetRect.top - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      ) : null}

      <div className="absolute" style={{ top: tooltipPos.top, left: tooltipPos.left, width: 360, maxWidth: "calc(100vw - 24px)" }}>
        <Card className="bg-white border border-zinc-200 shadow-lg rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-zinc-500">Tour {index + 1} / {steps.length}</div>
                <div className="text-base font-bold text-zinc-900">{current?.title}</div>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                onClick={close}
              >
                Close
              </button>
            </div>

            <div className="text-sm text-zinc-700 leading-6">{current?.body}</div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-full" onClick={close}>
                Skip
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={goBack} disabled={index === 0}>
                  Back
                </Button>
                {isLast ? (
                  <Button type="button" className="rounded-full bg-rose-600 hover:bg-rose-700" onClick={finish} disabled={saving}>
                    {saving ? "Saving…" : "Finish"}
                  </Button>
                ) : (
                  <Button type="button" className="rounded-full bg-rose-600 hover:bg-rose-700" onClick={goNext}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
