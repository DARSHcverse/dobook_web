import jsPDF from "jspdf";

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

export function generateInvoicePdfBase64({ booking, business }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 56;

  const invoiceNo = booking?.invoice_id || `INV-${String(booking?.id || "").slice(0, 8).toUpperCase()}`;
  const invoiceDate = booking?.invoice_date || new Date().toISOString();
  const dueDate = booking?.due_date || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", margin, 80);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: ${invoiceNo}`, pageW - margin, 80, { align: "right" });
  doc.text(`Date: ${formatDate(invoiceDate)}`, pageW - margin, 96, { align: "right" });
  if (dueDate) doc.text(`Due: ${formatDate(dueDate)}`, pageW - margin, 112, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text(String(business?.business_name || "Business"), margin, 140);
  doc.setFont("helvetica", "normal");
  const bizEmail = String(business?.email || "");
  const bizPhone = String(business?.phone || "");
  if (bizEmail) doc.text(bizEmail, margin, 156);
  if (bizPhone) doc.text(bizPhone, margin, 172);

  doc.setFont("helvetica", "bold");
  doc.text("Issued To", margin, 210);
  doc.setFont("helvetica", "normal");
  doc.text(String(booking?.customer_name || ""), margin, 226);
  if (booking?.event_location) doc.text(String(booking.event_location), margin, 242);
  if (booking?.customer_email) doc.text(String(booking.customer_email), margin, 258);

  doc.setDrawColor(220);
  doc.line(margin, 285, pageW - margin, 285);

  doc.setFont("helvetica", "bold");
  doc.text("Description", margin, 308);
  doc.text("Qty", pageW - margin - 120, 308, { align: "right" });
  doc.text("Total", pageW - margin, 308, { align: "right" });

  doc.setFont("helvetica", "normal");
  const qty = Math.max(1, Number(booking?.quantity || 1));
  const unit = Number(booking?.price || 0);
  const total = unit * qty;
  const description =
    booking?.package_duration ||
    booking?.service_type ||
    booking?.booth_type ||
    "Booking";

  doc.text(String(description), margin, 338);
  doc.text(String(qty), pageW - margin - 120, 338, { align: "right" });
  doc.text(asMoney(total), pageW - margin, 338, { align: "right" });

  doc.setDrawColor(230);
  doc.line(margin, 380, pageW - margin, 380);
  doc.setFont("helvetica", "bold");
  doc.text("Total", pageW - margin - 120, 408, { align: "right" });
  doc.text(asMoney(total), pageW - margin, 408, { align: "right" });

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf).toString("base64");
}

