// Starter layouts for the v2 element model.
//
// "Website header" is modelled directly on a real operator's strip: a URL band
// across the very top, three large photos, and a deep footer for the client's
// branding. The old fixed-slot model could not express it at all — text was
// locked to the bottom fifth of the canvas.

export const LAYOUT_TEMPLATES = [
  {
    id: "website_header",
    name: "Website header + 3 photos",
    description: "URL across the top, three large photos, deep branded footer.",
    spec: {
      version: 2,
      format: "strip_2x6",
      background: { type: "solid", color: "#ffffff" },
      elements: [
        {
          type: "text",
          rect: { x: 0.04, y: 0.008, w: 0.92, h: 0.035 },
          content: "WWW.YOURBOOTH.COM.AU",
          size: 0.019,
          color: "#111111",
          font: "clean",
          align: "center",
          weight: "bold",
          letterSpacing: 0.002,
        },
        { type: "photo", rect: { x: 0.035, y: 0.05, w: 0.93, h: 0.245 } },
        { type: "photo", rect: { x: 0.035, y: 0.305, w: 0.93, h: 0.245 } },
        { type: "photo", rect: { x: 0.035, y: 0.56, w: 0.93, h: 0.245 } },
        {
          type: "text",
          rect: { x: 0.06, y: 0.83, w: 0.88, h: 0.07 },
          content: "EVENT NAME",
          size: 0.045,
          color: "#111111",
          font: "bold",
          align: "center",
          weight: "bold",
        },
        {
          type: "text",
          rect: { x: 0.06, y: 0.905, w: 0.88, h: 0.05 },
          content: "2026",
          size: 0.032,
          color: "#111111",
          font: "bold",
          align: "center",
          weight: "bold",
        },
      ],
    },
  },
  {
    id: "logo_footer",
    name: "Logo footer",
    description: "Three photos with a space to drop the client's logo underneath.",
    spec: {
      version: 2,
      format: "strip_2x6",
      background: { type: "solid", color: "#ffffff" },
      elements: [
        { type: "photo", rect: { x: 0.05, y: 0.03, w: 0.9, h: 0.235 } },
        { type: "photo", rect: { x: 0.05, y: 0.278, w: 0.9, h: 0.235 } },
        { type: "photo", rect: { x: 0.05, y: 0.526, w: 0.9, h: 0.235 } },
        // Empty image element: the operator drops a logo straight onto it.
        { type: "image", rect: { x: 0.22, y: 0.79, w: 0.56, h: 0.12 }, src: "", fit: "contain" },
        {
          type: "text",
          rect: { x: 0.06, y: 0.925, w: 0.88, h: 0.04 },
          content: "",
          size: 0.02,
          color: "#6b7280",
          font: "clean",
          align: "center",
          uppercase: true,
          letterSpacing: 0.004,
        },
      ],
    },
  },
  {
    id: "dark_band",
    name: "Dark footer band",
    description: "Photos on white with a solid colour band behind the footer text.",
    spec: {
      version: 2,
      format: "strip_2x6",
      background: { type: "solid", color: "#ffffff" },
      elements: [
        { type: "photo", rect: { x: 0.05, y: 0.025, w: 0.9, h: 0.235 } },
        { type: "photo", rect: { x: 0.05, y: 0.273, w: 0.9, h: 0.235 } },
        { type: "photo", rect: { x: 0.05, y: 0.521, w: 0.9, h: 0.235 } },
        { type: "rect", rect: { x: 0, y: 0.775, w: 1, h: 0.225 }, color: "#111827" },
        {
          type: "text",
          rect: { x: 0.06, y: 0.82, w: 0.88, h: 0.06 },
          content: "EVENT NAME",
          size: 0.038,
          color: "#ffffff",
          font: "modern",
          align: "center",
          weight: "bold",
        },
        {
          type: "text",
          rect: { x: 0.06, y: 0.89, w: 0.88, h: 0.045 },
          content: "",
          size: 0.022,
          color: "#d4d4d8",
          font: "clean",
          align: "center",
          uppercase: true,
          letterSpacing: 0.005,
        },
      ],
    },
  },
  {
    id: "blank_strip",
    name: "Blank strip",
    description: "Three photos and nothing else — build it your own way.",
    spec: {
      version: 2,
      format: "strip_2x6",
      background: { type: "solid", color: "#ffffff" },
      elements: [
        { type: "photo", rect: { x: 0.05, y: 0.03, w: 0.9, h: 0.26 } },
        { type: "photo", rect: { x: 0.05, y: 0.3, w: 0.9, h: 0.26 } },
        { type: "photo", rect: { x: 0.05, y: 0.57, w: 0.9, h: 0.26 } },
      ],
    },
  },
  {
    id: "postcard_logo",
    name: "Postcard + logo",
    description: 'One large photo on a 4"x6" postcard with a branded footer.',
    spec: {
      version: 2,
      format: "postcard_4x6",
      background: { type: "solid", color: "#ffffff" },
      elements: [
        { type: "photo", rect: { x: 0.05, y: 0.04, w: 0.9, h: 0.68 } },
        { type: "image", rect: { x: 0.3, y: 0.76, w: 0.4, h: 0.1 }, src: "", fit: "contain" },
        {
          type: "text",
          rect: { x: 0.06, y: 0.88, w: 0.88, h: 0.05 },
          content: "EVENT NAME",
          size: 0.028,
          color: "#111111",
          font: "modern",
          align: "center",
          weight: "bold",
          letterSpacing: 0.004,
        },
      ],
    },
  },
];

export function getLayoutTemplate(id) {
  return LAYOUT_TEMPLATES.find((t) => t.id === String(id || "").trim()) || null;
}
