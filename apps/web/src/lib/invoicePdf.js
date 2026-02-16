import jsPDF from "jspdf";

function hexToRgb(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return { r, g, b };
}

function safeTemplateName(value) {
  const s = String(value || "").trim();
  if (!s) return "Classic";
  return s;
}

function asMoney(value) {
  const n = Number(value || 0);
  return `$${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(d);
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
    return { dataUrl: src, format };
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
    return { dataUrl: `data:${type};base64,${b64}`, format };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateInvoicePdfBase64({ booking, business, template }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;

  const templateName = safeTemplateName(template?.template_name);
  const primary = String(template?.primary_color || "#e11d48").trim() || "#e11d48";
  const rgb = hexToRgb(primary) || { r: 225, g: 29, b: 72 };
  const logoUrl = String(template?.logo_url || business?.logo_url || "").trim();

  if (templateName !== "Minimal") {
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(0, 0, pageW, 92, "F");
  }

  const logoAsset = await fetchImageAsDataUrl(logoUrl);
  if (logoAsset) {
    try {
      // Render the logo inside a white pill so it works on colored headers.
      const boxW = 150;
      const boxH = 44;
      const x = pageW - margin - boxW;
      const y = 28;
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, boxW, boxH, "F");
      doc.addImage(logoAsset.dataUrl, logoAsset.format, x + 10, y + 8, boxW - 20, boxH - 16);
    } catch {
      // ignore logo failures
    }
  }

  const invoiceNo = booking?.invoice_id || `INV-${String(booking?.id || "").slice(0, 8).toUpperCase()}`;
  const invoiceDate = booking?.invoice_date || new Date().toISOString();
  const dueDate = booking?.due_date || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  if (templateName !== "Minimal") doc.setTextColor(255, 255, 255);
  else doc.setTextColor(24, 24, 27);
  doc.text("INVOICE", margin, 58);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (templateName !== "Minimal") doc.setTextColor(255, 255, 255);
  else doc.setTextColor(63, 63, 70);
  doc.text(`Invoice No: ${invoiceNo}`, pageW - margin, 44, { align: "right" });
  doc.text(`Date: ${formatDate(invoiceDate)}`, pageW - margin, 60, { align: "right" });
  if (dueDate) doc.text(`Due: ${formatDate(dueDate)}`, pageW - margin, 76, { align: "right" });

  doc.setTextColor(24, 24, 27);

  doc.setFont("helvetica", "bold");
  doc.text(String(business?.business_name || "Business"), margin, 130);
  doc.setFont("helvetica", "normal");
  const bizEmail = String(business?.email || "");
  const bizPhone = String(business?.phone || "");
  if (bizEmail) doc.text(bizEmail, margin, 146);
  if (bizPhone) doc.text(bizPhone, margin, 162);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text("Issued To", margin, 200);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 24, 27);
  doc.text(String(booking?.customer_name || ""), margin, 216);
  if (booking?.event_location) doc.text(String(booking.event_location), margin, 232);
  if (booking?.customer_email) doc.text(String(booking.customer_email), margin, 248);

  doc.setDrawColor(220);
  doc.line(margin, 275, pageW - margin, 275);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text("Description", margin, 298);
  doc.text("Qty", pageW - margin - 120, 298, { align: "right" });
  doc.text("Total", pageW - margin, 298, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 24, 27);
  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const total = unit * qty;
  const description =
    booking?.package_duration ||
    booking?.service_type ||
    booking?.booth_type ||
    "Booking";

  doc.text(String(description), margin, 328);
  doc.text(String(qty), pageW - margin - 120, 328, { align: "right" });
  doc.text(asMoney(total), pageW - margin, 328, { align: "right" });

  doc.setDrawColor(230);
  doc.line(margin, 370, pageW - margin, 370);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
  doc.text("Total", pageW - margin - 120, 398, { align: "right" });
  doc.text(asMoney(total), pageW - margin, 398, { align: "right" });

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf).toString("base64");
}
