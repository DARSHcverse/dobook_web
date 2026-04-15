"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookingShell } from "../_components/BookingShell";

const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "School Formal",
  "Engagement",
  "Christmas Party",
  "Other",
];

const REFERRAL_SOURCES = [
  "Google",
  "Instagram",
  "Facebook",
  "Word of Mouth",
  "Other",
];

function Input({ label, required, type = "text", value, onChange, placeholder, children }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: "600",
          color: "#3f3f46",
          marginBottom: "6px",
        }}
      >
        {label}
        {required && <span style={{ color: "#e11d48", marginLeft: "2px" }}>*</span>}
      </label>
      {children || (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #d4d4d8",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "14px",
            color: "#18181b",
            outline: "none",
            background: "#fff",
          }}
        />
      )}
    </div>
  );
}

function Select({ label, required, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: "600",
          color: "#3f3f46",
          marginBottom: "6px",
        }}
      >
        {label}
        {required && <span style={{ color: "#e11d48", marginLeft: "2px" }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #d4d4d8",
          borderRadius: "10px",
          padding: "10px 12px",
          fontSize: "14px",
          color: value ? "#18181b" : "#a1a1aa",
          outline: "none",
          background: "#fff",
          appearance: "none",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PackageSummary({ packageName, packagePrice, categoryName, onChangePackage, businessId, searchParams }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: "16px",
        padding: "20px",
        position: "sticky",
        top: "16px",
      }}
    >
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#18181b", margin: "0 0 12px" }}>
        Your Package
      </h3>
      {categoryName && (
        <div style={{ fontSize: "12px", color: "#71717a", marginBottom: "4px" }}>
          {categoryName}
        </div>
      )}
      <div style={{ fontSize: "17px", fontWeight: "800", color: "#18181b", marginBottom: "4px" }}>
        {packageName}
      </div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: "#e11d48", marginBottom: "16px" }}>
        ${Number(packagePrice || 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
      <button
        onClick={onChangePackage}
        style={{
          background: "none",
          border: "none",
          color: "#e11d48",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        Change package
      </button>
    </div>
  );
}

export default function DetailsPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const packageId = searchParams.get("package_id") || "";
  const categoryId = searchParams.get("category_id") || "";
  const categoryName = searchParams.get("category_name") || "";
  const packageName = searchParams.get("package_name") || "";
  const packagePrice = searchParams.get("package_price") || "0";

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    customer_email: "",
    customer_phone: "",
    event_type: "",
    booking_date: "",
    booking_time: "",
    event_location: "",
    full_address: "",
    num_guests: "",
    referral_source: "",
    notes: "",
  });

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/widget/business/${businessId}/info`);
        if (res.ok) {
          const data = await res.json();
          setBusiness(data);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    if (businessId) load();
  }, [businessId]);

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim()) e.last_name = "Required";
    if (!form.customer_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
      e.customer_email = "Valid email required";
    if (!form.customer_phone.trim()) e.customer_phone = "Required";
    if (!form.event_type) e.event_type = "Required";
    if (!form.booking_date) e.booking_date = "Required";
    if (!form.booking_time) e.booking_time = "Required";
    if (!form.event_location.trim()) e.event_location = "Required";
    return e;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const params = new URLSearchParams({
      package_id: packageId,
      category_id: categoryId,
      category_name: categoryName,
      package_name: packageName,
      package_price: packagePrice,
      first_name: form.first_name,
      last_name: form.last_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      event_type: form.event_type,
      booking_date: form.booking_date,
      booking_time: form.booking_time,
      event_location: form.event_location,
      full_address: form.full_address,
      num_guests: form.num_guests,
      referral_source: form.referral_source,
      notes: form.notes,
    });

    router.push(`/book/${businessId}/addons?${params.toString()}`);
  };

  const handleChangePackage = () => {
    router.push(
      `/book/${businessId}/packages?step=2&category_id=${categoryId}&category_name=${encodeURIComponent(categoryName)}`
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

  const errorStyle = { fontSize: "12px", color: "#e11d48", marginTop: "4px" };

  return (
    <BookingShell business={business} currentStep={3}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 280px",
            gap: "24px",
            alignItems: "start",
          }}
          className="details-grid"
        >
          {/* LEFT — Form */}
          <div>
            {/* Back button */}
            <button
              onClick={() =>
                router.push(
                  `/book/${businessId}/packages?step=2&category_id=${categoryId}&category_name=${encodeURIComponent(categoryName)}`
                )
              }
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

            {/* Contact section */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#18181b",
                  margin: "0 0 16px",
                }}
              >
                How Can We Reach You?
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div>
                  <Input label="First Name" required value={form.first_name} onChange={set("first_name")}>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => set("first_name")(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: `1px solid ${errors.first_name ? "#e11d48" : "#d4d4d8"}`,
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "#18181b",
                        outline: "none",
                      }}
                    />
                  </Input>
                  {errors.first_name && <div style={errorStyle}>{errors.first_name}</div>}
                </div>
                <div>
                  <Input label="Last Name" required value={form.last_name} onChange={set("last_name")}>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => set("last_name")(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: `1px solid ${errors.last_name ? "#e11d48" : "#d4d4d8"}`,
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "#18181b",
                        outline: "none",
                      }}
                    />
                  </Input>
                  {errors.last_name && <div style={errorStyle}>{errors.last_name}</div>}
                </div>
              </div>

              <div>
                <Input label="Email" required value={form.customer_email} onChange={set("customer_email")} type="email">
                  <input
                    type="email"
                    value={form.customer_email}
                    onChange={(e) => set("customer_email")(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: `1px solid ${errors.customer_email ? "#e11d48" : "#d4d4d8"}`,
                      borderRadius: "10px",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#18181b",
                      outline: "none",
                    }}
                  />
                </Input>
                {errors.customer_email && <div style={errorStyle}>{errors.customer_email}</div>}
              </div>

              <div>
                <Input label="Phone" required value={form.customer_phone} onChange={set("customer_phone")} type="tel">
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={(e) => set("customer_phone")(e.target.value)}
                    placeholder="0400 000 000"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: `1px solid ${errors.customer_phone ? "#e11d48" : "#d4d4d8"}`,
                      borderRadius: "10px",
                      padding: "10px 12px",
                      fontSize: "14px",
                      color: "#18181b",
                      outline: "none",
                    }}
                  />
                </Input>
                {errors.customer_phone && <div style={errorStyle}>{errors.customer_phone}</div>}
              </div>
            </div>

            {/* Event details section */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: "16px",
                padding: "20px",
              }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#18181b",
                  margin: "0 0 16px",
                }}
              >
                Tell Us About Your Event
              </h3>

              <div>
                <Select
                  label="Event Type"
                  required
                  value={form.event_type}
                  onChange={set("event_type")}
                  options={EVENT_TYPES}
                  placeholder="Select event type…"
                />
                {errors.event_type && <div style={{ ...errorStyle, marginTop: "-8px", marginBottom: "16px" }}>{errors.event_type}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                      Event Date<span style={{ color: "#e11d48", marginLeft: "2px" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={form.booking_date}
                      onChange={(e) => set("booking_date")(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: `1px solid ${errors.booking_date ? "#e11d48" : "#d4d4d8"}`,
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "#18181b",
                        outline: "none",
                      }}
                    />
                    {errors.booking_date && <div style={errorStyle}>{errors.booking_date}</div>}
                  </div>
                </div>
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                      Start Time<span style={{ color: "#e11d48", marginLeft: "2px" }}>*</span>
                    </label>
                    <input
                      type="time"
                      value={form.booking_time}
                      onChange={(e) => set("booking_time")(e.target.value)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: `1px solid ${errors.booking_time ? "#e11d48" : "#d4d4d8"}`,
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "#18181b",
                        outline: "none",
                      }}
                    />
                    {errors.booking_time && <div style={errorStyle}>{errors.booking_time}</div>}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                  Event Location / Venue Name<span style={{ color: "#e11d48", marginLeft: "2px" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.event_location}
                  onChange={(e) => set("event_location")(e.target.value)}
                  placeholder="e.g. The Grand Ballroom"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: `1px solid ${errors.event_location ? "#e11d48" : "#d4d4d8"}`,
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#18181b",
                    outline: "none",
                    marginBottom: "4px",
                  }}
                />
                {errors.event_location && <div style={{ ...errorStyle, marginBottom: "12px" }}>{errors.event_location}</div>}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                  Full Address
                </label>
                <input
                  type="text"
                  value={form.full_address}
                  onChange={(e) => set("full_address")(e.target.value)}
                  placeholder="123 Example St, Melbourne VIC 3000"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d4d4d8",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#18181b",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                  Number of Guests
                </label>
                <input
                  type="number"
                  value={form.num_guests}
                  onChange={(e) => set("num_guests")(e.target.value)}
                  placeholder="e.g. 100"
                  min="1"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d4d4d8",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#18181b",
                    outline: "none",
                  }}
                />
              </div>

              <Select
                label="How did you hear about us?"
                value={form.referral_source}
                onChange={set("referral_source")}
                options={REFERRAL_SOURCES}
                placeholder="Select…"
              />

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#3f3f46", marginBottom: "6px" }}>
                  Special Requests / Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes")(e.target.value)}
                  placeholder="Any special requests or additional information…"
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d4d4d8",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "14px",
                    color: "#18181b",
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <button
                onClick={handleNext}
                disabled={submitting}
                style={{
                  background: "#e11d48",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  padding: "14px 28px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  width: "100%",
                }}
              >
                Continue →
              </button>
            </div>
          </div>

          {/* RIGHT — Package Summary */}
          <PackageSummary
            packageName={packageName}
            packagePrice={packagePrice}
            categoryName={categoryName}
            onChangePackage={handleChangePackage}
            businessId={businessId}
            searchParams={searchParams}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 680px) {
          .details-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </BookingShell>
  );
}
