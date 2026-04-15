"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookingShell } from "../_components/BookingShell";

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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px",
                    background: checked ? "#fff5f7" : "#fff",
                    border: `1px solid ${checked ? "#e11d48" : "#e4e4e7"}`,
                    borderRadius: "12px",
                    marginBottom: "10px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `2px solid ${checked ? "#e11d48" : "#d4d4d8"}`,
                      background: checked ? "#e11d48" : "#fff",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
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
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#e11d48",
                      flexShrink: 0,
                    }}
                  >
                    +${Number(addon.price || 0).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#18181b", margin: "0 0 12px" }}>
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
              <span>${packagePrice.toFixed(2)}</span>
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
                <span>${Number(a.price || 0).toFixed(2)}</span>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid #e4e4e7",
                paddingTop: "12px",
                marginTop: "4px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "17px",
                fontWeight: "800",
                color: "#e11d48",
              }}
            >
              <span>Estimated Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleContinue}
            style={{
              background: "#e11d48",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              padding: "14px 28px",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#be123c")}
            onMouseLeave={(e) => (e.target.style.background = "#e11d48")}
          >
            Continue →
          </button>
        </div>
      )}
    </BookingShell>
  );
}
