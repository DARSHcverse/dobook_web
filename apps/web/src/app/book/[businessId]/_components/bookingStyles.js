// Shared premium design tokens for the booking flow. Import these instead of
// re-deriving inline styles per page, so every step looks like one system.

export const bk = {
  // Surfaces
  card: {
    background: "#fff",
    borderRadius: "20px",
    border: "1px solid #ececef",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px -16px rgba(0,0,0,0.12)",
    padding: "22px",
  },
  cardTight: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #ececef",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    padding: "18px",
  },

  // Typography
  h2: {
    fontFamily: "Manrope",
    fontSize: "20px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#18181b",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#52525b",
  },
  muted: {
    fontSize: "13px",
    color: "#a1a1aa",
  },
  price: {
    fontFamily: "Manrope",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#e11d48",
  },

  // Interactive
  primaryBtn: {
    background: "#e11d48",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "14px 22px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 16px -6px rgba(225,29,72,0.5)",
    transition: "background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#3f3f46",
    border: "1px solid #e4e4e7",
    borderRadius: "14px",
    padding: "14px 22px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease, border-color 0.15s ease",
  },

  // Selectable option (add-on / choice rows)
  option: (checked) => ({
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 18px",
    borderRadius: "16px",
    border: checked ? "1.5px solid #e11d48" : "1.5px solid #ececef",
    background: checked ? "#fff5f7" : "#fff",
    boxShadow: checked ? "0 4px 14px -6px rgba(225,29,72,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
    cursor: "pointer",
    transition: "border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
  }),
};

// Hover handlers for the primary button (adds depth + press feedback).
export const primaryBtnHandlers = {
  onMouseEnter: (e) => { e.currentTarget.style.background = "#be123c"; e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(190,18,60,0.55)"; },
  onMouseLeave: (e) => { e.currentTarget.style.background = "#e11d48"; e.currentTarget.style.boxShadow = "0 6px 16px -6px rgba(225,29,72,0.5)"; },
  onMouseDown: (e) => (e.currentTarget.style.transform = "scale(0.98)"),
  onMouseUp: (e) => (e.currentTarget.style.transform = "scale(1)"),
};
