"use client";

import { StepProgress } from "./StepProgress";

export function BookingShell({ business, currentStep, children }) {
  const businessName = business?.business_name || "";
  const logoSrc = business?.logo_src || "";

  return (
    <div
      style={{
        fontFamily: "'Manrope', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
        background: "#f4f4f5",
        minHeight: "100vh",
        padding: "24px 16px 48px",
      }}
    >
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          {logoSrc && (
            <img
              src={logoSrc}
              alt={businessName}
              style={{
                maxHeight: "60px",
                maxWidth: "200px",
                objectFit: "contain",
                marginBottom: "12px",
              }}
            />
          )}
          {businessName && (
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "800",
                color: "#18181b",
                margin: "0 0 4px",
              }}
            >
              {businessName}
            </h1>
          )}
        </div>

        {/* Step progress */}
        <StepProgress currentStep={currentStep} />

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
