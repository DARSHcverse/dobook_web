// Monograms — the decorative initials graphic used on 360 booths, mirror
// booths, and as a screen/backdrop overlay at weddings and quinceañeras.
//
// Deliberately a separate spec type from a photo strip rather than another entry
// in PRINT_FORMATS: a monogram has no photo slots at all. Its whole canvas is
// artwork, exported with a transparent background so it can be laid over live
// video or a printed backdrop.

import { FONT_KEYS, resolveFont, safeColor } from "./specs";

export const MONOGRAM_DPI = 300;

// Square for booth screens; the wide size suits a projected or printed banner.
export const MONOGRAM_SIZES = {
  square_6: { id: "square_6", label: 'Square (6" × 6")', widthIn: 6, heightIn: 6 },
  square_10: { id: "square_10", label: 'Large square (10" × 10")', widthIn: 10, heightIn: 10 },
  wide_12x6: { id: "wide_12x6", label: 'Banner (12" × 6")', widthIn: 12, heightIn: 6 },
};

export const MONOGRAM_SIZE_IDS = Object.keys(MONOGRAM_SIZES);
export const DEFAULT_MONOGRAM_SIZE = "square_6";

export function getMonogramSize(id) {
  return MONOGRAM_SIZES[String(id || "").trim()] || MONOGRAM_SIZES[DEFAULT_MONOGRAM_SIZE];
}

export function monogramPixelSize(sizeId, dpi = MONOGRAM_DPI) {
  const s = getMonogramSize(sizeId);
  return { width: Math.round(s.widthIn * dpi), height: Math.round(s.heightIn * dpi) };
}

// Frames are drawn geometrically rather than shipped as artwork, so they stay
// crisp at any size and recolour with the palette.
export const FRAME_STYLES = {
  none: "No frame",
  circle: "Circle",
  double_circle: "Double circle",
  diamond: "Diamond",
  laurel: "Laurel wreath",
  art_deco: "Art deco",
  arch: "Arch",
};

export const FRAME_STYLE_IDS = Object.keys(FRAME_STYLES);

function clamp01(n, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function safeText(v, max = 60) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

// Same contract as normalizeDesignSpec: everything that reaches the renderer has
// already been clamped, so the drawing code never validates.
export function normalizeMonogramSpec(input) {
  const raw = input && typeof input === "object" ? input : {};
  const size = getMonogramSize(raw.size);

  return {
    size: size.id,
    transparent: raw.transparent !== false,
    background: safeColor(raw.background, "#ffffff"),
    // Generous cap: this holds either short initials ("S & J") or a token like
    // {{customer_name}}, which is itself 15 characters. Truncating to the length
    // of the *rendered* value would corrupt the token before it resolves.
    initials: safeText(raw.initials, 64) || "{{initials}}",
    initialsFont: FONT_KEYS.includes(raw.initialsFont) ? raw.initialsFont : "elegant",
    initialsColor: safeColor(raw.initialsColor, "#1f2937"),
    initialsSize: clamp01(raw.initialsSize, 0.26) || 0.26,
    initialsSpacing: clamp01(raw.initialsSpacing, 0.01),
    topText: safeText(raw.topText, 64),
    bottomText: safeText(raw.bottomText, 64),
    subFont: FONT_KEYS.includes(raw.subFont) ? raw.subFont : "clean",
    subColor: safeColor(raw.subColor, "#6b7280"),
    subSize: clamp01(raw.subSize, 0.045) || 0.045,
    subSpacing: clamp01(raw.subSpacing, 0.008),
    subUppercase: raw.subUppercase !== false,
    frame: FRAME_STYLE_IDS.includes(raw.frame) ? raw.frame : "circle",
    frameColor: safeColor(raw.frameColor, "#d4af37"),
    frameWidth: clamp01(raw.frameWidth, 0.006) || 0.006,
  };
}

// ---------------------------------------------------------------------------
// Frame drawing. All geometry is relative to the shorter canvas side so a frame
// keeps its proportions on both square and banner sizes.
// ---------------------------------------------------------------------------

function strokeCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLaurel(ctx, cx, cy, r, lw) {
  // Two mirrored sprigs sweeping up each side from the bottom, leaving a gap at
  // the top — the classic wedding wreath. Angles are measured from the bottom of
  // the circle (90 deg) so the two halves stay symmetric about the vertical.
  const leaves = 10;
  const START = 0.12; // radians up from bottom centre — small gap at the base
  const SWEEP = 2.1; // how far around each side the sprig travels

  for (const dir of [-1, 1]) {
    for (let i = 0; i < leaves; i += 1) {
      const t = i / (leaves - 1);
      const angle = Math.PI / 2 + dir * (START + t * SWEEP);
      const lx = cx + Math.cos(angle) * r;
      const ly = cy + Math.sin(angle) * r;
      // Leaves taper towards the open top of the wreath.
      const leafLen = r * (0.19 - t * 0.075);
      const leafWide = leafLen * 0.40;

      ctx.save();
      ctx.translate(lx, ly);
      // Point each leaf outward along the radius, angled back along the sweep.
      ctx.rotate(angle + Math.PI / 2 - dir * 0.55);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(leafWide, -leafLen * 0.5, 0, -leafLen);
      ctx.quadraticCurveTo(-leafWide, -leafLen * 0.5, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  // Stem arc under the leaves, matching the same sweep.
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2 - (START + SWEEP), Math.PI / 2 + (START + SWEEP));
  ctx.stroke();
}

function drawArtDeco(ctx, cx, cy, r, lw) {
  // Stepped chevrons above and below with vertical rules either side.
  ctx.lineWidth = lw;
  for (const dir of [-1, 1]) {
    for (let step = 0; step < 3; step += 1) {
      const y = cy + dir * (r * (0.72 + step * 0.09));
      const halfW = r * (0.55 - step * 0.14);
      ctx.beginPath();
      ctx.moveTo(cx - halfW, y);
      ctx.lineTo(cx, y + dir * r * 0.07);
      ctx.lineTo(cx + halfW, y);
      ctx.stroke();
    }
  }
  for (const dir of [-1, 1]) {
    const x = cx + dir * r * 0.86;
    ctx.beginPath();
    ctx.moveTo(x, cy - r * 0.5);
    ctx.lineTo(x, cy + r * 0.5);
    ctx.stroke();
  }
}

function drawFrame(ctx, spec, W, H) {
  if (spec.frame === "none") return;

  const basis = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const r = basis * 0.38;
  const lw = Math.max(1, spec.frameWidth * basis);

  ctx.save();
  ctx.strokeStyle = spec.frameColor;
  ctx.fillStyle = spec.frameColor;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (spec.frame) {
    case "circle":
      strokeCircle(ctx, cx, cy, r);
      break;
    case "double_circle":
      strokeCircle(ctx, cx, cy, r);
      ctx.lineWidth = lw * 0.5;
      strokeCircle(ctx, cx, cy, r * 0.9);
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.stroke();
      break;
    case "laurel":
      drawLaurel(ctx, cx, cy, r, lw);
      break;
    case "art_deco":
      drawArtDeco(ctx, cx, cy, r, lw);
      break;
    case "arch": {
      // Rounded top, straight sides — reads as a doorway/backdrop shape.
      const halfW = r * 0.78;
      const top = cy - r;
      const bottom = cy + r;
      ctx.beginPath();
      ctx.moveTo(cx - halfW, bottom);
      ctx.lineTo(cx - halfW, top + halfW);
      ctx.arc(cx, top + halfW, halfW, Math.PI, 0);
      ctx.lineTo(cx + halfW, bottom);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawTracked(ctx, text, cx, y, tracking) {
  const chars = [...text];
  if (!tracking) {
    ctx.fillText(text, cx, y);
    return;
  }
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let cursor = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i += 1) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + tracking;
  }
  ctx.textAlign = prevAlign;
}

// Shrinks text until it fits, rather than truncating — a monogram's initials
// are the whole point, so they must always be readable in full.
function fitFontSize(ctx, text, maxWidth, startPx, fontKey, tracking) {
  let size = startPx;
  for (let i = 0; i < 24; i += 1) {
    ctx.font = `${Math.round(size)}px ${resolveFont(fontKey)}`;
    const chars = [...text];
    const w =
      chars.reduce((a, c) => a + ctx.measureText(c).width, 0) +
      tracking * Math.max(0, chars.length - 1);
    if (w <= maxWidth) break;
    size *= 0.92;
  }
  return size;
}

/**
 * Render a normalized monogram spec.
 *
 * `mode: "export"` leaves the background transparent unless the spec opts into
 * a solid fill — a monogram is usually laid over live video or a backdrop.
 */
export function renderMonogram(ctx, spec, { width, height, mode = "preview" } = {}) {
  const W = width;
  const H = height;
  const basis = Math.min(W, H);

  ctx.clearRect(0, 0, W, H);

  if (!spec.transparent) {
    ctx.fillStyle = spec.background;
    ctx.fillRect(0, 0, W, H);
  } else if (mode === "preview") {
    // A checkerboard so the operator can see what will be transparent.
    const cell = Math.max(8, Math.round(basis / 28));
    for (let y = 0; y < H; y += cell) {
      for (let x = 0; x < W; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) | 0) % 2 ? "#ffffff" : "#eef1f5";
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }

  drawFrame(ctx, spec, W, H);

  const cx = W / 2;
  const cy = H / 2;

  // Initials — the focal point.
  ctx.save();
  ctx.fillStyle = spec.initialsColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tracking = spec.initialsSpacing * basis;
  const maxInitialsWidth = basis * (spec.frame === "none" ? 0.82 : 0.56);
  const size = fitFontSize(
    ctx,
    spec.initials,
    maxInitialsWidth,
    spec.initialsSize * basis,
    spec.initialsFont,
    tracking,
  );
  ctx.font = `${Math.round(size)}px ${resolveFont(spec.initialsFont)}`;
  drawTracked(ctx, spec.initials, cx, cy, tracking);
  ctx.restore();

  // Supporting lines above and below the initials.
  const subSize = Math.max(1, spec.subSize * basis);
  const subTracking = spec.subSpacing * basis;
  ctx.save();
  ctx.fillStyle = spec.subColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(subSize)}px ${resolveFont(spec.subFont)}`;

  if (spec.topText) {
    const t = spec.subUppercase ? spec.topText.toUpperCase() : spec.topText;
    drawTracked(ctx, t, cx, cy - basis * 0.22, subTracking);
  }
  if (spec.bottomText) {
    const t = spec.subUppercase ? spec.bottomText.toUpperCase() : spec.bottomText;
    drawTracked(ctx, t, cx, cy + basis * 0.22, subTracking);
  }
  ctx.restore();

  return ctx;
}

// Starter monograms. Token-bound so choosing one immediately personalises it.
export const MONOGRAM_TEMPLATES = [
  {
    id: "classic_wreath",
    name: "Classic Wreath",
    spec: {
      size: "square_6",
      initials: "{{initials}}",
      initialsFont: "elegant",
      initialsColor: "#1f2937",
      frame: "laurel",
      frameColor: "#8a9a7b",
      bottomText: "{{event_date}}",
      subColor: "#6b7280",
    },
  },
  {
    id: "gold_deco",
    name: "Gold Deco",
    spec: {
      size: "square_6",
      initials: "{{initials}}",
      initialsFont: "elegant",
      initialsColor: "#d4af37",
      frame: "art_deco",
      frameColor: "#d4af37",
      topText: "{{event_type}}",
      bottomText: "{{event_date}}",
      subColor: "#d4af37",
      transparent: true,
    },
  },
  {
    id: "simple_circle",
    name: "Simple Circle",
    spec: {
      size: "square_6",
      initials: "{{initials}}",
      initialsFont: "script",
      initialsColor: "#111827",
      frame: "double_circle",
      frameColor: "#111827",
      bottomText: "{{event_date}}",
      subColor: "#4b5563",
    },
  },
  {
    id: "quince_rose",
    name: "Quinceañera Rose",
    spec: {
      size: "square_6",
      initials: "{{initials}}",
      initialsFont: "script",
      initialsColor: "#be185d",
      frame: "diamond",
      frameColor: "#f9a8d4",
      topText: "Mis Quince",
      bottomText: "{{event_date}}",
      subColor: "#db2777",
    },
  },
  {
    id: "arch_modern",
    name: "Modern Arch",
    spec: {
      size: "square_6",
      initials: "{{initials}}",
      initialsFont: "modern",
      initialsColor: "#0f172a",
      initialsSpacing: 0.02,
      frame: "arch",
      frameColor: "#0f172a",
      bottomText: "{{event_date}}",
      subColor: "#475569",
    },
  },
  {
    id: "banner_names",
    name: "Name Banner",
    spec: {
      size: "wide_12x6",
      initials: "{{customer_name}}",
      initialsFont: "script",
      initialsColor: "#1f2937",
      initialsSize: 0.16,
      frame: "none",
      bottomText: "{{event_date}}",
      subColor: "#6b7280",
      subSize: 0.035,
    },
  },
];

export function getMonogramTemplate(id) {
  return MONOGRAM_TEMPLATES.find((t) => t.id === String(id || "").trim()) || null;
}

// Monograms use the same {{token}} vocabulary as strip designs.
export function resolveMonogramTokens(spec, values) {
  const apply = (text) => {
    let out = String(text ?? "");
    for (const [k, v] of Object.entries(values || {})) {
      if (out.includes(k)) out = out.split(k).join(v ?? "");
    }
    return out.trim();
  };
  return {
    ...spec,
    initials: apply(spec.initials),
    topText: apply(spec.topText),
    bottomText: apply(spec.bottomText),
  };
}
