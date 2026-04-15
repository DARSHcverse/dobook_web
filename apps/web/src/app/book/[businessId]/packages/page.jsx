"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BookingShell } from "../_components/BookingShell";

function CategoryCard({ category, onClick }) {
  const [hovered, setHovered] = useState(false);
  const bgGradients = [
    "linear-gradient(135deg, #e11d48, #be123c)",
    "linear-gradient(135deg, #7c3aed, #5b21b6)",
    "linear-gradient(135deg, #0891b2, #0e7490)",
    "linear-gradient(135deg, #059669, #047857)",
    "linear-gradient(135deg, #d97706, #b45309)",
    "linear-gradient(135deg, #db2777, #9d174d)",
  ];
  const gradient = bgGradients[(category.sort_order || 0) % bgGradients.length];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 8px 30px rgba(0,0,0,0.15)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        border: "1px solid #e4e4e7",
      }}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: category.image_url ? "transparent" : gradient,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "800",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-1px",
            }}
          >
            {category.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {/* Name */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#18181b",
            marginBottom: "4px",
          }}
        >
          {category.name}
        </div>
        {category.description && (
          <div style={{ fontSize: "13px", color: "#71717a", lineHeight: "1.5" }}>
            {category.description}
          </div>
        )}
      </div>
    </div>
  );
}

function PackageCard({ pkg, onChoose }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: hovered
          ? "0 8px 30px rgba(0,0,0,0.15)"
          : "0 2px 8px rgba(0,0,0,0.08)",
        border: "1px solid #e4e4e7",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4/3",
          background: pkg.image_url
            ? "transparent"
            : "linear-gradient(135deg, #e11d48, #be123c)",
          overflow: "hidden",
        }}
      >
        {pkg.image_url ? (
          <img
            src={pkg.image_url}
            alt={pkg.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: "800",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {pkg.name.charAt(0)}
          </div>
        )}
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#18181b",
            marginBottom: "6px",
          }}
        >
          {pkg.name}
        </div>

        <div
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#e11d48",
            marginBottom: "12px",
          }}
        >
          ${Number(pkg.price || 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>

        {pkg.description && (
          <div
            style={{
              fontSize: "13px",
              color: "#52525b",
              marginBottom: "12px",
              lineHeight: "1.5",
            }}
          >
            {pkg.description}
          </div>
        )}

        {/* Features */}
        {Array.isArray(pkg.features) && pkg.features.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", flex: 1 }}>
            {pkg.features.map((f, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#3f3f46",
                }}
              >
                <span style={{ color: "#e11d48", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        )}

        {pkg.duration_hours && (
          <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "16px" }}>
            {pkg.duration_hours} hour{Number(pkg.duration_hours) !== 1 ? "s" : ""} hire
          </div>
        )}

        <button
          onClick={onChoose}
          style={{
            background: "#e11d48",
            color: "#fff",
            border: "none",
            borderRadius: "999px",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
            width: "100%",
            marginTop: "auto",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#be123c")}
          onMouseLeave={(e) => (e.target.style.background = "#e11d48")}
        >
          Choose Now →
        </button>
      </div>
    </div>
  );
}

export default function PackagesPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const step = Number(searchParams.get("step") || "1");
  const categoryId = searchParams.get("category_id") || "";

  const [business, setBusiness] = useState(null);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/widget/business/${businessId}/info`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setBusiness(data);
    } catch {
      setError("Failed to load business information.");
    }
  }, [businessId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/businesses/${businessId}/categories`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCategories(data);
    } catch {
      setError("Failed to load booth types.");
    }
  }, [businessId]);

  const loadPackages = useCallback(async () => {
    try {
      const url = categoryId
        ? `/api/public/businesses/${businessId}/packages?category_id=${categoryId}`
        : `/api/public/businesses/${businessId}/packages`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPackages(data);
    } catch {
      setError("Failed to load packages.");
    }
  }, [businessId, categoryId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadBusiness();
      if (step === 1) {
        await loadCategories();
      } else {
        await loadPackages();
      }
      setLoading(false);
    }
    if (businessId) load();
  }, [businessId, step, loadBusiness, loadCategories, loadPackages]);

  const handleCategorySelect = (cat) => {
    router.push(
      `/book/${businessId}/packages?step=2&category_id=${cat.id}&category_name=${encodeURIComponent(cat.name)}`
    );
  };

  const handlePackageChoose = (pkg) => {
    const catName = searchParams.get("category_name") || "";
    router.push(
      `/book/${businessId}/details?package_id=${pkg.id}&category_id=${categoryId}&category_name=${encodeURIComponent(catName)}&package_name=${encodeURIComponent(pkg.name)}&package_price=${pkg.price}`
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

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          color: "#e11d48",
          fontSize: "14px",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <BookingShell business={business} currentStep={step === 1 ? 1 : 2}>
      {step === 1 ? (
        /* Step 1 — Category Selection */
        <div>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#18181b",
                margin: "0 0 8px",
              }}
            >
              Check Availability. Get a Quote. Secure Your Date.
            </h2>
            <p style={{ fontSize: "15px", color: "#71717a", margin: 0 }}>
              Choose your booth type to get started
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
            }}
          >
            {categories.map((cat) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onClick={() => handleCategorySelect(cat)}
              />
            ))}
          </div>

          {categories.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "#a1a1aa",
                fontSize: "15px",
              }}
            >
              No booth types available at this time.
            </div>
          )}
        </div>
      ) : (
        /* Step 2 — Package Selection */
        <div>
          <div style={{ marginBottom: "20px" }}>
            <button
              onClick={() => router.push(`/book/${businessId}/packages?step=1`)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                color: "#71717a",
                fontWeight: "600",
                padding: "0",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              ← Start Over
            </button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#18181b",
                margin: "0 0 8px",
              }}
            >
              Choose Your Package
            </h2>
            {searchParams.get("category_name") && (
              <p style={{ fontSize: "15px", color: "#71717a", margin: 0 }}>
                {searchParams.get("category_name")}
              </p>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onChoose={() => handlePackageChoose(pkg)}
              />
            ))}
          </div>

          {packages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "#a1a1aa",
                fontSize: "15px",
              }}
            >
              No packages available for this booth type.
            </div>
          )}
        </div>
      )}
    </BookingShell>
  );
}
