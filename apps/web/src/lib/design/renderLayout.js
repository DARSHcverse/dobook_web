// Renders a v2 layout spec (free-positioned elements) onto a canvas.
//
// Same contract as the v1 renderer: one code path drives both the on-screen
// preview and the print export, so what the operator sees is what prints. Only
// photo slots differ — placeholders on screen, genuine transparency on export,
// because booth software composites the guest photos behind this PNG.

import { resolveFont } from "./specs";

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

function rectPx(el, W, H) {
  return {
    x: el.rect.x * W,
    y: el.rect.y * H,
    w: el.rect.w * W,
    h: el.rect.h * H,
  };
}

function luminance(hex) {
  const s = String(hex || "").replace("#", "");
  const f = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const r = parseInt(f.slice(0, 2), 16);
  const g = parseInt(f.slice(2, 4), 16);
  const b = parseInt(f.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function drawBackground(ctx, spec, W, H) {
  const bg = spec.background;
  if (bg.type === "gradient") {
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

// Wraps to the element's width and truncates once it runs out of height, so a
// long line can never bleed off the edge of a print.
function layoutLines(ctx, text, maxWidth, maxLines) {
  const paragraphs = String(text ?? "").split("\n");
  const lines = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of para.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length >= maxLines) break;
  }
  return lines.slice(0, Math.max(1, maxLines));
}

function drawTextElement(ctx, el, W, H) {
  const { x, y, w, h } = rectPx(el, W, H);
  const size = Math.max(1, el.size * H);
  const weight = el.weight === "bold" ? "700" : "400";
  const style = el.italic ? "italic " : "";

  ctx.save();
  ctx.font = `${style}${weight} ${size}px ${resolveFont(el.font)}`;
  ctx.fillStyle = el.color;
  ctx.textBaseline = "middle";

  const content = el.uppercase ? String(el.content).toUpperCase() : String(el.content);
  const lineH = size * el.lineHeight;
  const maxLines = Math.max(1, Math.floor(h / lineH));
  const tracking = el.letterSpacing * W;

  // Tracking widens text beyond what measureText reports, so wrap against the
  // reduced width to keep tracked display type inside its box.
  const perChar = tracking;
  const wrapWidth = Math.max(1, w - perChar * 2);
  const lines = layoutLines(ctx, content, wrapWidth, maxLines);

  // Vertically centre the block within the element.
  const blockH = lines.length * lineH;
  let cursorY = y + h / 2 - blockH / 2 + lineH / 2;

  for (const line of lines) {
    let drawX;
    if (el.align === "left") drawX = x;
    else if (el.align === "right") drawX = x + w;
    else drawX = x + w / 2;

    if (tracking > 0) {
      const chars = [...line];
      const widths = chars.map((c) => ctx.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);
      let cx = el.align === "left" ? x : el.align === "right" ? x + w - total : x + w / 2 - total / 2;
      ctx.textAlign = "left";
      for (let i = 0; i < chars.length; i += 1) {
        ctx.fillText(chars[i], cx, cursorY);
        cx += widths[i] + tracking;
      }
    } else {
      ctx.textAlign = el.align;
      ctx.fillText(line, drawX, cursorY);
    }
    cursorY += lineH;
  }
  ctx.restore();
}

function drawRectElement(ctx, el, W, H) {
  const { x, y, w, h } = rectPx(el, W, H);
  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.fillStyle = el.color;
  roundedRectPath(ctx, x, y, w, h, el.radius * Math.min(w, h) * 0.5);
  ctx.fill();
  ctx.restore();
}

// Images are drawn from a cache the caller populates (loadSpecImages), because
// canvas drawing is synchronous but image decoding is not.
function drawImageElement(ctx, el, W, H, images) {
  const img = images?.get(el.src);
  const { x, y, w, h } = rectPx(el, W, H);

  if (!img) {
    // Placeholder while the image loads or if it failed — never silently blank,
    // so the operator can see something is meant to be there.
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.8)";
    ctx.setLineDash([Math.max(2, W * 0.012), Math.max(2, W * 0.008)]);
    ctx.lineWidth = Math.max(1, W * 0.003);
    roundedRectPath(ctx, x, y, w, h, 4);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = el.opacity;
  roundedRectPath(ctx, x, y, w, h, el.radius * Math.min(w, h) * 0.5);
  ctx.clip();

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  // contain keeps a logo undistorted; cover fills the box and crops.
  const scale =
    el.fit === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function drawPhotoElement(ctx, el, W, H, mode, darkArtwork, index) {
  const { x, y, w, h } = rectPx(el, W, H);
  const r = el.radius * Math.min(w, h) * 0.5;

  if (mode === "export") {
    // Punch a real hole so the guest's photo shows through. Filling white here
    // would hide the photo entirely — the single worst way this can ship broken.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = darkArtwork ? "rgba(226,232,240,0.30)" : "rgba(148,163,184,0.28)";
    ctx.fill();
    ctx.strokeStyle = darkArtwork ? "rgba(226,232,240,0.55)" : "rgba(100,116,139,0.55)";
    ctx.lineWidth = Math.max(1, W * 0.003);
    ctx.setLineDash([W * 0.02, W * 0.014]);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = darkArtwork ? "rgba(241,245,249,0.85)" : "rgba(51,65,85,0.75)";
    ctx.font = `600 ${Math.round(Math.min(w, h) * 0.18)}px ${resolveFont("clean")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PHOTO ${index}`, x + w / 2, y + h / 2);
    ctx.restore();
  }

  const bw = el.borderWidth * Math.min(W, H);
  if (bw > 0) {
    ctx.save();
    ctx.strokeStyle = el.borderColor;
    ctx.lineWidth = bw;
    roundedRectPath(ctx, x - bw / 2, y - bw / 2, w + bw, h + bw, r);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderLayout(ctx, spec, { width, height, mode = "preview", images } = {}) {
  const W = width;
  const H = height;
  const darkArtwork = luminance(spec.background.color) < 128;

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, spec, W, H);

  // Photos are cut first so later elements (a logo, a caption) can sit on top of
  // a slot edge without being punched away by the transparency cut.
  let photoIndex = 0;
  for (const el of spec.elements) {
    if (el.type !== "photo") continue;
    photoIndex += 1;
    drawPhotoElement(ctx, el, W, H, mode, darkArtwork, photoIndex);
  }

  for (const el of spec.elements) {
    if (el.type === "photo") continue;
    if (el.type === "rect") drawRectElement(ctx, el, W, H);
    else if (el.type === "image") drawImageElement(ctx, el, W, H, images);
    else if (el.type === "text") drawTextElement(ctx, el, W, H);
  }

  return ctx;
}

// Preloads every image element. Resolves even when an image fails so one broken
// URL cannot block the whole render.
export function loadSpecImages(spec) {
  const urls = [
    ...new Set(
      (spec?.elements || [])
        .filter((el) => el.type === "image" && el.src)
        .map((el) => el.src),
    ),
  ];
  if (!urls.length) return Promise.resolve(new Map());

  return Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          // Uploaded logos are served from Supabase storage; without this the
          // canvas becomes tainted and toBlob/toDataURL throw on export.
          img.crossOrigin = "anonymous";
          img.onload = () => resolve([src, img]);
          img.onerror = () => resolve([src, null]);
          img.src = src;
        }),
    ),
  ).then((pairs) => new Map(pairs.filter(([, img]) => img)));
}
