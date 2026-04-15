import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEnquiryCreatedEmails } from "@/lib/bookingMailer";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { isValidPhone, normalizePhone } from "@/lib/phone";

function isValidEmail(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isYmd(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function isHm(value) {
  return /^\d{2}:\d{2}$/.test(String(value || "").trim());
}

function reject(request, status, detail, reason) {
  const ip = getClientIp(request);
  console.error(`[reject] POST /api/public/enquiries ip=${ip} reason=${reason || detail}`);
  return NextResponse.json({ detail }, { status });
}

export async function POST(request) {
  const limited = rateLimit({
    request,
    keyPrefix: "enquiries",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    const res = NextResponse.json({ detail: "Too many requests" }, { status: 429 });
    res.headers.set("Retry-After", String(limited.retryAfter || 3600));
    return res;
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw || "", "utf8") > 50 * 1024) {
    return reject(request, 413, "Payload too large", "payload_too_large");
  }

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return reject(request, 400, "Invalid JSON body", "invalid_json");
  }

  // Honeypot check
  if (String(body?.company_website || "").trim()) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const businessId = String(body?.business_id || "").trim();
  if (!businessId) return reject(request, 400, "business_id is required", "missing_business_id");

  const firstName = String(body?.first_name || "").trim();
  const lastName = String(body?.last_name || "").trim();
  const customerName = [firstName, lastName].filter(Boolean).join(" ");
  if (!customerName) return reject(request, 400, "first_name is required", "missing_name");

  const customerEmail = String(body?.customer_email || "").trim();
  if (!isValidEmail(customerEmail)) return reject(request, 400, "Invalid customer_email", "invalid_email");

  if (body?.customer_phone && !isValidPhone(body.customer_phone)) {
    return reject(request, 400, "Invalid phone number.", "invalid_phone");
  }

  const bookingDateStr = String(body?.booking_date || "").trim();
  const bookingTimeStr = String(body?.booking_time || "08:00").trim();
  if (!bookingDateStr || !isYmd(bookingDateStr)) {
    return reject(request, 400, "booking_date is required (YYYY-MM-DD)", "invalid_booking_date");
  }

  const eventDate = new Date(`${bookingDateStr}T${bookingTimeStr.match(/^\d{2}:\d{2}$/) ? bookingTimeStr : "08:00"}:00`);
  if (Number.isNaN(eventDate.getTime())) {
    return reject(request, 400, "Invalid booking date/time", "invalid_datetime");
  }
  if (eventDate.getTime() <= Date.now()) {
    return reject(request, 400, "booking_date must be in the future", "past_booking_date");
  }

  const sb = supabaseAdmin();

  const { data: business, error: bizErr } = await sb
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (bizErr) return NextResponse.json({ detail: bizErr.message }, { status: 500 });
  if (!business) return reject(request, 404, "Business not found", "business_not_found");

  // Validate package_id if provided
  const packageId = String(body?.package_id || "").trim() || null;
  let pkg = null;
  if (packageId) {
    const { data: pkgData } = await sb
      .from("packages")
      .select("id,name,price,duration_hours,category_id")
      .eq("id", packageId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .maybeSingle();
    pkg = pkgData;
  }

  const categoryId = String(body?.category_id || pkg?.category_id || "").trim() || null;

  // Validate addon_ids
  const addonIds = Array.isArray(body?.addon_ids)
    ? body.addon_ids.map((x) => String(x || "").trim()).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 20)
    : [];

  let addons = [];
  if (addonIds.length) {
    const { data } = await sb
      .from("service_addons")
      .select("id,name,price")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .in("id", addonIds);
    addons = Array.isArray(data) ? data : [];
  }

  const basePrice = pkg ? Number(pkg.price) : Number(body?.quoted_price || 0);
  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const estimatedTotal = Math.round((basePrice + addonsTotal) * 100) / 100;

  // Build line_items
  const lineItems = [];
  if (pkg) {
    lineItems.push({ description: pkg.name, qty: 1, unit_price: basePrice, total: basePrice });
  }
  for (const addon of addons) {
    lineItems.push({ description: addon.name, qty: 1, unit_price: Number(addon.price), total: Number(addon.price) });
  }

  const customerPhone = body?.customer_phone ? normalizePhone(body.customer_phone) : "";

  const { data: invoiceRows } = await sb.rpc("next_invoice_id", { p_business_id: businessId });
  const invoice_id = invoiceRows?.[0]?.invoice_id || null;

  const booking = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    service_type: pkg?.name || String(body?.service_type || "Photo Booth"),
    booth_type: String(body?.category_name || ""),
    package_duration: pkg?.duration_hours ? `${pkg.duration_hours} Hours` : "",
    event_location: String(body?.event_location || "").trim(),
    booking_date: bookingDateStr,
    booking_time: bookingTimeStr.match(/^\d{2}:\d{2}$/) ? bookingTimeStr : "08:00",
    duration_minutes: pkg?.duration_hours ? Math.round(Number(pkg.duration_hours) * 60) : 180,
    notes: String(body?.notes || "").trim(),
    parking_info: "",
    price: basePrice,
    quantity: 1,
    line_items: lineItems,
    total_amount: estimatedTotal,
    status: "confirmed",
    payment_status: "unpaid",
    payment_method: "",
    invoice_id,
    invoice_date: new Date().toISOString(),
    due_date: new Date(`${bookingDateStr}T00:00:00Z`).toISOString(),
    custom_fields: {},
    // Enquiry-specific fields
    package_id: packageId,
    category_id: categoryId,
    is_enquiry: true,
    enquiry_status: "pending",
    quoted_price: null,
    enquiry_message: String(body?.notes || "").trim(),
    event_type: String(body?.event_type || "").trim(),
    num_guests: body?.num_guests ? Number(body.num_guests) : null,
    referral_source: String(body?.referral_source || "").trim(),
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await sb
    .from("bookings")
    .insert(booking)
    .select("*")
    .maybeSingle();

  if (insertError || !inserted) {
    return NextResponse.json({ detail: insertError?.message || "Failed to create enquiry" }, { status: 500 });
  }

  // Increment booking_count best-effort
  await sb
    .from("businesses")
    .update({ booking_count: Number(business.booking_count || 0) + 1 })
    .eq("id", businessId);

  // Send emails best-effort
  try {
    await sendEnquiryCreatedEmails({
      booking: inserted,
      business,
      pkg,
      addons,
      estimatedTotal,
    });
  } catch (e) {
    console.error("[enquiries/POST] Email error:", e?.message);
  }

  return NextResponse.json({
    id: inserted.id,
    invoice_id: inserted.invoice_id,
    booking_date: inserted.booking_date,
  });
}
