import jsPDF from "jspdf";

function asMoney(value) {
  const n = Number(value || 0);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function asMoneyNoCents(value) {
  const n = Number(value || 0);
  return `$${Number.isFinite(n) ? n.toFixed(0) : "0"}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
}

function formatAuDateDots(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

async function fetchImageAsDataUrl(url) {
  const src = String(url || "").trim();
  if (!src) return null;

  if (/^data:image\//i.test(src)) {
    const m = src.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
    const type = String(m?.[1] || "").toLowerCase();
    const format =
      type.includes("png") ? "PNG" :
        (type.includes("jpeg") || type.includes("jpg")) ? "JPEG" :
          null;
    if (!format) return null;
    return { dataUrl: src, format, contentType: type };
  }

  if (!/^https?:\/\//i.test(src)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(src, { signal: controller.signal });
    if (!res.ok) return null;
    const type = String(res.headers.get("content-type") || "").toLowerCase();
    if (!type.startsWith("image/")) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1_500_000) return null; // keep PDFs small

    const b64 = buf.toString("base64");
    const format =
      type.includes("png") ? "PNG" :
        (type.includes("jpeg") || type.includes("jpg")) ? "JPEG" :
          null;
    if (!format) return null;
    return { dataUrl: `data:${type};base64,${b64}`, format, contentType: type };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeDataUrlBase64(dataUrl) {
  const s = String(dataUrl || "");
  const idx = s.indexOf("base64,");
  if (idx < 0) return null;
  const b64 = s.slice(idx + "base64,".length);
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function getImageDimensions(asset) {
  if (!asset?.dataUrl || !asset?.format) return null;
  const buf = decodeDataUrlBase64(asset.dataUrl);
  if (!buf || buf.length < 32) return null;

  if (asset.format === "PNG") {
    // PNG: width/height at IHDR (offset 16/20)
    try {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (!width || !height) return null;
      return { width, height };
    } catch {
      return null;
    }
  }

  if (asset.format === "JPEG") {
    // JPEG: parse markers until SOF0/SOF2
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) return null;
      const marker = buf[offset + 1];
      // SOI/EOI or fill bytes
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const len = buf.readUInt16BE(offset + 2);
      if (len < 2) return null;
      const isSof = marker === 0xc0 || marker === 0xc2;
      if (isSof && offset + 2 + len <= buf.length) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        if (!width || !height) return null;
        return { width, height };
      }
      offset += 2 + len;
    }
  }

  return null;
}

function drawLogo(doc, asset, box) {
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

export async function generateInvoicePdfBase64({ booking, business, template }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 72;

  const logoUrl = String(template?.logo_url || business?.logo_url || "").trim();
  const logoAsset = await fetchImageAsDataUrl(logoUrl);

  const invoiceNo = booking?.invoice_id || `INV-${String(booking?.id || "").slice(0, 8).toUpperCase()}`;
  const invoiceDate = booking?.invoice_date || new Date().toISOString();
  const dueDate = booking?.due_date || "";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(80);
  doc.text("INVOICE", marginX, 112);

  // Logo (top-right)
  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: pageW - marginX - 140, y: 70, w: 140, h: 70 });
    } catch {
      // ignore
    }
  }

  // Left business block
  const leftBlockY = 180;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("ABN:", marginX, leftBlockY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  const businessLines = [
    String(business?.business_name || "").toUpperCase(),
    String(business?.abn || ""),
    String(business?.business_address || "").trim(),
  ]
    .flatMap((v) => String(v || "").split("\n"))
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  businessLines.forEach((line, idx) => {
    doc.text(line, marginX, leftBlockY + 18 + idx * 14);
  });

  // Issued to
  const issuedToY = 270;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("ISSUED TO:", marginX, issuedToY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  const issuedLines = [
    booking?.customer_name,
    booking?.event_location,
    booking?.customer_email,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  issuedLines.forEach((line, idx) => {
    doc.text(line, marginX, issuedToY + 18 + idx * 14);
  });

  // Invoice meta (right)
  const metaX = pageW - marginX - 170;
  const metaRight = pageW - marginX;
  const metaY = 270;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("INVOICE NO:", metaX, metaY);
  doc.text("DATE:", metaX, metaY + 18);
  doc.text("DUE DATE:", metaX, metaY + 36);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(String(invoiceNo), metaRight, metaY, { align: "right" });
  doc.text(formatAuDateDots(invoiceDate) || formatDate(invoiceDate), metaRight, metaY + 18, { align: "right" });
  if (dueDate) doc.text(formatAuDateDots(dueDate) || formatDate(dueDate), metaRight, metaY + 36, { align: "right" });

  // Table
  const tableTopY = 395;
  const lineX1 = marginX;
  const lineX2 = pageW - marginX;

  doc.setDrawColor(220);
  doc.setLineWidth(1);
  doc.line(lineX1, tableTopY - 20, lineX2, tableTopY - 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("DESCRIPTION", marginX, tableTopY);
  doc.text("RATE", 340, tableTopY);
  doc.text("QTY", 430, tableTopY);
  doc.text("TOTAL", lineX2, tableTopY, { align: "right" });

  doc.line(lineX1, tableTopY + 12, lineX2, tableTopY + 12);

  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const total = unit * qty;

  const hours = booking?.duration_minutes ? Math.round((Number(booking.duration_minutes) / 60) * 10) / 10 : null;
  const description =
    booking?.package_duration ||
    (hours ? `${hours} Hour Photobooth` : "") ||
    booking?.service_type ||
    booking?.booth_type ||
    "Booking";

  const rowY = tableTopY + 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(String(description), marginX, rowY);
  doc.text(String(Number.isFinite(unit) ? unit.toFixed(0) : "0"), 340, rowY);
  doc.text(String(qty), 430, rowY);
  doc.text(asMoneyNoCents(total), lineX2, rowY, { align: "right" });

  // Totals block
  const totalsY = 585;
  doc.setDrawColor(230);
  doc.line(lineX1, totalsY - 20, lineX2, totalsY - 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("SUBTOTAL", marginX, totalsY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(asMoneyNoCents(total), lineX2, totalsY, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("TOTAL", lineX2 - 90, totalsY + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(asMoneyNoCents(total), lineX2, totalsY + 26, { align: "right" });

  // Payment info
  const payY = 690;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("PAYMENT INFO:", marginX, payY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  const payLines = [
    String(business?.account_name || "").trim(),
    String(business?.bank_name || "").trim(),
    business?.bsb ? `BSB: ${String(business.bsb)}` : "",
    business?.account_number ? `Account number: ${String(business.account_number)}` : "",
  ].filter(Boolean);
  payLines.forEach((line, idx) => {
    doc.text(line, marginX, payY + 16 + idx * 14);
  });

  const paymentLink = String(business?.payment_link || "").trim();
  if (paymentLink) {
    const orY = payY + 16 + payLines.length * 14 + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("OR", marginX, orY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70);
    doc.text(paymentLink, marginX, orY + 18);
  }

  // Signature (stylized)
  doc.setFont("times", "italic");
  doc.setFontSize(34);
  doc.setTextColor(60);
  const signature = String(business?.account_name || business?.business_name || "").trim();
  if (signature) doc.text(signature, lineX2, 780, { align: "right" });

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf).toString("base64");
}
