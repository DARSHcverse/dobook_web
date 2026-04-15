"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocomplete from "@/components/app/AddressAutocomplete";

const STEPS = [
  { key: "booth", label: "Booth Type" },
  { key: "package", label: "Package" },
  { key: "event", label: "Your Event" },
  { key: "addons", label: "Add-Ons" },
  { key: "review", label: "Review" },
];

const EVENT_TYPES = [
  "Wedding",
  "Birthday Party",
  "Corporate Event",
  "School Formal",
  "Engagement Party",
  "Christmas Party",
  "Baby Shower",
  "Other",
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Instagram",
  "Facebook",
  "Word of Mouth",
  "Referred by a Friend",
  "Other",
];

function formatPrice(n) {
  const v = Number(n || 0);
  return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
}

function hexToRgba(hex, alpha) {
  const m = /^#?([a-f0-9]{6})$/i.exec((hex || "").trim());
  if (!m) return `rgba(232, 25, 60, ${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function EnquiryFlow({ initialData, slug }) {
  const router = useRouter();
  const { business, categories, packages, addons } = initialData;
  const brand = business.brand_color || "#E8193C";
  const logo = business.brand_logo_url || business.logo_url || "";

  // Skip booth step if 0/1 categories
  const hasMultipleCategories = categories.length > 1;
  const initialStep = hasMultipleCategories ? 0 : 1;

  const [stepIndex, setStepIndex] = useState(initialStep);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    !hasMultipleCategories && categories[0] ? categories[0].id : "",
  );
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    customer_email: "",
    customer_phone: "",
    event_type: "",
    booking_date: "",
    booking_time: "",
    duration_hours: "",
    venue_name: "",
    event_location: "",
    num_guests: "",
    referral_source: "",
    notes: "",
    terms: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const filteredPackages = useMemo(() => {
    if (!selectedCategoryId) return packages;
    return packages.filter((p) => p.category_id === selectedCategoryId);
  }, [packages, selectedCategoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) || null,
    [packages, selectedPackageId],
  );
  const selectedAddons = useMemo(
    () => addons.filter((a) => selectedAddonIds.includes(a.id)),
    [addons, selectedAddonIds],
  );

  const basePrice = Number(selectedPackage?.price || 0);
  const addonsTotal = selectedAddons.reduce((s, a) => s + Number(a.price || 0), 0);
  const estimatedTotal = basePrice + addonsTotal;

  const totalSteps = STEPS.length;
  const visibleSteps = useMemo(() => {
    const s = [...STEPS];
    if (!hasMultipleCategories) s[0] = null;
    if (addons.length === 0) s[3] = null;
    return s;
  }, [hasMultipleCategories, addons.length]);

  // URL hash sync for shareability
  useEffect(() => {
    const key = STEPS[stepIndex]?.key;
    if (key && typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${key}`);
    }
  }, [stepIndex]);

  // Auto-fill duration from package
  useEffect(() => {
    if (selectedPackage?.duration_hours && !form.duration_hours) {
      setForm((f) => ({ ...f, duration_hours: String(selectedPackage.duration_hours) }));
    }
  }, [selectedPackage]); // eslint-disable-line react-hooks/exhaustive-deps

  function goTo(idx) {
    let next = idx;
    while (next >= 0 && next < STEPS.length && visibleSteps[next] === null) {
      next = idx < stepIndex ? next - 1 : next + 1;
    }
    if (next < 0) next = 0;
    if (next >= STEPS.length) next = STEPS.length - 1;
    setStepIndex(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextStep() { goTo(stepIndex + 1); }
  function prevStep() { goTo(stepIndex - 1); }

  function selectCategory(id) {
    setSelectedCategoryId(id);
    setSelectedPackageId("");
    goTo(1);
  }

  function selectPackage(id) {
    setSelectedPackageId(id);
    goTo(2);
  }

  function toggleAddon(id) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function validateEvent() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Required";
    if (!form.last_name.trim()) e.last_name = "Required";
    if (!form.customer_email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
      e.customer_email = "Valid email required";
    if (!form.customer_phone.trim()) e.customer_phone = "Required";
    if (!form.event_type) e.event_type = "Required";
    if (!form.booking_date) e.booking_date = "Required";
    if (!form.booking_time) e.booking_time = "Required";
    if (!form.venue_name.trim()) e.venue_name = "Required";
    if (!form.event_location.trim()) e.event_location = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitEnquiry() {
    if (!form.terms) {
      setSubmitError("Please accept the terms to continue.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        customer_email: form.customer_email.trim(),
        customer_phone: form.customer_phone.trim(),
        event_type: form.event_type,
        booking_date: form.booking_date,
        booking_time: form.booking_time,
        venue_name: form.venue_name.trim(),
        event_location: form.event_location.trim(),
        num_guests: form.num_guests ? Number(form.num_guests) : null,
        referral_source: form.referral_source,
        notes: form.notes.trim(),
        package_id: selectedPackageId || null,
        category_id: selectedCategoryId || null,
        category_name: selectedCategory?.name || "",
        addon_ids: selectedAddonIds,
        duration_minutes: form.duration_hours
          ? Math.round(Number(form.duration_hours) * 60)
          : undefined,
      };
      const res = await fetch(`/api/public/enquiry/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data?.detail || "Failed to submit enquiry. Please try again.");
        setSubmitting(false);
        return;
      }
      const refId = data.invoice_id || data.id || "";
      router.push(
        `/enquiry/${encodeURIComponent(slug)}/thank-you?ref=${encodeURIComponent(refId)}&email=${encodeURIComponent(form.customer_email)}&name=${encodeURIComponent(form.first_name)}`,
      );
    } catch (err) {
      setSubmitError(err?.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  const brandTint = hexToRgba(brand, 0.08);
  const brandTintStrong = hexToRgba(brand, 0.15);

  return (
    <div
      style={{
        "--brand": brand,
        "--brand-tint": brandTint,
        "--brand-tint-strong": brandTintStrong,
        minHeight: "100vh",
        background: "#FAFAFA",
        fontFamily:
          "'Inter', 'Manrope', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "#18181b",
      }}
    >
      <ProgressBar
        steps={STEPS}
        visibleSteps={visibleSteps}
        currentIndex={stepIndex}
        brand={brand}
      />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "32px 16px 96px",
        }}
      >
        <Header business={business} logo={logo} />

        {stepIndex === 0 && hasMultipleCategories && (
          <StepBooth
            categories={categories}
            brand={brand}
            onSelect={selectCategory}
            selectedId={selectedCategoryId}
          />
        )}
        {stepIndex === 0 && !hasMultipleCategories && categories.length === 0 && (
          <FallbackNoCategories
            form={form}
            setForm={setForm}
            errors={errors}
            submitEnquiry={() => {
              if (validateEvent()) submitEnquiry();
            }}
            brand={brand}
            submitting={submitting}
            submitError={submitError}
          />
        )}

        {stepIndex === 1 && (
          <StepPackage
            packages={filteredPackages}
            category={selectedCategory}
            selectedId={selectedPackageId}
            onSelect={selectPackage}
            onBack={() => goTo(0)}
            canGoBack={hasMultipleCategories}
            brand={brand}
          />
        )}

        {stepIndex === 2 && (
          <StepEvent
            form={form}
            setForm={setForm}
            errors={errors}
            brand={brand}
            pkg={selectedPackage}
            category={selectedCategory}
            estimatedTotal={estimatedTotal}
            onBack={prevStep}
            onNext={() => {
              if (validateEvent()) nextStep();
            }}
          />
        )}

        {stepIndex === 3 && (
          <StepAddons
            addons={addons}
            selectedIds={selectedAddonIds}
            onToggle={toggleAddon}
            pkg={selectedPackage}
            basePrice={basePrice}
            estimatedTotal={estimatedTotal}
            onBack={prevStep}
            onNext={nextStep}
            brand={brand}
          />
        )}

        {stepIndex === 4 && (
          <StepReview
            business={business}
            pkg={selectedPackage}
            category={selectedCategory}
            selectedAddons={selectedAddons}
            form={form}
            setForm={setForm}
            basePrice={basePrice}
            addonsTotal={addonsTotal}
            estimatedTotal={estimatedTotal}
            onBack={prevStep}
            onSubmit={submitEnquiry}
            submitting={submitting}
            submitError={submitError}
            brand={brand}
          />
        )}
      </div>

      <Footer />
    </div>
  );
}

/* -------------------- Components -------------------- */

function ProgressBar({ steps, visibleSteps, currentIndex, brand }) {
  const visible = steps.map((s, i) => (visibleSteps[i] === null ? null : { ...s, idx: i })).filter(Boolean);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e4e4e7",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {visible.map((s, i) => {
          const isCurrent = s.idx === currentIndex;
          const isDone = s.idx < currentIndex;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "999px",
                  background: isCurrent ? brand : isDone ? brand : "#e4e4e7",
                  color: isCurrent || isDone ? "#fff" : "#71717a",
                  fontWeight: 700,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 300ms ease",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? "#18181b" : "#71717a",
                }}
                className="step-label"
              >
                {s.label}
              </span>
              {i < visible.length - 1 && (
                <div
                  style={{
                    width: "32px",
                    height: "2px",
                    background: isDone ? brand : "#e4e4e7",
                    borderRadius: "2px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @media (max-width: 640px) {
          .step-label { display: none; }
          .step-label-current { display: inline !important; }
        }
      `}</style>
    </div>
  );
}

function Header({ business, logo }) {
  return (
    <div style={{ textAlign: "center", marginBottom: "32px" }}>
      {logo ? (
        <img
          src={logo}
          alt={business.business_name}
          style={{ maxHeight: "72px", maxWidth: "240px", objectFit: "contain", marginBottom: "12px" }}
        />
      ) : null}
      <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
        {business.business_name}
      </h1>
      <p style={{ fontSize: "15px", color: "#52525b", margin: 0 }}>
        Check Availability. Get a Quote. Secure Your Date.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "24px 16px",
        fontSize: "12px",
        color: "#a1a1aa",
      }}
    >
      Powered by{" "}
      <a
        href="https://do-book.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#71717a", textDecoration: "underline" }}
      >
        DoBook
      </a>
    </div>
  );
}

/* Step 1 — Booth Type */
function StepBooth({ categories, brand, onSelect, selectedId }) {
  return (
    <div>
      <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>
        Choose Your Booth Type
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "18px",
        }}
      >
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              position: "relative",
              border: selectedId === c.id ? `2px solid ${brand}` : "1px solid #e4e4e7",
              borderRadius: "20px",
              overflow: "hidden",
              cursor: "pointer",
              background: "#fff",
              padding: 0,
              aspectRatio: "4/3",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              transition: "transform 300ms ease, box-shadow 300ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.06)";
            }}
          >
            {c.image_url ? (
              <img
                src={c.image_url}
                alt={c.name}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg, ${brand} 0%, ${hexToRgba(brand, 0.6)} 100%)`,
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.75) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px 18px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {c.name}
              </div>
              {c.description ? (
                <div
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  {c.description}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Fallback form when business has no categories */
function FallbackNoCategories({ form, setForm, errors, submitEnquiry, brand, submitting, submitError }) {
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 16px" }}>Request a Quote</h2>
      <Card>
        <EventFormFields form={form} setForm={setForm} errors={errors} />
      </Card>
      {submitError ? <ErrorBanner>{submitError}</ErrorBanner> : null}
      <PrimaryButton
        onClick={submitEnquiry}
        disabled={submitting}
        brand={brand}
        style={{ marginTop: "20px" }}
      >
        {submitting ? "Submitting…" : "Submit Enquiry"}
      </PrimaryButton>
    </div>
  );
}

/* Step 2 — Package */
function StepPackage({ packages, category, selectedId, onSelect, onBack, canGoBack, brand }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          {canGoBack ? (
            <button
              onClick={onBack}
              style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "13px", padding: 0 }}
            >
              ← Back to Booth Type
            </button>
          ) : null}
          <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "4px 0 0" }}>
            {category ? `${category.name} Packages` : "Choose Your Package"}
          </h2>
        </div>
      </div>

      {packages.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: "#71717a" }}>No packages available yet. Please check back later.</p>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          {packages.map((p) => {
            const isSelected = selectedId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  border: isSelected ? `2px solid ${brand}` : "1px solid #e4e4e7",
                  borderRadius: "20px",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 300ms ease",
                }}
              >
                <div style={{ position: "relative", aspectRatio: "4/3", background: hexToRgba(brand, 0.1) }}>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(135deg, ${brand} 0%, ${hexToRgba(brand, 0.6)} 100%)`,
                      }}
                    />
                  )}
                  {p.duration_hours ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: "999px",
                        padding: "4px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#18181b",
                      }}
                    >
                      {p.duration_hours} Hours
                    </div>
                  ) : null}
                  {isSelected ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        background: brand,
                        color: "#fff",
                        width: "28px",
                        height: "28px",
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </div>
                  ) : null}
                </div>
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>{p.name}</h3>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: brand, marginBottom: "12px" }}>
                    {formatPrice(p.price)}
                  </div>
                  {p.description ? (
                    <p style={{ fontSize: "13px", color: "#52525b", margin: "0 0 12px" }}>{p.description}</p>
                  ) : null}
                  {Array.isArray(p.features) && p.features.length ? (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
                      {p.features.map((f, idx) => (
                        <li
                          key={idx}
                          style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#27272a", marginBottom: "6px" }}
                        >
                          <span style={{ color: brand, fontWeight: 700 }}>✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <PrimaryButton onClick={() => onSelect(p.id)} brand={brand} style={{ marginTop: "auto" }}>
                    {isSelected ? "Selected ✓" : "Select This Package"}
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Step 3 — Event details */
function StepEvent({ form, setForm, errors, brand, pkg, category, estimatedTotal, onBack, onNext }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "24px" }} className="event-grid">
      <style>{`
        @media (max-width: 900px) {
          .event-grid { grid-template-columns: 1fr !important; }
          .event-summary { position: static !important; }
        }
      `}</style>
      <div>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "12px" }}
        >
          ← Back
        </button>
        <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 16px" }}>Your Event Details</h2>

        <Card>
          <SectionTitle>How Can We Reach You?</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="First Name *" error={errors.first_name}>
              <Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
            </Field>
            <Field label="Last Name *" error={errors.last_name}>
              <Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
            </Field>
          </div>
          <Field label="Email Address *" error={errors.customer_email}>
            <Input type="email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} />
          </Field>
          <Field label="Mobile Number *" error={errors.customer_phone}>
            <Input type="tel" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} />
          </Field>
        </Card>

        <Card style={{ marginTop: "16px" }}>
          <SectionTitle>About Your Event</SectionTitle>
          <Field label="Event Type *" error={errors.event_type}>
            <Select value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })}>
              <option value="">Select event type…</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Event Date *" error={errors.booking_date}>
              <Input
                type="date"
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                value={form.booking_date}
                onChange={(v) => setForm({ ...form, booking_date: v })}
              />
            </Field>
            <Field label="Start Time *" error={errors.booking_time}>
              <Input type="time" value={form.booking_time} onChange={(v) => setForm({ ...form, booking_time: v })} />
            </Field>
          </div>
          <Field label="Event Duration (hours)">
            <Input
              type="number"
              step="0.5"
              min="1"
              value={form.duration_hours}
              onChange={(v) => setForm({ ...form, duration_hours: v })}
            />
          </Field>
          <Field label="Venue / Location Name *" error={errors.venue_name}>
            <Input value={form.venue_name} onChange={(v) => setForm({ ...form, venue_name: v })} />
          </Field>
          <Field label="Full Venue Address *" error={errors.event_location}>
            <AddressAutocomplete
              value={form.event_location}
              onChange={(v) => setForm({ ...form, event_location: v })}
              placeholder="Start typing the venue address…"
            />
          </Field>
          <Field label="Approximate Guest Count">
            <Input
              type="number"
              min="0"
              value={form.num_guests}
              onChange={(v) => setForm({ ...form, num_guests: v })}
            />
          </Field>
          <Field label="How did you hear about us?">
            <Select value={form.referral_source} onChange={(v) => setForm({ ...form, referral_source: v })}>
              <option value="">Select…</option>
              {REFERRAL_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card style={{ marginTop: "16px" }}>
          <SectionTitle>Anything Else?</SectionTitle>
          <Field label="Special requests or notes">
            <Textarea
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              placeholder="Tell us about your theme, any special requirements, or questions…"
            />
          </Field>
        </Card>

        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
          <PrimaryButton onClick={onNext} brand={brand} style={{ flex: 1 }}>
            Continue →
          </PrimaryButton>
        </div>
      </div>

      <div className="event-summary" style={{ position: "sticky", top: "80px", alignSelf: "start" }}>
        <OrderSummary pkg={pkg} category={category} estimatedTotal={estimatedTotal} brand={brand} />
      </div>
    </div>
  );
}

function OrderSummary({ pkg, category, estimatedTotal, brand }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: "20px",
        padding: "20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Order Summary
      </div>
      {pkg ? (
        <>
          {pkg.image_url ? (
            <img
              src={pkg.image_url}
              alt={pkg.name}
              style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: "12px", marginTop: "12px" }}
            />
          ) : null}
          <div style={{ marginTop: "12px" }}>
            {category ? (
              <div style={{ fontSize: "12px", color: "#71717a" }}>{category.name}</div>
            ) : null}
            <div style={{ fontSize: "18px", fontWeight: 700 }}>{pkg.name}</div>
            <div style={{ fontSize: "22px", fontWeight: 800, color: brand, marginTop: "4px" }}>
              {formatPrice(pkg.price)}
            </div>
          </div>
          {Array.isArray(pkg.features) && pkg.features.length ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {pkg.features.slice(0, 3).map((f, i) => (
                <li key={i} style={{ fontSize: "12px", color: "#52525b", marginBottom: "4px" }}>
                  <span style={{ color: brand }}>✓</span> {f}
                </li>
              ))}
              {pkg.features.length > 3 ? (
                <li style={{ fontSize: "12px", color: "#71717a" }}>+ {pkg.features.length - 3} more</li>
              ) : null}
            </ul>
          ) : null}
        </>
      ) : (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#71717a" }}>No package selected.</div>
      )}
      <div style={{ borderTop: "1px solid #e4e4e7", margin: "16px 0 12px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 700 }}>
        <span>Estimated Total</span>
        <span style={{ color: brand }}>{formatPrice(estimatedTotal)}</span>
      </div>
      <div style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "6px" }}>
        Final price confirmed after review
      </div>
    </div>
  );
}

/* Step 4 — Add-ons */
function StepAddons({ addons, selectedIds, onToggle, pkg, basePrice, estimatedTotal, onBack, onNext, brand }) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "12px" }}
      >
        ← Back
      </button>
      <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 6px" }}>Enhance Your Experience</h2>
      <p style={{ fontSize: "14px", color: "#52525b", margin: "0 0 20px" }}>
        Optional extras to make your event even more special
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
        {addons.map((a) => {
          const sel = selectedIds.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              style={{
                textAlign: "left",
                background: sel ? hexToRgba(brand, 0.08) : "#fff",
                border: sel ? `2px solid ${brand}` : "1px solid #e4e4e7",
                borderRadius: "16px",
                padding: "16px",
                cursor: "pointer",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                transition: "all 200ms ease",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  border: sel ? `2px solid ${brand}` : "2px solid #d4d4d8",
                  background: sel ? brand : "#fff",
                  color: "#fff",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {sel ? "✓" : ""}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: brand, whiteSpace: "nowrap" }}>
                    +{formatPrice(a.price)}
                  </div>
                </div>
                {a.description ? (
                  <div style={{ fontSize: "13px", color: "#71717a", marginTop: "4px" }}>{a.description}</div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "24px",
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: "16px",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#52525b" }}>
          <span>Package: {pkg?.name || "—"}</span>
          <span>{formatPrice(basePrice)}</span>
        </div>
        {selectedIds.map((id) => {
          const a = addons.find((x) => x.id === id);
          if (!a) return null;
          return (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#52525b", marginTop: "4px" }}>
              <span>+ {a.name}</span>
              <span>{formatPrice(a.price)}</span>
            </div>
          );
        })}
        <div style={{ borderTop: "1px solid #e4e4e7", margin: "12px 0 8px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800 }}>
          <span>Estimated Total</span>
          <span style={{ color: brand }}>{formatPrice(estimatedTotal)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        <PrimaryButton onClick={onNext} brand={brand} style={{ flex: 1 }}>
          Continue to Review →
        </PrimaryButton>
      </div>
    </div>
  );
}

/* Step 5 — Review */
function StepReview({ business, pkg, category, selectedAddons, form, setForm, basePrice, addonsTotal, estimatedTotal, onBack, onSubmit, submitting, submitError, brand }) {
  const dateStr = form.booking_date
    ? new Date(form.booking_date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "—";
  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: "13px", padding: 0, marginBottom: "12px" }}
      >
        ← Back
      </button>
      <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 16px" }}>Review Your Enquiry</h2>

      {pkg ? (
        <Card>
          <SectionTitle>Selected Package</SectionTitle>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            {pkg.image_url ? (
              <img src={pkg.image_url} alt={pkg.name} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px" }} />
            ) : (
              <div style={{ width: "80px", height: "80px", borderRadius: "12px", background: hexToRgba(brand, 0.15) }} />
            )}
            <div style={{ flex: 1 }}>
              {category ? <div style={{ fontSize: "12px", color: "#71717a" }}>{category.name}</div> : null}
              <div style={{ fontSize: "16px", fontWeight: 700 }}>{pkg.name}</div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: brand }}>{formatPrice(pkg.price)}</div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card style={{ marginTop: "12px" }}>
        <SectionTitle>Your Event</SectionTitle>
        <SummaryRow icon="📅" label={dateStr} />
        <SummaryRow icon="🕐" label={`${form.booking_time || "—"} ${form.duration_hours ? `(${form.duration_hours} hrs)` : ""}`} />
        <SummaryRow icon="🎉" label={form.event_type || "—"} />
        <SummaryRow icon="📍" label={[form.venue_name, form.event_location].filter(Boolean).join(", ") || "—"} />
        {form.num_guests ? <SummaryRow icon="👥" label={`${form.num_guests} guests`} /> : null}
      </Card>

      <Card style={{ marginTop: "12px" }}>
        <SectionTitle>Contact Details</SectionTitle>
        <div style={{ fontSize: "14px", lineHeight: 1.6 }}>
          <div>{[form.first_name, form.last_name].filter(Boolean).join(" ")}</div>
          <div style={{ color: "#52525b" }}>{form.customer_email}</div>
          <div style={{ color: "#52525b" }}>{form.customer_phone}</div>
        </div>
      </Card>

      {selectedAddons.length ? (
        <Card style={{ marginTop: "12px" }}>
          <SectionTitle>Add-Ons</SectionTitle>
          {selectedAddons.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600 }}>{formatPrice(a.price)}</span>
            </div>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginTop: "12px" }}>
        <SectionTitle>Price Summary</SectionTitle>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
          <span>Base package</span>
          <span>{formatPrice(basePrice)}</span>
        </div>
        {addonsTotal > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
            <span>Add-ons</span>
            <span>{formatPrice(addonsTotal)}</span>
          </div>
        ) : null}
        <div style={{ borderTop: "1px solid #e4e4e7", margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 800 }}>
          <span>Estimated Total</span>
          <span style={{ color: brand }}>{formatPrice(estimatedTotal)}</span>
        </div>
      </Card>

      {business.enquiry_cancellation_policy ? (
        <Card style={{ marginTop: "12px" }}>
          <SectionTitle>Cancellation Policy</SectionTitle>
          <div style={{ fontSize: "13px", color: "#52525b", whiteSpace: "pre-wrap" }}>
            {business.enquiry_cancellation_policy}
          </div>
        </Card>
      ) : null}

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          marginTop: "20px",
          fontSize: "13px",
          color: "#27272a",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={form.terms}
          onChange={(e) => setForm({ ...form, terms: e.target.checked })}
          style={{ marginTop: "2px", accentColor: brand }}
        />
        <span>
          I have read and agree to the cancellation policy. I understand this is an enquiry and not a confirmed booking.
        </span>
      </label>

      {submitError ? <ErrorBanner>{submitError}</ErrorBanner> : null}

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <SecondaryButton onClick={onBack} disabled={submitting}>Back</SecondaryButton>
        <PrimaryButton onClick={onSubmit} disabled={submitting} brand={brand} style={{ flex: 1 }}>
          {submitting ? "Submitting…" : "Submit Enquiry"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* -------------------- UI atoms -------------------- */

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: "20px",
        padding: "20px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function SectionTitle({ children }) {
  return <div style={{ fontSize: "13px", fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>{children}</div>;
}
function Field({ label, error, children }) {
  return (
    <label style={{ display: "block", marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#52525b", marginBottom: "4px" }}>{label}</div>
      {children}
      {error ? <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px" }}>{error}</div> : null}
    </label>
  );
}
function Input({ type = "text", value, onChange, placeholder, min, step }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #e4e4e7",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#fff",
        color: "#18181b",
      }}
    />
  );
}
function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #e4e4e7",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#fff",
        color: "#18181b",
      }}
    >
      {children}
    </select>
  );
}
function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #e4e4e7",
        borderRadius: "10px",
        fontSize: "14px",
        outline: "none",
        background: "#fff",
        color: "#18181b",
        fontFamily: "inherit",
        resize: "vertical",
      }}
    />
  );
}
function PrimaryButton({ onClick, disabled, brand, children, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: brand,
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        padding: "14px 20px",
        fontSize: "15px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 200ms ease",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
function SecondaryButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#fff",
        color: "#18181b",
        border: "1px solid #e4e4e7",
        borderRadius: "12px",
        padding: "14px 20px",
        fontSize: "15px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
function ErrorBanner({ children }) {
  return (
    <div
      style={{
        marginTop: "16px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#b91c1c",
        borderRadius: "12px",
        padding: "12px 14px",
        fontSize: "13px",
      }}
    >
      {children}
    </div>
  );
}
function SummaryRow({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", marginBottom: "6px" }}>
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function EventFormFields({ form, setForm, errors }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="First Name *" error={errors.first_name}>
          <Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        </Field>
        <Field label="Last Name *" error={errors.last_name}>
          <Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        </Field>
      </div>
      <Field label="Email *" error={errors.customer_email}>
        <Input type="email" value={form.customer_email} onChange={(v) => setForm({ ...form, customer_email: v })} />
      </Field>
      <Field label="Phone *" error={errors.customer_phone}>
        <Input type="tel" value={form.customer_phone} onChange={(v) => setForm({ ...form, customer_phone: v })} />
      </Field>
      <Field label="Event Date *" error={errors.booking_date}>
        <Input type="date" value={form.booking_date} onChange={(v) => setForm({ ...form, booking_date: v })} />
      </Field>
      <Field label="Start Time *" error={errors.booking_time}>
        <Input type="time" value={form.booking_time} onChange={(v) => setForm({ ...form, booking_time: v })} />
      </Field>
      <Field label="Venue Name *" error={errors.venue_name}>
        <Input value={form.venue_name} onChange={(v) => setForm({ ...form, venue_name: v })} />
      </Field>
      <Field label="Venue Address *" error={errors.event_location}>
        <Input value={form.event_location} onChange={(v) => setForm({ ...form, event_location: v })} />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </Field>
    </>
  );
}
