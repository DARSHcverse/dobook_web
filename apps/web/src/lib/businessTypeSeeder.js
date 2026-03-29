import { getBusinessTypeTemplate, normalizeBusinessType } from "@/lib/businessTypeTemplates";

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildLegacyCustomFields(template) {
  const fields = Array.isArray(template?.booking_fields) ? template.booking_fields : [];
  return fields
    .filter((f) => f && !f.is_private)
    .map((f) => ({
      key: String(f.field_key || "").trim(),
      label: String(f.field_name || "").trim(),
      type: String(f.field_type || "text").trim(),
    }))
    .filter((f) => f.key && f.label);
}

function normalizeServices(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

function normalizeReminderHours(list) {
  return (Array.isArray(list) ? list : [])
    .map((x) => asNumber(x, NaN))
    .filter((x) => Number.isFinite(x) && x >= 0);
}

export function deriveBusinessSeedFromType({ businessType }) {
  const bt = normalizeBusinessType(businessType);
  if (!bt) return null;

  const template = getBusinessTypeTemplate(bt);
  if (!template) return null;

  const services = normalizeServices(template.services);
  const scheduling = template.scheduling || {};

  return {
    business_type: bt,
    booth_types: services.length ? services : undefined,
    booking_custom_fields: buildLegacyCustomFields(template),
    buffer_mins: asNumber(scheduling.buffer_mins, 0),
    advance_booking_hrs: asNumber(scheduling.advance_booking_hrs, 0),
    reminder_timing_hrs: normalizeReminderHours(scheduling.reminder_timing_hrs),
    allow_recurring: Boolean(scheduling.allow_recurring),
    require_deposit: Boolean(scheduling.require_deposit),
    booking_form_fields: Array.isArray(template.booking_fields) ? template.booking_fields : [],
    service_addons: Array.isArray(template.addons) ? template.addons : [],
  };
}

export async function seedBusinessTypeDefaultsOnSignup({ sb, businessId, businessType }) {
  const seed = deriveBusinessSeedFromType({ businessType });
  if (!seed) return { ok: true, seeded: false };

  const bookingFieldsRows = seed.booking_form_fields
    .map((f, i) => ({
      business_id: businessId,
      field_key: String(f?.field_key || "").trim(),
      field_name: String(f?.field_name || "").trim(),
      field_type: String(f?.field_type || "text").trim(),
      required: Boolean(f?.required),
      is_private: Boolean(f?.is_private),
      sort_order: Number.isFinite(Number(f?.sort_order)) ? Number(f.sort_order) : i * 10,
      field_options: Array.isArray(f?.field_options) ? f.field_options : [],
    }))
    .filter((r) => r.field_key && r.field_name);

  const addonsRows = seed.service_addons
    .map((a, i) => ({
      business_id: businessId,
      name: String(a?.name || "").trim(),
      description: String(a?.description || "").trim(),
      price: asNumber(a?.price, 0),
      duration_extra_mins: asNumber(a?.duration_extra_mins, 0),
      is_active: a?.is_active === false ? false : true,
      sort_order: Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : i * 10,
    }))
    .filter((r) => r.name);

  if (bookingFieldsRows.length) {
    await sb.from("booking_form_fields").insert(bookingFieldsRows);
  }
  if (addonsRows.length) {
    await sb.from("service_addons").insert(addonsRows);
  }

  return { ok: true, seeded: true };
}

export async function applyBusinessTypeTemplateNoOverwrite({ sb, businessId, businessType }) {
  const seed = deriveBusinessSeedFromType({ businessType });
  if (!seed) return { ok: false, detail: "Invalid business type" };

  const { data: business, error: bizErr } = await sb
    .from("businesses")
    .select(
      "id,business_type,booth_types,booking_custom_fields,buffer_mins,advance_booking_hrs,reminder_timing_hrs,allow_recurring,require_deposit",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (bizErr) return { ok: false, detail: bizErr.message };
  if (!business) return { ok: false, detail: "Business not found" };

  const { count: fieldsCount } = await sb
    .from("booking_form_fields")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  const { count: addonsCount } = await sb
    .from("service_addons")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  const updates = { business_type: seed.business_type };

  const existingServices = Array.isArray(business.booth_types) ? business.booth_types : [];
  if (!existingServices.length && Array.isArray(seed.booth_types) && seed.booth_types.length) {
    updates.booth_types = seed.booth_types;
  }

  const existingCustom = Array.isArray(business.booking_custom_fields) ? business.booking_custom_fields : [];
  if (!existingCustom.length && Array.isArray(seed.booking_custom_fields) && seed.booking_custom_fields.length) {
    updates.booking_custom_fields = seed.booking_custom_fields;
  }

  const schedulingLooksDefault =
    asNumber(business.buffer_mins, 0) === 0 &&
    asNumber(business.advance_booking_hrs, 0) === 0 &&
    (Array.isArray(business.reminder_timing_hrs) ? business.reminder_timing_hrs : []).length === 0 &&
    business.allow_recurring === false &&
    business.require_deposit === false;

  if (schedulingLooksDefault) {
    updates.buffer_mins = seed.buffer_mins;
    updates.advance_booking_hrs = seed.advance_booking_hrs;
    updates.reminder_timing_hrs = seed.reminder_timing_hrs;
    updates.allow_recurring = seed.allow_recurring;
    updates.require_deposit = seed.require_deposit;
  }

  const { error: updErr } = await sb.from("businesses").update(updates).eq("id", businessId);
  if (updErr) return { ok: false, detail: updErr.message };

  if (!fieldsCount) {
    await sb.from("booking_form_fields").insert(
      (seed.booking_form_fields || [])
        .map((f, i) => ({
          business_id: businessId,
          field_key: String(f?.field_key || "").trim(),
          field_name: String(f?.field_name || "").trim(),
          field_type: String(f?.field_type || "text").trim(),
          required: Boolean(f?.required),
          is_private: Boolean(f?.is_private),
          sort_order: Number.isFinite(Number(f?.sort_order)) ? Number(f.sort_order) : i * 10,
          field_options: Array.isArray(f?.field_options) ? f.field_options : [],
        }))
        .filter((r) => r.field_key && r.field_name),
    );
  }

  if (!addonsCount) {
    await sb.from("service_addons").insert(
      (seed.service_addons || [])
        .map((a, i) => ({
          business_id: businessId,
          name: String(a?.name || "").trim(),
          description: String(a?.description || "").trim(),
          price: asNumber(a?.price, 0),
          duration_extra_mins: asNumber(a?.duration_extra_mins, 0),
          is_active: a?.is_active === false ? false : true,
          sort_order: Number.isFinite(Number(a?.sort_order)) ? Number(a.sort_order) : i * 10,
        }))
        .filter((r) => r.name),
    );
  }

  return {
    ok: true,
    applied: true,
    inserted_fields: !fieldsCount,
    inserted_addons: !addonsCount,
    updated_services: !existingServices.length,
    updated_scheduling: schedulingLooksDefault,
  };
}

