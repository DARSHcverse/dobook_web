"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function ThankYouPage() {
  const { businessId } = useParams();
  const searchParams = useSearchParams();
  const firstName = searchParams.get("first_name") || "there";
  const invoiceId = searchParams.get("invoice_id") || "";

  const [business, setBusiness] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

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
    }
    if (businessId) load();
  }, [businessId]);

  return (
    <div
      style={{
        fontFamily: "'Manrope', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#f4f4f5",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          opacity: animate ? 1 : 0,
          transform: animate ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Business logo */}
        {business?.logo_src && (
          <img
            src={business.logo_src}
            alt={business.business_name || ""}
            style={{
              maxHeight: "60px",
              maxWidth: "180px",
              objectFit: "contain",
              marginBottom: "24px",
            }}
          />
        )}

        {/* Big checkmark */}
        <div
          style={{
            width: "80px",
            height: "80px",
            background: "#dcfce7",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            margin: "0 auto 20px",
            transform: animate ? "scale(1)" : "scale(0.5)",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: "800",
            color: "#18181b",
            margin: "0 0 8px",
          }}
        >
          Enquiry Received!
        </h1>

        <p
          style={{
            fontSize: "16px",
            color: "#52525b",
            margin: "0 0 24px",
            lineHeight: "1.6",
          }}
        >
          Thanks {firstName}! We&apos;ll be in touch within{" "}
          <strong style={{ color: "#18181b" }}>24 hours</strong> to confirm availability and
          finalise your booking.
        </p>

        {invoiceId && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: "12px",
              padding: "14px 20px",
              marginBottom: "24px",
              fontSize: "14px",
              color: "#52525b",
            }}
          >
            Your reference number:{" "}
            <strong style={{ color: "#18181b" }}>{invoiceId}</strong>
          </div>
        )}

        {business && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: "16px",
              padding: "20px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#18181b",
                marginBottom: "12px",
              }}
            >
              {business.business_name}
            </div>
            {business.email && (
              <div style={{ fontSize: "13px", color: "#52525b", marginBottom: "6px" }}>
                📧{" "}
                <a
                  href={`mailto:${business.email}`}
                  style={{ color: "#e11d48", textDecoration: "none" }}
                >
                  {business.email}
                </a>
              </div>
            )}
            {business.phone && (
              <div style={{ fontSize: "13px", color: "#52525b" }}>
                📞{" "}
                <a
                  href={`tel:${business.phone}`}
                  style={{ color: "#e11d48", textDecoration: "none" }}
                >
                  {business.phone}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
