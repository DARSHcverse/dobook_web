/**
 * Server-side Twilio SMS utility.
 * Never import this from client components.
 */
import twilio from "twilio";

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/**
 * Normalise an Australian or international phone number to E.164 format.
 * Returns null if the number can't be interpreted.
 */
function normalisePhone(raw) {
  if (!raw) return null;
  // Strip spaces, dashes, brackets, dots
  let phone = String(raw).replace(/[\s\-().]/g, "");
  if (!phone) return null;

  // Australian numbers starting with 0 → +61
  if (phone.startsWith("0")) {
    phone = "+61" + phone.slice(1);
  } else if (!phone.startsWith("+")) {
    // Assume international without the leading +
    phone = "+" + phone;
  }

  // Minimal sanity check: E.164 is + followed by 7-15 digits
  if (!/^\+\d{7,15}$/.test(phone)) return null;
  return phone;
}

/**
 * Send an SMS message via Twilio.
 * Always resolves — failures are logged but never thrown.
 * Returns the Twilio message SID on success, or null on skip/failure.
 */
export async function sendSMS({ to, message }) {
  const phone = normalisePhone(to);
  if (!phone) {
    console.log("[sms] skipped: no valid phone number");
    return null;
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!messagingServiceSid) {
    console.warn("[sms] skipped: TWILIO_MESSAGING_SERVICE_SID not set");
    return null;
  }

  const client = getClient();
  if (!client) {
    console.warn("[sms] skipped: Twilio credentials not configured");
    return null;
  }

  try {
    const result = await client.messages.create({
      body: String(message || "").trim(),
      messagingServiceSid,
      to: phone,
    });
    console.log(`[sms] sent ${result.sid} → ${phone}`);
    return result.sid;
  } catch (e) {
    console.error(`[sms] failed → ${phone}:`, e?.message);
    return null;
  }
}

/** Format a YYYY-MM-DD date string into a readable AU date. */
export function formatSMSDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format an HH:MM time string into 12-hour display. */
export function formatSMSTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = String(timeStr).split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return timeStr;
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${String(m || "00").padStart(2, "0")} ${period}`;
}
