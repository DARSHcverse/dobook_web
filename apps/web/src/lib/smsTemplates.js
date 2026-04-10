/** SMS message templates for DoBook. */

export function bookingConfirmationSMS({ customerName, businessName, service, date, time }) {
  const name = String(customerName || "there").trim();
  const biz = String(businessName || "us").trim();
  const svc = String(service || "").trim();
  return (
    `Hi ${name}! Your booking with ${biz} is confirmed.\n\n` +
    `📅 ${date}\n` +
    `🕐 ${time}\n` +
    (svc ? `💼 ${svc}\n` : "") +
    `\nNeed to reschedule? Contact us directly.\n- ${biz}`
  );
}

export function bookingReminderSMS({ customerName, businessName, service, date, time, hoursUntil }) {
  const name = String(customerName || "there").trim();
  const biz = String(businessName || "us").trim();
  const svc = String(service || "").trim();
  const timeLabel = Number(hoursUntil) >= 24 ? "tomorrow" : `in ${hoursUntil} hours`;
  return (
    `Hi ${name}, reminder that you have a booking with ${biz} ${timeLabel}.\n\n` +
    `📅 ${date}\n` +
    `🕐 ${time}\n` +
    (svc ? `💼 ${svc}\n` : "") +
    `\nSee you soon!\n- ${biz}`
  );
}

export function bookingCancellationSMS({ customerName, businessName, date, time }) {
  const name = String(customerName || "there").trim();
  const biz = String(businessName || "us").trim();
  return (
    `Hi ${name}, your booking with ${biz} on ${date} at ${time} has been cancelled.\n\n` +
    `Please contact us to rebook.\n- ${biz}`
  );
}

export function staffAssignmentSMS({ staffName, businessName, customerName, service, date, time, location, backdrop }) {
  const staff = String(staffName || "there").trim();
  const biz = String(businessName || "DoBook").trim();
  const svc = String(service || "").trim();
  let msg =
    `Hi ${staff}! You've been assigned a booking at ${biz}.\n\n` +
    `👤 Customer: ${String(customerName || "").trim()}\n` +
    `📅 Date: ${date}\n` +
    `🕐 Time: ${time}\n` +
    (svc ? `💼 Service: ${svc}\n` : "");
  if (location) msg += `📍 Location: ${location}\n`;
  if (backdrop) msg += `🎨 Setup: ${backdrop}\n`;
  msg += `\nQuestions? Contact ${biz} directly.`;
  return msg;
}
