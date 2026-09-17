// Starter designs. Written as token-bound specs so picking one and choosing a
// booking immediately produces a personalised strip with no typing.

export const STARTER_TEMPLATES = [
  {
    id: "classic_white",
    name: "Classic White",
    occasion: "wedding",
    spec: {
      format: "strip_2x6",
      background: { type: "solid", color: "#ffffff" },
      border: { enabled: true, color: "#d4af37", width: 0.01, inset: 0.022 },
      slotStyle: { radius: 0.05, borderColor: "#ffffff", borderWidth: 0 },
      text: [
        { content: "{{customer_name}}", x: 0.5, y: 0.845, size: 0.033, color: "#1f2937", font: "elegant", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.9, size: 0.021, color: "#6b7280", font: "classic", align: "center", letterSpacing: 0.006, uppercase: true },
        { content: "{{business_name}}", x: 0.5, y: 0.955, size: 0.015, color: "#9ca3af", font: "clean", align: "center", letterSpacing: 0.004, uppercase: true },
      ],
    },
  },
  {
    id: "midnight_gold",
    name: "Midnight Gold",
    occasion: "wedding",
    spec: {
      format: "strip_2x6",
      background: { type: "gradient", color: "#0f172a", colorTo: "#1e293b", angle: 180 },
      border: { enabled: true, color: "#d4af37", width: 0.008, inset: 0.025 },
      slotStyle: { radius: 0.04, borderColor: "#d4af37", borderWidth: 0.004 },
      text: [
        { content: "{{initials}}", x: 0.5, y: 0.84, size: 0.05, color: "#d4af37", font: "script", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.9, size: 0.019, color: "#e2e8f0", font: "clean", align: "center", letterSpacing: 0.008, uppercase: true },
        { content: "{{business_name}}", x: 0.5, y: 0.955, size: 0.014, color: "#64748b", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "blush_floral",
    name: "Blush & Rose",
    occasion: "wedding",
    spec: {
      format: "strip_2x6",
      background: { type: "gradient", color: "#fff1f2", colorTo: "#fce7f3", angle: 160 },
      border: { enabled: true, color: "#f9a8d4", width: 0.007, inset: 0.02 },
      slotStyle: { radius: 0.08, borderColor: "#ffffff", borderWidth: 0.005 },
      text: [
        { content: "{{customer_name}}", x: 0.5, y: 0.85, size: 0.034, color: "#9d174d", font: "script", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.905, size: 0.019, color: "#be185d", font: "classic", align: "center", letterSpacing: 0.005 },
        { content: "{{venue}}", x: 0.5, y: 0.952, size: 0.015, color: "#db2777", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "bold_party",
    name: "Bold Party",
    occasion: "birthday",
    spec: {
      format: "strip_2x6",
      background: { type: "gradient", color: "#7c3aed", colorTo: "#db2777", angle: 155 },
      border: { enabled: false, color: "#ffffff", width: 0.01, inset: 0.02 },
      slotStyle: { radius: 0.1, borderColor: "#ffffff", borderWidth: 0.008 },
      text: [
        { content: "{{event_type}}", x: 0.5, y: 0.835, size: 0.04, color: "#ffffff", font: "bold", align: "center", uppercase: true, letterSpacing: 0.004 },
        { content: "{{customer_name}}", x: 0.5, y: 0.895, size: 0.024, color: "#fbcfe8", font: "modern", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.945, size: 0.016, color: "#f5d0fe", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "corporate_clean",
    name: "Corporate Clean",
    occasion: "corporate",
    spec: {
      format: "strip_2x6",
      background: { type: "solid", color: "#f8fafc" },
      border: { enabled: true, color: "#0f172a", width: 0.006, inset: 0.018 },
      slotStyle: { radius: 0.02, borderColor: "#ffffff", borderWidth: 0 },
      text: [
        { content: "{{business_name}}", x: 0.5, y: 0.85, size: 0.028, color: "#0f172a", font: "modern", align: "center", weight: "bold", letterSpacing: 0.005, uppercase: true },
        { content: "{{event_type}}", x: 0.5, y: 0.905, size: 0.018, color: "#475569", font: "clean", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.95, size: 0.015, color: "#94a3b8", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "formal_night",
    name: "School Formal",
    occasion: "formal",
    spec: {
      format: "strip_2x6",
      background: { type: "gradient", color: "#111827", colorTo: "#4c1d95", angle: 200 },
      border: { enabled: true, color: "#a78bfa", width: 0.007, inset: 0.022 },
      slotStyle: { radius: 0.06, borderColor: "#a78bfa", borderWidth: 0.003 },
      text: [
        { content: "{{event_type}}", x: 0.5, y: 0.845, size: 0.036, color: "#ede9fe", font: "elegant", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.903, size: 0.018, color: "#c4b5fd", font: "clean", align: "center", letterSpacing: 0.007, uppercase: true },
        { content: "{{business_name}}", x: 0.5, y: 0.952, size: 0.014, color: "#8b5cf6", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "postcard_modern",
    name: "Modern Postcard",
    occasion: "wedding",
    spec: {
      format: "postcard_4x6",
      background: { type: "solid", color: "#fafaf9" },
      border: { enabled: true, color: "#292524", width: 0.004, inset: 0.015 },
      slotStyle: { radius: 0.015, borderColor: "#ffffff", borderWidth: 0 },
      text: [
        { content: "{{customer_name}}", x: 0.5, y: 0.815, size: 0.042, color: "#1c1917", font: "elegant", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.875, size: 0.022, color: "#57534e", font: "clean", align: "center", letterSpacing: 0.006, uppercase: true },
        { content: "{{business_name}}", x: 0.5, y: 0.93, size: 0.016, color: "#a8a29e", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
  {
    id: "quad_fun",
    name: "Four-Up Fun",
    occasion: "birthday",
    spec: {
      format: "quad_4x6",
      background: { type: "gradient", color: "#fef3c7", colorTo: "#fed7aa", angle: 140 },
      border: { enabled: true, color: "#f59e0b", width: 0.006, inset: 0.016 },
      slotStyle: { radius: 0.07, borderColor: "#ffffff", borderWidth: 0.006 },
      text: [
        { content: "{{event_type}}", x: 0.5, y: 0.815, size: 0.038, color: "#9a3412", font: "bold", align: "center", uppercase: true },
        { content: "{{customer_name}}", x: 0.5, y: 0.872, size: 0.022, color: "#c2410c", font: "modern", align: "center" },
        { content: "{{event_date}}", x: 0.5, y: 0.925, size: 0.016, color: "#ea580c", font: "clean", align: "center", uppercase: true },
      ],
    },
  },
];

export const TEMPLATE_OCCASIONS = ["wedding", "birthday", "corporate", "formal"];

export function getStarterTemplate(id) {
  return STARTER_TEMPLATES.find((t) => t.id === String(id || "").trim()) || null;
}
