import jsPDF from "jspdf";

function asMoney(value) {
  const n = Number(value || 0);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function asMoneyNoCents(value) {
  const n = Number(value || 0);
  return `$${Number.isFinite(n) ? n.toFixed(0) : "0"}`;
}

function clampByte(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex) {
  const s = String(hex || "").trim();
  const m = s.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  // eslint-disable-next-line no-bitwise
  const r = (n >> 16) & 255;
  // eslint-disable-next-line no-bitwise
  const g = (n >> 8) & 255;
  // eslint-disable-next-line no-bitwise
  const b = n & 255;
  return { r, g, b };
}

function setFillHex(doc, hex, fallback = { r: 0, g: 0, b: 0 }) {
  const rgb = hexToRgb(hex) || fallback;
  doc.setFillColor(clampByte(rgb.r), clampByte(rgb.g), clampByte(rgb.b));
}

function setTextHex(doc, hex, fallback = { r: 0, g: 0, b: 0 }) {
  const rgb = hexToRgb(hex) || fallback;
  doc.setTextColor(clampByte(rgb.r), clampByte(rgb.g), clampByte(rgb.b));
}

function formatHours(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
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

function commonInvoiceData({ booking, business }) {
  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const total = unit * qty;

  const booth = String(booking?.booth_type || booking?.service_type || "Booking").trim() || "Booking";
  const hoursRaw = booking?.duration_minutes ? Number(booking.duration_minutes) / 60 : 0;
  const hours = formatHours(hoursRaw) || "1";
  const hourLabel = Number(hours) === 1 ? "Hour" : "Hours";
  const description = `${hours} ${hourLabel} ${booth}`;

  const invoiceNo = booking?.invoice_id || `INV-${String(booking?.id || "").slice(0, 8).toUpperCase()}`;
  const invoiceDate = booking?.invoice_date || new Date().toISOString();
  const dueDate = booking?.due_date || booking?.booking_date || "";

  const businessName = String(business?.business_name || "").trim() || "Business";
  const businessAddress = String(business?.business_address || "").trim();
  const businessEmail = String(business?.email || "").trim();

  const customerName = String(booking?.customer_name || "").trim() || "Customer";
  const customerEmail = String(booking?.customer_email || "").trim();

  const bankLines = [
    String(business?.account_name || "").trim(),
    String(business?.bank_name || "").trim(),
    business?.bsb ? `BSB: ${String(business.bsb)}` : "",
    business?.account_number ? `Account number: ${String(business.account_number)}` : "",
  ].filter(Boolean);

  const paymentLink = String(business?.payment_link || "").trim();

  return {
    qty,
    unit,
    total,
    description,
    invoiceNo,
    invoiceDate,
    dueDate,
    businessName,
    businessAddress,
    businessEmail,
    customerName,
    customerEmail,
    bankLines,
    paymentLink,
  };
}

function formatDateShort(value) {
  return formatAuDateDots(value) || formatDate(value);
}

function renderClassic({ doc, pageW, marginX, booking, business, logoAsset, accentHex }) {
  const d = commonInvoiceData({ booking, business });
  const lineX1 = marginX;
  const lineX2 = pageW - marginX;

  // Top accent
  setFillHex(doc, accentHex, { r: 225, g: 29, b: 72 });
  doc.rect(0, 0, pageW, 18, "F");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setTextHex(doc, "#3f3f46", { r: 80, g: 80, b: 80 });
  doc.text("INVOICE", marginX, 112);

  // Logo (top-right)
  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: pageW - marginX - 140, y: 40, w: 140, h: 70 });
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
  doc.text(String(d.invoiceNo), metaRight, metaY, { align: "right" });
  doc.text(formatDateShort(d.invoiceDate), metaRight, metaY + 18, { align: "right" });
  if (d.dueDate) doc.text(formatDateShort(d.dueDate), metaRight, metaY + 36, { align: "right" });

  // Table
  const tableTopY = 395;
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

  const rowY = tableTopY + 44;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(String(d.description), marginX, rowY);
  doc.text(String(Number.isFinite(d.unit) ? d.unit.toFixed(0) : "0"), 340, rowY);
  doc.text(String(d.qty), 430, rowY);
  doc.text(asMoneyNoCents(d.total), lineX2, rowY, { align: "right" });

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
  doc.text(asMoneyNoCents(d.total), lineX2, totalsY, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("TOTAL", lineX2 - 90, totalsY + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(asMoneyNoCents(d.total), lineX2, totalsY + 26, { align: "right" });

  // Payment info
  const payY = 690;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("PAYMENT INFO:", marginX, payY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  d.bankLines.forEach((line, idx) => {
    doc.text(line, marginX, payY + 16 + idx * 14);
  });

  if (d.paymentLink) {
    const orY = payY + 16 + d.bankLines.length * 14 + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("OR", marginX, orY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70);
    doc.text(d.paymentLink, marginX, orY + 18);
  }

  // Signature (stylized)
  doc.setFont("times", "italic");
  doc.setFontSize(34);
  doc.setTextColor(60);
  const signature = String(business?.account_name || business?.business_name || "").trim();
  if (signature) doc.text(signature, lineX2, 780, { align: "right" });
}

function renderClean({ doc, pageW, pageH, marginX, booking, business, logoAsset, accentHex }) {
  const d = commonInvoiceData({ booking, business });
  const lineX2 = pageW - marginX;
  const top = 54;

  // Card background
  doc.setDrawColor(228);
  setFillHex(doc, "#ffffff", { r: 255, g: 255, b: 255 });
  doc.roundedRect(marginX - 18, 36, pageW - (marginX - 18) * 2, pageH - 72, 12, 12, "FD");

  // Header blocks
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24);
  doc.text(d.businessName, marginX, top);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (d.businessAddress) doc.text(d.businessAddress, marginX, top + 16);
  if (d.businessEmail) doc.text(d.businessEmail, marginX, top + 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text("INVOICE", lineX2, top, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(`#${d.invoiceNo}`, lineX2, top + 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Date: ${formatDateShort(d.invoiceDate)}`, lineX2, top + 34, { align: "right" });
  doc.text(`Due: ${formatDateShort(d.dueDate)}`, lineX2, top + 48, { align: "right" });

  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: lineX2 - 140, y: 40, w: 140, h: 50 });
    } catch {
      // ignore
    }
  }

  // Divider
  doc.setDrawColor(220);
  doc.line(marginX, 120, lineX2, 120);

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text("Bill To:", marginX, 150);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(d.customerName, marginX, 168);
  if (d.customerEmail) doc.text(d.customerEmail, marginX, 184);

  // Table header
  const tableY = 230;
  setFillHex(doc, "#f3f4f6", { r: 243, g: 244, b: 246 });
  doc.rect(marginX, tableY - 16, lineX2 - marginX, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text("DESCRIPTION", marginX + 10, tableY);
  doc.text("QTY", marginX + 330, tableY);
  doc.text("PRICE", marginX + 400, tableY);
  doc.text("TOTAL", lineX2 - 10, tableY, { align: "right" });

  // Row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(d.description, marginX + 10, tableY + 36);
  doc.text(String(d.qty), marginX + 330, tableY + 36);
  doc.text(asMoney(d.unit), marginX + 400, tableY + 36);
  doc.text(asMoney(d.total), lineX2 - 10, tableY + 36, { align: "right" });
  doc.setDrawColor(230);
  doc.line(marginX, tableY + 50, lineX2, tableY + 50);

  // Totals
  const totalsTop = tableY + 92;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Subtotal: ${asMoney(d.total)}`, lineX2 - 10, totalsTop, { align: "right" });
  doc.text(`Tax: ${asMoney(0)}`, lineX2 - 10, totalsTop + 16, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setTextHex(doc, accentHex, { r: 225, g: 29, b: 72 });
  doc.text(`Total: ${asMoney(d.total)}`, lineX2 - 10, totalsTop + 42, { align: "right" });
}

function renderGradient({ doc, pageW, marginX, booking, business, logoAsset }) {
  const d = commonInvoiceData({ booking, business });
  const lineX2 = pageW - marginX;

  // Two-tone header (gradient-like)
  setFillHex(doc, "#e11d48", { r: 225, g: 29, b: 72 });
  doc.rect(0, 0, pageW / 2, 130, "F");
  setFillHex(doc, "#9333ea", { r: 147, g: 51, b: 234 });
  doc.rect(pageW / 2, 0, pageW / 2, 130, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255);
  doc.text("INVOICE", marginX, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`#${d.invoiceNo}`, marginX, 92);

  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: lineX2 - 140, y: 30, w: 140, h: 70 });
    } catch {
      // ignore
    }
  }

  // Body
  const y = 175;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40);
  doc.text(d.businessName, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (d.businessAddress) doc.text(d.businessAddress, marginX, y + 16);

  doc.setTextColor(60);
  doc.text(`Date: ${formatDateShort(d.invoiceDate)}`, lineX2, y, { align: "right" });
  doc.text(`Due: ${formatDateShort(d.dueDate)}`, lineX2, y + 16, { align: "right" });

  doc.setDrawColor(220);
  doc.line(marginX, y + 44, lineX2, y + 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text("Bill To:", marginX, y + 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(d.customerName, marginX, y + 92);

  const tableY = y + 140;
  setFillHex(doc, "#f3f4f6", { r: 243, g: 244, b: 246 });
  doc.rect(marginX, tableY - 16, lineX2 - marginX, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text("DESCRIPTION", marginX + 10, tableY);
  doc.text("AMOUNT", lineX2 - 10, tableY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(d.description, marginX + 10, tableY + 36);
  doc.text(asMoney(d.total), lineX2 - 10, tableY + 36, { align: "right" });
  doc.setDrawColor(230);
  doc.line(marginX, tableY + 50, lineX2, tableY + 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(asMoney(d.total), lineX2 - 10, tableY + 98, { align: "right" });
}

function renderNavy({ doc, pageW, marginX, booking, business, logoAsset }) {
  const d = commonInvoiceData({ booking, business });
  const lineX2 = pageW - marginX;

  setFillHex(doc, "#1e3a8a", { r: 30, g: 58, b: 138 });
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255);
  doc.text("INVOICE", marginX, 72);

  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: lineX2 - 140, y: 24, w: 140, h: 70 });
    } catch {
      // ignore
    }
  }

  const y = 160;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text(d.businessName, marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  if (d.businessAddress) doc.text(d.businessAddress, marginX, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Invoice #: ${d.invoiceNo}`, lineX2, y, { align: "right" });
  doc.text(`Date: ${formatDateShort(d.invoiceDate)}`, lineX2, y + 16, { align: "right" });

  doc.setDrawColor(220);
  doc.line(marginX, y + 40, lineX2, y + 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.text("Customer Details", marginX, y + 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  doc.text(d.customerName, marginX, y + 90);

  const tableY = y + 136;
  setFillHex(doc, "#e5e7eb", { r: 229, g: 231, b: 235 });
  doc.rect(marginX, tableY - 16, lineX2 - marginX, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text("SERVICE", marginX + 10, tableY);
  doc.text("QTY", marginX + 360, tableY);
  doc.text("TOTAL", lineX2 - 10, tableY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(d.description, marginX + 10, tableY + 36);
  doc.text(String(d.qty), marginX + 360, tableY + 36);
  doc.text(asMoney(d.total), lineX2 - 10, tableY + 36, { align: "right" });
  doc.setDrawColor(230);
  doc.line(marginX, tableY + 50, lineX2, tableY + 50);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextHex(doc, "#1e3a8a", { r: 30, g: 58, b: 138 });
  doc.text(`Total: ${asMoney(d.total)}`, lineX2 - 10, tableY + 100, { align: "right" });
}

function renderElegant({ doc, pageW, marginX, booking, business, logoAsset }) {
  const d = commonInvoiceData({ booking, business });
  const lineX2 = pageW - marginX;

  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(30);
  doc.text("INVOICE", pageW / 2, 90, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90);
  doc.text(`#${d.invoiceNo}`, pageW / 2, 112, { align: "center" });

  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: pageW / 2 - 60, y: 22, w: 120, h: 45 });
    } catch {
      // ignore
    }
  }

  doc.setDrawColor(210);
  doc.line(marginX, 150, lineX2, 150);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text(d.businessName, marginX, 182);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  if (d.businessAddress) doc.text(d.businessAddress, marginX, 200);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text("Bill To:", marginX, 250);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text(d.customerName, marginX, 268);

  const tableY = 320;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text("DESCRIPTION", marginX, tableY);
  doc.text("TOTAL", lineX2, tableY, { align: "right" });
  doc.setDrawColor(220);
  doc.line(marginX, tableY + 8, lineX2, tableY + 8);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(d.description, marginX, tableY + 36);
  doc.text(asMoney(d.total), lineX2, tableY + 36, { align: "right" });

  doc.setDrawColor(220);
  doc.line(marginX, tableY + 56, lineX2, tableY + 56);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(`Total Due: ${asMoney(d.total)}`, lineX2, tableY + 110, { align: "right" });
}

function renderSidebar({ doc, pageW, pageH, marginX, booking, business, logoAsset }) {
  const d = commonInvoiceData({ booking, business });
  const sidebarW = 190;
  const lineX2 = pageW - marginX;

  setFillHex(doc, "#111827", { r: 17, g: 24, b: 39 });
  doc.rect(0, 0, sidebarW, pageH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255);
  doc.text(d.businessName, 26, 80, { maxWidth: sidebarW - 52 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220);
  if (d.businessAddress) doc.text(d.businessAddress, 26, 102, { maxWidth: sidebarW - 52 });
  if (d.businessEmail) doc.text(d.businessEmail, 26, 138, { maxWidth: sidebarW - 52 });

  if (logoAsset) {
    try {
      drawLogo(doc, logoAsset, { x: 26, y: 24, w: sidebarW - 52, h: 40 });
    } catch {
      // ignore
    }
  }

  const x = sidebarW + 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(30);
  doc.text("INVOICE", lineX2, 80, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text(`#${d.invoiceNo}`, lineX2, 102, { align: "right" });
  doc.text(formatDateShort(d.invoiceDate), lineX2, 124, { align: "right" });

  doc.setDrawColor(220);
  doc.line(x, 150, lineX2, 150);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text("Customer", x, 186);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text(d.customerName, x, 206);

  const tableY = 260;
  setFillHex(doc, "#f3f4f6", { r: 243, g: 244, b: 246 });
  doc.rect(x, tableY - 16, lineX2 - x, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(70);
  doc.text("DESCRIPTION", x + 10, tableY);
  doc.text("AMOUNT", lineX2 - 10, tableY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(d.description, x + 10, tableY + 36);
  doc.text(asMoney(d.total), lineX2 - 10, tableY + 36, { align: "right" });
  doc.setDrawColor(230);
  doc.line(x, tableY + 52, lineX2, tableY + 52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30);
  doc.text(`Total: ${asMoney(d.total)}`, lineX2 - 10, tableY + 106, { align: "right" });
}

export async function generateInvoicePdfBase64({ booking, business, template }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 72;

  const logoUrl = String(template?.logo_url || business?.logo_url || "").trim();
  const logoAsset = await fetchImageAsDataUrl(logoUrl);

  const templateName = String(template?.template_name || "Classic").trim() || "Classic";
  const accentHex = String(template?.primary_color || "#e11d48").trim() || "#e11d48";

  if (templateName === "Clean") {
    renderClean({ doc, pageW, pageH, marginX, booking, business, logoAsset, accentHex });
  } else if (templateName === "Gradient") {
    renderGradient({ doc, pageW, marginX, booking, business, logoAsset });
  } else if (templateName === "Navy") {
    renderNavy({ doc, pageW, marginX, booking, business, logoAsset });
  } else if (templateName === "Elegant") {
    renderElegant({ doc, pageW, marginX, booking, business, logoAsset });
  } else if (templateName === "Sidebar") {
    renderSidebar({ doc, pageW, pageH, marginX, booking, business, logoAsset });
  } else {
    renderClassic({ doc, pageW, marginX, booking, business, logoAsset, accentHex });
  }

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf).toString("base64");
}
