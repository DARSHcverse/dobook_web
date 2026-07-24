"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookingShell } from "../_components/BookingShell";
import { formatMoney } from "@/lib/money";
import { bk } from "../_components/bookingStyles";

export default function AddonsPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const packagePrice = Number(searchParams.get("package_price") || "0");
  const packageId = searchParams.get("package_id") || "";
  const categoryId = searchParams.get("category_id") || "";
  const categoryName = searchParams.get("category_name") || "";
  const packageName = searchParams.get("package_name") || "";

  const [business, setBusiness] = useState(null);
  const [addons, setAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/widget/business/${businessId}/info`);
        if (res.ok) {
          const data = await res.json();
          setBusiness(data);
          const serviceAddons = data?.service_addons || [];
          setAddons(serviceAddons);
          // If no addons, skip straight to review
          if (!serviceAddons.length) {
            skipToReview();
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    if (businessId) load();
  }, [businessId]);

  const skipToReview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("addon_ids", "");
    router.push(`/book/${businessId}/review?${params.toString()}`);
  }, [businessId, router, searchParams]);

  const toggleAddon = (addonId) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedAddonObjects = addons.filter((a) => selectedAddons.includes(a.id));
  const addonsTotal = selectedAddonObjects.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const total = packagePrice + addonsTotal;

  const handleContinue = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("addon_ids", selectedAddons.join(","));
    router.push(`/book/${businessId}/review?${params.toString()}`);
  };

  const handleBack = () => {
    router.push(
      `/book/${businessId}/details?${new URLSearchParams({
        package_id: packageId,
        category_id: categoryId,
        category_name: categoryName,
        package_name: packageName,
        package_price: String(packagePrice),
        first_name: searchParams.get("first_name") || "",
        last_name: searchParams.get("last_name") || "",
        customer_email: searchParams.get("customer_email") || "",
        customer_phone: searchParams.get("customer_phone") || "",
        event_type: searchParams.get("event_type") || "",
        booking_date: searchParams.get("booking_date") || "",
        booking_time: searchParams.get("booking_time") || "",
        event_location: searchParams.get("event_location") || "",
        full_address: searchParams.get("full_address") || "",
        num_guests: searchParams.get("num_guests") || "",
        referral_source: searchParams.get("referral_source") || "",
        notes: searchParams.get("notes") || "",
      }).toString()}`
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          color: "#71717a",
          fontSize: "14px",
        }}
      >
        Loading…
      </div>
    );
  }

  const currency = business?.currency || "aud";

  return (
    <BookingShell business={business} currentStep={4}>
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
          Enhance Your Experience
        </h2>
        <p style={{ fontSize: "15px", color: "#71717a", margin: 0 }}>
          Optional extras to make your event even more memorable
        </p>
      </div>

      {addons.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "#a1a1aa",
            fontSize: "15px",
          }}
        >
          No add-ons available.
        </div>
      ) : (
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          {/* Add-on cards */}
          <div style={{ marginBottom: "24px" }}>
            {addons.map((addon) => {
              const checked = selectedAddons.includes(addon.id);
              return (
                <div
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  style={{ ...bk.option(checked), marginBottom: "10px" }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "7px",
                      border: `2px solid ${checked ? "#e11d48" : "#d4d4d8"}`,
                      background: checked ? "#e11d48" : "#fff",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: "700",
                      transition: "border-color 0.18s ease, background 0.18s ease",
                    }}
                  >
                    {checked ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#18181b" }}>
                      {addon.name}
                    </div>
                    {addon.description && (
                      <div style={{ fontSize: "13px", color: "#71717a", marginTop: "2px" }}>
                        {addon.description}
                      </div>
                    )}
                  </div>
                  <div style={{ ...bk.price, fontSize: "15px", flexShrink: 0 }}>
                    +{formatMoney(addon.price, currency)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div style={{ ...bk.card, marginBottom: "20px" }}>
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
            {selectedAddonObjects.map((a) => (
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

          <button
            onClick={handleContinue}
            style={{ ...bk.primaryBtn, width: "100%" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#be123c"; e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(190,18,60,0.55)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#e11d48"; e.currentTarget.style.boxShadow = "0 6px 16px -6px rgba(225,29,72,0.5)"; }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Continue →
          </button>
        </div>
      )}
    </BookingShell>
  );
}
