"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookingShell } from "../_components/BookingShell";
import { formatMoney } from "@/lib/money";
import { bk } from "../_components/bookingStyles";

function SummaryCard({ title, rows }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "16px",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#18181b", margin: "0 0 12px" }}>
        {title}
      </h3>
      <div>
        {rows.filter(([, v]) => v).map(([label, value], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderTop: i > 0 ? "1px solid #f4f4f5" : "none",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "13px", color: "#71717a", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: "13px", color: "#18181b", fontWeight: "600", textAlign: "right" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const packageId = searchParams.get("package_id") || "";
  const categoryId = searchParams.get("category_id") || "";
  const categoryName = searchParams.get("category_name") || "";
  const packageName = searchParams.get("package_name") || "";
  const packagePrice = Number(searchParams.get("package_price") || "0");
  const firstName = searchParams.get("first_name") || "";
  const lastName = searchParams.get("last_name") || "";
  const customerEmail = searchParams.get("customer_email") || "";
  const customerPhone = searchParams.get("customer_phone") || "";
  const eventType = searchParams.get("event_type") || "";
  const bookingDate = searchParams.get("booking_date") || "";
  const bookingTime = searchParams.get("booking_time") || "";
  const eventLocation = searchParams.get("event_location") || "";
  const fullAddress = searchParams.get("full_address") || "";
  const numGuests = searchParams.get("num_guests") || "";
  const referralSource = searchParams.get("referral_source") || "";
  const notes = searchParams.get("notes") || "";
  const addonIdsStr = searchParams.get("addon_ids") || "";
  const addonIds = addonIdsStr ? addonIdsStr.split(",").filter(Boolean) : [];

  const [business, setBusiness] = useState(null);
  const [addons, setAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/widget/business/${businessId}/info`);
        if (res.ok) {
          const data = await res.json();
          setBusiness(data);
          const all = data?.service_addons || [];
          setAddons(all);
          setSelectedAddons(all.filter((a) => addonIds.includes(a.id)));
        }
      } catch {
        // ignore
      }
    }
    if (businessId) load();
  }, [businessId]);

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const total = packagePrice + addonsTotal;

  const handleSubmit = async () => {
    if (!agreed) {
      setError("Please agree to the terms before confirming.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const body = {
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        event_type: eventType,
        booking_date: bookingDate,
        booking_time: bookingTime || "08:00",
        event_location: eventLocation || fullAddress,
        full_address: fullAddress,
        num_guests: numGuests ? Number(numGuests) : undefined,
        referral_source: referralSource,
        notes,
        package_id: packageId || undefined,
        category_id: categoryId || undefined,
        category_name: categoryName,
        addon_ids: addonIds.filter(Boolean),
        company_website: "", // honeypot — must be empty
      };

      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.detail || "Failed to create booking. Please try again.");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      const bookingId = data?.id || "";
      const invoiceId = data?.invoice_id || "";

      router.push(
        `/book/${businessId}/thank-you?booking_id=${bookingId}&invoice_id=${invoiceId}&first_name=${encodeURIComponent(firstName)}`
      );
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(
      `/book/${businessId}/addons?${new URLSearchParams({
        package_id: packageId,
        category_id: categoryId,
        category_name: categoryName,
        package_name: packageName,
        package_price: String(packagePrice),
        first_name: firstName,
        last_name: lastName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        event_type: eventType,
        booking_date: bookingDate,
        booking_time: bookingTime,
        event_location: eventLocation,
        full_address: fullAddress,
        num_guests: numGuests,
        referral_source: referralSource,
        notes,
      }).toString()}`
    );
  };

  const currency = business?.currency || "aud";

  return (
    <BookingShell business={business} currentStep={5}>
      <button
        onClick={handleBack}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
          color: "#71717a",
          fontWeight: "600",
          padding: "0 0 20px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        ← Back
      </button>

      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#18181b", margin: "0 0 8px" }}>
          Review Your Booking
        </h2>
        <p style={{ fontSize: "15px", color: "#71717a", margin: 0 }}>
          Please check everything looks correct before confirming
        </p>
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <SummaryCard
          title="Your Package"
          rows={[
            ["Booth Type", categoryName],
            ["Package", packageName],
            ["Package Price", formatMoney(packagePrice, currency)],
          ]}
        />

        <SummaryCard
          title="Event Details"
          rows={[
            ["Event Type", eventType],
            ["Date", bookingDate],
            ["Start Time", bookingTime],
            ["Venue", eventLocation],
            ["Full Address", fullAddress],
            ["Guests", numGuests],
          ]}
        />

        <SummaryCard
          title="Your Details"
          rows={[
            ["Name", `${firstName} ${lastName}`.trim()],
            ["Email", customerEmail],
            ["Phone", customerPhone],
          ]}
        />

        {selectedAddons.length > 0 && (
          <SummaryCard
            title="Add-Ons"
            rows={selectedAddons.map((a) => [a.name, formatMoney(a.price, currency)])}
          />
        )}

        {/* Order Summary */}
        <div style={{ ...bk.card, marginBottom: "16px" }}>
          <h3 style={{ ...bk.h2, fontSize: "15px", margin: "0 0 14px" }}>
            Order Summary
          </h3>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              color: "#52525b",
              marginBottom: "8px",
            }}
          >
            <span>{packageName}</span>
            <span>{formatMoney(packagePrice, currency)}</span>
          </div>
          {selectedAddons.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "14px",
                color: "#52525b",
                marginBottom: "8px",
              }}
            >
              <span>+ {a.name}</span>
              <span>{formatMoney(a.price, currency)}</span>
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid #f0f0f2",
              paddingTop: "14px",
              marginTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#3f3f46" }}>Estimated Total</span>
            <span style={{ ...bk.price, fontSize: "20px" }}>{formatMoney(total, currency)}</span>
          </div>
        </div>

        {/* Important note */}
        <div
          style={{
            background: "#fef9ec",
            border: "1px solid #fde68a",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#92400e",
            lineHeight: "1.5",
          }}
        >
          <strong>This will confirm your booking instantly.</strong> You&apos;ll receive your booking details right after submission, and the business can follow up if anything else is needed.
        </div>

        {/* Terms checkbox */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            marginBottom: "20px",
            cursor: "pointer",
          }}
          onClick={() => setAgreed((v) => !v)}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "4px",
              border: `2px solid ${agreed ? "#e11d48" : "#d4d4d8"}`,
              background: agreed ? "#e11d48" : "#fff",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "700",
              marginTop: "1px",
            }}
          >
            {agreed ? "✓" : ""}
          </div>
          <span style={{ fontSize: "13px", color: "#3f3f46", lineHeight: "1.5" }}>
            I agree to the cancellation policy and terms
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "#fff5f7",
              border: "1px solid #fecdd3",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#e11d48",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            ...bk.primaryBtn,
            width: "100%",
            padding: "16px 28px",
            fontSize: "16px",
            background: submitting ? "#a1a1aa" : "#e11d48",
            boxShadow: submitting ? "none" : bk.primaryBtn.boxShadow,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.background = "#be123c"; e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(190,18,60,0.55)"; } }}
          onMouseLeave={(e) => { if (!submitting) { e.currentTarget.style.background = "#e11d48"; e.currentTarget.style.boxShadow = "0 6px 16px -6px rgba(225,29,72,0.5)"; } }}
        >
          {submitting ? "Submitting…" : "Confirm Booking"}
        </button>
      </div>
    </BookingShell>
  );
}
