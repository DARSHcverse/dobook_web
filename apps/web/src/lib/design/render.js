// Draws a normalized design spec onto a canvas.
//
// Deliberately written against the plain Canvas 2D API and nothing else, so the
// same function powers the on-screen preview and the print-resolution export.
// One code path means what the operator sees is exactly what prints.
//
// Coordinates in a spec are fractions of the canvas (0-1), so this scales to any
// format or DPI without a second set of measurements.

import { getPrintFormat, resolveFont } from "./specs";

function px(fraction, extent) {
  return fraction * extent;
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawBackground(ctx, spec, W, H) {
  const bg = spec.background;
  if (bg.type === "gradient") {
    // Angle in degrees, 180 = top-to-bottom, matching CSS intuition.
    const rad = ((bg.angle - 90) * Math.PI) / 180;
    const cx = W / 2;
    const cy = H / 2;
    const len = Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad));
    const dx = (Math.cos(rad) * len) / 2;
    const dy = (Math.sin(rad) * len) / 2;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    grad.addColorStop(0, bg.color);
    grad.addColorStop(1, bg.colorTo);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bg.color;
  }
  ctx.fillRect(0, 0, W, H);
}

function drawBorder(ctx, spec, W, H) {
  if (!spec.border.enabled) return;
  const lw = px(spec.border.width, W);
  if (lw <= 0) return;
  const inset = px(spec.border.inset, W);
  ctx.strokeStyle = spec.border.color;
  ctx.lineWidth = lw;
  // Stroke straddles the path, so offset by half the width to stay inside.
  const off = inset + lw / 2;
  ctx.strokeRect(off, off, W - off * 2, H - off * 2);
}

// Punches the photo openings out of the artwork. Booth software composites the
// guest's photos *behind* this PNG, so these regions must be genuinely
// transparent — not white, which would hide the photos entirely.
function cutPhotoSlots(ctx, spec, W, H) {
  const format = getPrintFormat(spec.format);
  const radiusBasis = Math.min(W, H);

  for (const slot of format.slots) {
    const x = px(slot.x, W);
    const y = px(slot.y, H);
    const w = px(slot.w, W);
    const h = px(slot.h, H);
    const r = spec.slotStyle.radius * Math.min(w, h) * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();

    const bw = px(spec.slotStyle.borderWidth, radiusBasis);
    if (bw > 0) {
      ctx.save();
      ctx.strokeStyle = spec.slotStyle.borderColor;
      ctx.lineWidth = bw;
      roundedRectPath(ctx, x - bw / 2, y - bw / 2, w + bw, h + bw, r);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Draws placeholder fills in the photo openings. Preview only — never used for
// export, where those regions must stay transparent.
function drawSlotPlaceholders(ctx, spec, W, H) {
  const format = getPrintFormat(spec.format);
  for (let i = 0; i < format.slots.length; i += 1) {
    const slot = format.slots[i];
    const x = px(slot.x, W);
    const y = px(slot.y, H);
    const w = px(slot.w, W);
    const h = px(slot.h, H);
    const r = spec.slotStyle.radius * Math.min(w, h) * 0.5;

    ctx.save();
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = "rgba(148,163,184,0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(100,116,139,0.55)";
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.setLineDash([W * 0.02, W * 0.014]);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(51,65,85,0.75)";
    ctx.font = `600 ${Math.round(Math.min(w, h) * 0.16)}px ${resolveFont("clean")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PHOTO ${i + 1}`, x + w / 2, y + h / 2);
    ctx.restore();
  }
}

function drawText(ctx, spec, W, H) {
  for (const item of spec.text) {
    const size = Math.max(1, px(item.size, H));
    const weight = item.weight === "bold" ? "700" : "400";
    const style = item.italic ? "italic " : "";
    ctx.save();
    ctx.font = `${style}${weight} ${size}px ${resolveFont(item.font)}`;
    ctx.fillStyle = item.color;
    ctx.textAlign = item.align;
    ctx.textBaseline = "middle";

    const content = item.uppercase ? item.content.toUpperCase() : item.content;
    const x = px(item.x, W);
    const y = px(item.y, H);
    const tracking = px(item.letterSpacing, W);

    if (tracking > 0) {
      // Canvas has no letterSpacing in older engines; draw per character so
      // tracked display type renders identically everywhere.
      const chars = [...content];
      const widths = chars.map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
      let cursor =
        item.align === "center" ? x - total / 2 : item.align === "right" ? x - total : x;
      ctx.textAlign = "left";
      for (let i = 0; i < chars.length; i += 1) {
        ctx.fillText(chars[i], cursor, y);
        cursor += widths[i] + tracking;
      }
    } else {
      ctx.fillText(content, x, y);
    }
    ctx.restore();
  }
}

/**
 * Render a normalized spec onto a canvas context.
 *
 * `mode: "export"` cuts real transparent holes for the photos (what booth
 * software needs). `mode: "preview"` fills them with labelled placeholders so
 * the operator can see the composition on screen.
 */
export function renderDesign(ctx, spec, { width, height, mode = "preview" } = {}) {
  const W = width;
  const H = height;

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, spec, W, H);
  drawBorder(ctx, spec, W, H);

  if (mode === "export") {
    cutPhotoSlots(ctx, spec, W, H);
  } else {
    drawSlotPlaceholders(ctx, spec, W, H);
  }

  // Text last so it is never punched out by the slot cut-through above.
  drawText(ctx, spec, W, H);
  return ctx;
}
