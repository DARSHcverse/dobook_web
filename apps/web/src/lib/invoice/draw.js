import { hexToRgb, clampByte, getImageDimensions } from "./utils";

export function setFillHex(doc, hex, fallback = { r: 0, g: 0, b: 0 }) {
    const rgb = hexToRgb(hex) || fallback;
    doc.setFillColor(clampByte(rgb.r), clampByte(rgb.g), clampByte(rgb.b));
}

export function setTextHex(doc, hex, fallback = { r: 0, g: 0, b: 0 }) {
    const rgb = hexToRgb(hex) || fallback;
    doc.setTextColor(clampByte(rgb.r), clampByte(rgb.g), clampByte(rgb.b));
}

export function setTemplateFont(doc, templateSettings, style = "normal") {
    const family = String(templateSettings?.font_family || "helvetica").trim().toLowerCase() || "helvetica";
    const okFamily = ["helvetica", "times", "courier"].includes(family) ? family : "helvetica";
    const okStyle = ["normal", "bold", "italic", "bolditalic"].includes(style) ? style : "normal";
    try {
        doc.setFont(okFamily, okStyle);
    } catch {
        doc.setFont("helvetica", okStyle);
    }
}

export function resolveLogoBoxPosition({ box, areaLeft, areaRight, position }) {
    const w = Number(box?.w || 0);
    if (!(w > 0) || !(areaRight > areaLeft)) return box;
    if (position === "left") return { ...box, x: areaLeft };
    if (position === "center") return { ...box, x: areaLeft + (areaRight - areaLeft - w) / 2 };
    if (position === "right") return { ...box, x: areaRight - w };
    return box;
}

export function drawInvoiceNotes({ doc, x, y, maxW, text }) {
    const raw = String(text || "").trim();
    if (!raw) return;
    const note = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
    if (!note) return;
    const lines = doc.splitTextToSize(note, maxW).slice(0, 3);
    if (!lines.length) return;
    doc.text(lines, x, y);
}

export function drawInvoiceFooter({ doc, pageW, pageH, text }) {
    const s = String(text || "").trim();
    if (!s) return;
    const y = pageH - 36;
    doc.text(s, pageW / 2, y, { align: "center", maxWidth: pageW - 144 });
}

export function drawSignatureLikeText({ doc, text, xRight, y, maxW }) {
    const raw = String(text || "").trim();
    if (!raw) return;

    // Prefer a classic serif italic for the signature regardless of the main template font.
    try {
        doc.setFont("times", "italic");
    } catch {
        doc.setFont("helvetica", "italic");
    }

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const targetW = clamp(Number(maxW || 0) || 260, 160, 360);

    let size = 26;
    doc.setFontSize(size);
    let w = 0;
    try {
        w = doc.getTextWidth(raw);
    } catch {
        w = 0;
    }

    if (w > targetW) {
        const next = Math.floor(size * (targetW / w));
        size = clamp(next, 14, 26);
        doc.setFontSize(size);
    }

    doc.setTextColor(70);
    doc.text(raw, xRight, y, { align: "right" });
}

export function drawLogo(doc, asset, box) {
    if (!asset?.dataUrl || !asset?.format) return;
    const dims = getImageDimensions(asset);
    const iw = dims?.width || 1;
    const ih = dims?.height || 1;
    const scale = Math.min(box.w / iw, box.h / ih);
    const w = iw * scale;
    const h = ih * scale;
    const x = box.x + (box.w - w) / 2;
    const y = box.y + (box.h - h) / 2;
    doc.addImage(asset.dataUrl, asset.format, x, y, w, h);
}
