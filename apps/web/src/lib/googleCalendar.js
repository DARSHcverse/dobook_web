/**
 * Server-side Google Calendar sync utilities.
 * Never import this file from client components — tokens must stay server-side.
 */
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TIMEZONE = "Australia/Melbourne";

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth env vars missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI",
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Build the Google OAuth consent-screen URL. */
export function buildAuthUrl(state) {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: state || "",
  });
}

/** Exchange an authorization code for tokens and persist them. */
export async function exchangeCodeAndSave(businessId, code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);

  // Fetch the Google account email so we can display it in the UI.
  client.setCredentials(tokens);
  let googleEmail = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    googleEmail = data.email || null;
  } catch {
    // non-fatal
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from("google_calendar_tokens").upsert(
    {
      business_id: businessId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : null,
      google_email: googleEmail,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(`Failed to save Google tokens: ${error.message}`);
}

/** Delete all Google tokens for a business and clear google_event_id on bookings. */
export async function disconnectGoogleCalendar(businessId) {
  const sb = supabaseAdmin();
  await sb
    .from("bookings")
    .update({ google_event_id: null, google_synced_at: null, google_sync_error: null })
    .eq("business_id", businessId);
  await sb.from("google_calendar_tokens").delete().eq("business_id", businessId);
}

/** Load tokens for a business, refreshing the access token if needed. */
async function getAuthedClient(businessId) {
  const sb = supabaseAdmin();
  const { data: row, error } = await sb
    .from("google_calendar_tokens")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !row) return null;
  if (!row.sync_enabled) return null;

  const client = oauthClient();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.token_expiry ? new Date(row.token_expiry).getTime() : null,
  });

  // Refresh if expired or close to expiry (within 5 minutes).
  const expiryMs = row.token_expiry ? new Date(row.token_expiry).getTime() : 0;
  if (expiryMs < Date.now() + 5 * 60 * 1000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await sb
        .from("google_calendar_tokens")
        .update({
          access_token: credentials.access_token,
          token_expiry: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);
    } catch (e) {
      console.error(`[googleCalendar] token refresh failed for business ${businessId}:`, e?.message);
      return null;
    }
  }

  return { client, calendarId: row.calendar_id || "primary" };
}

/** Build start/end RFC3339 strings from a booking. */
function bookingDateTimes(booking) {
  const date = String(booking.booking_date || "").trim(); // YYYY-MM-DD
  const time = String(booking.booking_time || "").trim(); // HH:MM
  const duration = Number(booking.duration_minutes || 60);

  if (!date || !time) return null;

  const startIso = `${date}T${time}:00`;
  const startDate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startDate.getTime())) return null;

  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  const pad2 = (n) => String(n).padStart(2, "0");
  const endIso = [
    endDate.getFullYear(),
    pad2(endDate.getMonth() + 1),
    pad2(endDate.getDate()),
  ].join("-") + "T" + [
    pad2(endDate.getHours()),
    pad2(endDate.getMinutes()),
    "00",
  ].join(":");

  return { startIso, endIso };
}

function buildEventBody(booking) {
  const name = String(booking.customer_name || "Customer").trim();
  const service = String(booking.service_type || booking.booth_type || "").trim();
  const summary = service ? `${name} — ${service}` : name;

  const lines = [
    booking.customer_name && `Customer: ${booking.customer_name}`,
    booking.customer_email && `Email: ${booking.customer_email}`,
    booking.customer_phone && `Phone: ${booking.customer_phone}`,
    service && `Service: ${service}`,
    booking.total_amount != null && `Amount: $${Number(booking.total_amount).toFixed(2)}`,
    booking.notes && `Notes: ${booking.notes}`,
    `Booking ID: ${booking.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  const times = bookingDateTimes(booking);

  return {
    summary,
    description: lines,
    colorId: "11", // Tomato — matches DoBook brand red
    ...(times
      ? {
          start: { dateTime: times.startIso, timeZone: TIMEZONE },
          end: { dateTime: times.endIso, timeZone: TIMEZONE },
        }
      : {}),
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 1440 },
        { method: "popup", minutes: 60 },
      ],
    },
  };
}

/** Create a Google Calendar event for a booking. Saves event ID back to DB. */
export async function createCalendarEvent(businessId, booking) {
  const auth = await getAuthedClient(businessId);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const sb = supabaseAdmin();

  try {
    const { data: event } = await calendar.events.insert({
      calendarId: auth.calendarId,
      requestBody: buildEventBody(booking),
    });

    await sb
      .from("bookings")
      .update({
        google_event_id: event.id,
        google_synced_at: new Date().toISOString(),
        google_sync_error: null,
      })
      .eq("id", booking.id);
  } catch (e) {
    console.error(`[googleCalendar] createCalendarEvent failed for booking ${booking.id}:`, e?.message);
    await sb
      .from("bookings")
      .update({ google_sync_error: String(e?.message || "Unknown error").slice(0, 500) })
      .eq("id", booking.id);
  }
}

/** Update an existing Google Calendar event, or create one if it doesn't exist. */
export async function updateCalendarEvent(businessId, booking) {
  const auth = await getAuthedClient(businessId);
  if (!auth) return;

  const eventId = booking.google_event_id;
  if (!eventId) {
    return createCalendarEvent(businessId, booking);
  }

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const sb = supabaseAdmin();

  try {
    await calendar.events.update({
      calendarId: auth.calendarId,
      eventId,
      requestBody: buildEventBody(booking),
    });

    await sb
      .from("bookings")
      .update({ google_synced_at: new Date().toISOString(), google_sync_error: null })
      .eq("id", booking.id);
  } catch (e) {
    // If the event no longer exists in Google, create a fresh one.
    if (e?.code === 404 || e?.status === 404) {
      return createCalendarEvent(businessId, booking);
    }
    console.error(`[googleCalendar] updateCalendarEvent failed for booking ${booking.id}:`, e?.message);
    await sb
      .from("bookings")
      .update({ google_sync_error: String(e?.message || "Unknown error").slice(0, 500) })
      .eq("id", booking.id);
  }
}

/** Delete a Google Calendar event for a booking. */
export async function deleteCalendarEvent(businessId, booking) {
  const auth = await getAuthedClient(businessId);
  if (!auth) return;

  const eventId = booking.google_event_id;
  if (!eventId) return;

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const sb = supabaseAdmin();

  try {
    await calendar.events.delete({
      calendarId: auth.calendarId,
      eventId,
    });
  } catch (e) {
    // 404 means it was already deleted — that's fine.
    if (e?.code !== 404 && e?.status !== 404) {
      console.error(`[googleCalendar] deleteCalendarEvent failed for booking ${booking.id}:`, e?.message);
    }
  }

  await sb
    .from("bookings")
    .update({ google_event_id: null, google_synced_at: null, google_sync_error: null })
    .eq("id", booking.id);
}

/**
 * Sync all upcoming bookings for a business.
 * Returns the count of events created/updated.
 */
export async function syncAllBookings(businessId) {
  const auth = await getAuthedClient(businessId);
  if (!auth) return 0;

  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings, error } = await sb
    .from("bookings")
    .select("*")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .gte("booking_date", today)
    .order("booking_date", { ascending: true });

  if (error || !bookings?.length) return 0;

  let count = 0;
  for (const booking of bookings) {
    try {
      if (booking.google_event_id) {
        await updateCalendarEvent(businessId, booking);
      } else {
        await createCalendarEvent(businessId, booking);
      }
      count++;
    } catch {
      // best-effort per booking
    }
  }
  return count;
}

/** Check whether a business has Google Calendar connected. */
export async function getGoogleCalendarStatus(businessId) {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("google_calendar_tokens")
    .select("google_email, sync_enabled, updated_at")
    .eq("business_id", businessId)
    .maybeSingle();
  return data || null;
}

/** Toggle sync_enabled on the token row. */
export async function setSyncEnabled(businessId, enabled) {
  const sb = supabaseAdmin();
  await sb
    .from("google_calendar_tokens")
    .update({ sync_enabled: Boolean(enabled), updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
}
