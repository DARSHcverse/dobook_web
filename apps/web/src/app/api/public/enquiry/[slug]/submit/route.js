import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEnquiryCreatedEmails } from "@/lib/bookingMailer";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { sendSMS } from "@/lib/sms";

function isValidEmail(v) {
  const s = String(v || "").trim();
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isYmd(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());
}

export async function POST(request, { params }) {
  const slug = String(params?.slug || "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ detail: "slug required" }, { status: 400 });
  }

  const limited = rateLimit({
    request,
    keyPrefix: `enquiry-submit:${slug}`,
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
    return NextResponse.json({ detail: "Payload too large" }, { status: 413 });
  }

  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  if (String(body?.company_website || "").trim()) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const firstName = String(body?.first_name || "").trim();
  const lastName = String(body?.last_name || "").trim();
  const customerName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!customerName) {
    return NextResponse.json({ detail: "First name is required" }, { status: 400 });
  }

  const customerEmail = String(body?.customer_email || "").trim();
  if (!isValidEmail(customerEmail)) {
    return NextResponse.json({ detail: "Valid email is required" }, { status: 400 });
  }

  const rawPhone = String(body?.customer_phone || "").trim();
  if (rawPhone && !isValidPhone(rawPhone)) {
    return NextResponse.json({ detail: "Invalid phone number" }, { status: 400 });
  }
  const customerPhone = rawPhone ? normalizePhone(rawPhone) : "";

  const bookingDateStr = String(body?.booking_date || "").trim();
  const bookingTimeStr = String(body?.booking_time || "18:00").trim();
  if (!bookingDateStr || !isYmd(bookingDateStr)) {
    return NextResponse.json({ detail: "Event date required (YYYY-MM-DD)" }, { status: 400 });
  }
  const time = /^\d{2}:\d{2}$/.test(bookingTimeStr) ? bookingTimeStr : "18:00";
  const eventTs = new Date(`${bookingDateStr}T${time}:00`);
  if (Number.isNaN(eventTs.getTime()) || eventTs.getTime() <= Date.now()) {
    return NextResponse.json({ detail: "Event date must be in the future" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: business, error: bErr } = await sb
    .from("businesses")
    .select("*")
    .ilike("slug", slug)
    .maybeSingle();

  if (bErr || !business) {
    return NextResponse.json({ detail: "Business not found" }, { status: 404 });
  }
  if (business.enquiry_page_enabled === false) {
    return NextResponse.json({ detail: "Enquiry page disabled" }, { status: 404 });
  }

  const businessId = business.id;

  const packageId = String(body?.package_id || "").trim() || null;
  let pkg = null;
  if (packageId && /^[0-9a-f-]{36}$/i.test(packageId)) {
    const { data } = await sb
      .from("packages")
      .select("id,name,price,duration_hours,category_id")
      .eq("id", packageId)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .maybeSingle();
    pkg = data;
  }

  const categoryId = String(body?.category_id || pkg?.category_id || "").trim() || null;

  const addonIds = Array.isArray(body?.addon_ids)
    ? body.addon_ids
        .map((x) => String(x || "").trim())
        .filter((x) => /^[0-9a-f-]{36}$/i.test(x))
        .slice(0, 20)
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

  const basePrice = pkg ? Number(pkg.price) : 0;
  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const estimatedTotal = Math.round((basePrice + addonsTotal) * 100) / 100;

  const lineItems = [];
  if (pkg) {
    lineItems.push({
      description: pkg.name,
      qty: 1,
      unit_price: basePrice,
      total: basePrice,
    });
  }
  for (const addon of addons) {
    const p = Number(addon.price || 0);
    lineItems.push({ description: addon.name, qty: 1, unit_price: p, total: p });
  }

  const durationMinutes = pkg?.duration_hours
    ? Math.round(Number(pkg.duration_hours) * 60)
    : Number(body?.duration_minutes || 180);

  const booking = {
    id: randomUUID(),
    business_id: businessId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    service_type: pkg?.name || "Enquiry",
    booth_type: String(body?.category_name || ""),
    package_duration: pkg?.duration_hours ? `${pkg.duration_hours} Hours` : "",
    event_location: String(body?.event_location || "").trim(),
    booking_date: bookingDateStr,
    booking_time: time,
    duration_minutes: durationMinutes,
    notes: String(body?.notes || "").trim(),
    parking_info: "",
    price: basePrice,
    quantity: 1,
    line_items: lineItems,
    total_amount: estimatedTotal,
    status: "pending",
    payment_status: "unpaid",
    payment_method: "",
    invoice_id: null,
    invoice_date: null,
    due_date: null,
    custom_fields: {
      first_name: firstName,
      last_name: lastName,
      venue_name: String(body?.venue_name || "").trim(),
      event_start_time: time,
    },
    package_id: packageId,
    category_id: categoryId,
    is_enquiry: true,
    enquiry_status: business.enquiry_auto_quote === false ? "pending" : "quoted",
    quoted_price: business.enquiry_auto_quote === false ? null : estimatedTotal,
    enquiry_message: String(body?.notes || "").trim(),
    event_type: String(body?.event_type || "").trim(),
    num_guests: body?.num_guests ? Number(body.num_guests) : null,
    referral_source: String(body?.referral_source || "").trim(),
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insErr } = await sb
    .from("bookings")
    .insert(booking)
    .select("*")
    .maybeSingle();

  if (insErr || !inserted) {
    return NextResponse.json(
      { detail: insErr?.message || "Failed to create enquiry" },
      { status: 500 },
    );
  }

  // Do NOT increment booking_count for enquiries — only confirmed bookings count.

  // Fire-and-forget emails + SMS
  try {
    await sendEnquiryCreatedEmails({
      booking: inserted,
      business,
      pkg,
      addons,
      estimatedTotal,
    });
  } catch (e) {
    console.error("[enquiry/submit] Email error:", e?.message);
  }

  // SMS (best-effort)
  const businessName = business.business_name || "";
  if (customerPhone) {
    try {
      await sendSMS({
        to: customerPhone,
        message: `Hi ${firstName || customerName}! ${businessName} received your enquiry for ${bookingDateStr}. Check your email for your quote. Quote valid ${business.enquiry_quote_validity_hours || 48}hrs.`,
      });
    } catch (e) {
      console.error("[enquiry/submit] Customer SMS error:", e?.message);
    }
  }
  if (business.phone) {
    try {
      await sendSMS({
        to: business.phone,
        message: `New enquiry: ${customerName} wants ${pkg?.name || "a quote"} on ${bookingDateStr}. Login to DoBook to respond.`,
      });
    } catch (e) {
      console.error("[enquiry/submit] Business SMS error:", e?.message);
    }
  }

  return NextResponse.json({
    id: inserted.id,
    invoice_id: inserted.invoice_id,
    booking_date: inserted.booking_date,
    slug: business.slug,
  });
}
