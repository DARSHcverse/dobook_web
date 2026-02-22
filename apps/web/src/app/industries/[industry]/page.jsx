import { notFound } from "next/navigation";
import { LandingPage } from "@/App";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

const INDUSTRIES = {
  photobooth: {
    label: "Photo Booth",
    title: "Online Booking System for Photo Booth Businesses | DoBook",
  },
  salon: { label: "Salons", title: "Booking System for Salons | DoBook" },
  doctor: { label: "Doctors", title: "Booking System for Doctors | DoBook" },
  consultant: { label: "Consultants", title: "Booking System for Consultants | DoBook" },
  tutor: { label: "Tutors", title: "Booking System for Tutors | DoBook" },
  fitness: { label: "Fitness Trainers", title: "Booking System for Fitness Trainers | DoBook" },
  tradie: { label: "Tradies", title: "Booking System for Tradies | DoBook" },
};

export async function generateMetadata({ params }) {
  const key = String(params?.industry || "").toLowerCase();
  const cfg = INDUSTRIES[key];
  if (!cfg) return {};

  const description =
    "DoBook is an all-in-one online booking system and appointment scheduling software. A booking system for small business and service business scheduling—manage appointments, clients, invoices, reminders, and payments.";

  const siteUrl = resolveSiteUrl();
  const metadataBase = new URL(siteUrl);

  return {
    metadataBase,
    title: cfg.title,
    description,
    alternates: { canonical: `/industries/${key}` },
    keywords: [
      "online booking system",
      "appointment scheduling software",
      "booking system for small business",
      "service business scheduling",
      `${cfg.label} booking system`,
      "appointment booking",
      "invoice generator",
      "booking reminders",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url: `/industries/${key}`,
      title: cfg.title,
      description,
      siteName: "DoBook",
      images: [{ url: "/brand/dobook-logo.png", alt: "DoBook" }],
    },
    twitter: {
      card: "summary",
      title: cfg.title,
      description,
      images: ["/brand/dobook-logo.png"],
    },
  };
}

export default function IndustryPage({ params }) {
  const key = String(params?.industry || "").toLowerCase();
  const cfg = INDUSTRIES[key];
  if (!cfg) return notFound();

  return (
    <LandingPage
      heroPrefix="Booking system"
      heroAccent={`for ${cfg.label}`}
      startFreeHref={`/auth?plan=free&industry=${encodeURIComponent(key)}`}
      getStartedHref={`/auth?industry=${encodeURIComponent(key)}`}
    />
  );
}
