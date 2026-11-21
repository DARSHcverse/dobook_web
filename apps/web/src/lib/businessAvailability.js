// Server-side glue between a business row and the pure availability engine.
import { columnExists } from "@/lib/dbProbe";
import { addDays, defaultAvailabilityForType, localNow, normalizeAvailability } from "@/lib/availability";

export const AVAILABILITY_COLUMN = "availability";

// The business's availability settings. Absent column or null value means the
// owner has not set hours, so nothing is enforced (old behaviour). Buffer and
// notice fall back to the legacy columns seeded at signup.
export function getBusinessAvailability(business) {
  const raw = business?.[AVAILABILITY_COLUMN];
  if (!raw || typeof raw !== "object") return normalizeAvailability({ enabled: false });
  return normalizeAvailability({
    buffer_mins: business?.buffer_mins,
    min_notice_hrs: business?.advance_booking_hrs,
    ...raw,
  });
}

export function businessTimeZone(business) {
  return String(business?.timezone || "").trim() || "Australia/Sydney";
}

export function businessNow(business) {
  return localNow(businessTimeZone(business));
}

export async function hasAvailabilityColumn(sb) {
  return columnExists(sb, "businesses", AVAILABILITY_COLUMN);
}

// Defaults for a brand-new business of this type, carrying over the
// buffer/notice the type template seeds.
export function initialAvailability({ businessType, bufferMins, minNoticeHrs }) {
  const d = defaultAvailabilityForType(businessType);
  return normalizeAvailability({ ...d, buffer_mins: bufferMins ?? d.buffer_mins, min_notice_hrs: minNoticeHrs ?? d.min_notice_hrs });
}

// Only the fields the engine needs; never customer details.
export async function loadBlockingBookings(sb, businessId, fromDate, toDate) {
  const { data, error } = await sb
    .from("bookings")
    .select("booking_date,booking_time,duration_minutes,status,is_enquiry")
    .eq("business_id", businessId)
    .gte("booking_date", fromDate)
    .lte("booking_date", toDate)
    .neq("status", "cancelled");
  if (error) throw error;
  return data || [];
}

export { addDays };
