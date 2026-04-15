"use client";

const STEPS = [
  { num: 1, label: "Booth Type" },
  { num: 2, label: "Package" },
  { num: 3, label: "Details" },
  { num: 4, label: "Add-Ons" },
  { num: 5, label: "Review" },
];

export function StepProgress({ currentStep }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0",
        marginBottom: "28px",
        overflowX: "auto",
        padding: "4px 0",
      }}
    >
      {STEPS.map((step, idx) => {
        const done = step.num < currentStep;
        const active = step.num === currentStep;
        return (
          <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: done ? "#e11d48" : active ? "#e11d48" : "#e4e4e7",
                  color: done || active ? "#fff" : "#a1a1aa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : step.num}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: active ? "700" : "500",
                  color: active ? "#18181b" : done ? "#e11d48" : "#a1a1aa",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                style={{
                  width: "32px",
                  height: "2px",
                  background: done ? "#e11d48" : "#e4e4e7",
                  margin: "0 2px",
                  marginBottom: "18px",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
