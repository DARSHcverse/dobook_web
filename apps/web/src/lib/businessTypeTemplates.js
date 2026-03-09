export const BUSINESS_TYPES = [
  {
    id: "salon_barbershop",
    label: "Salon / Barbershop",
    description: "Hair, beauty, barber, and grooming appointments.",
    icon: "scissors",
  },
  {
    id: "medical_wellness",
    label: "Medical / Wellness",
    description: "Consultations, treatments, and confidential notes.",
    icon: "stethoscope",
  },
  {
    id: "consultant",
    label: "Consultant",
    description: "Calls, strategy sessions, and paid bookings.",
    icon: "briefcase",
  },
  {
    id: "tutoring_education",
    label: "Tutoring / Education",
    description: "Lessons, classes, and recurring sessions.",
    icon: "graduation-cap",
  },
  {
    id: "home_services_trades",
    label: "Home Services / Trades",
    description: "Quotes, jobs, and site visits with uploads.",
    icon: "hammer",
  },
];

function slugKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function field({ key, name, type = "text", required = false, is_private = false, sort_order = 0, options = [] }) {
  const field_key = String(key || slugKey(name) || "").trim();
  return {
    field_key,
    field_name: String(name || field_key).trim(),
    field_type: String(type || "text").trim(),
    required: Boolean(required),
    is_private: Boolean(is_private),
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    field_options: Array.isArray(options) ? options : [],
  };
}

function addon({ name, description = "", price = 0, duration_extra_mins = 0, is_active = true, sort_order = 0 }) {
  return {
    name: String(name || "").trim(),
    description: String(description || "").trim(),
    price: Number(price || 0),
    duration_extra_mins: Number(duration_extra_mins || 0),
    is_active: Boolean(is_active),
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
  };
}

export const BUSINESS_TYPE_TEMPLATES = {
  salon_barbershop: {
    services: ["Haircut", "Colour", "Blow Dry", "Beard Trim", "Treatment"],
    booking_fields: [
      field({ name: "Staff preference", type: "text", sort_order: 10 }),
      field({ name: "Service type", type: "text", sort_order: 20 }),
      field({ name: "Notes", type: "textarea", sort_order: 30 }),
    ],
    addons: [
      addon({ name: "Toner", price: 0, duration_extra_mins: 15, sort_order: 10 }),
      addon({ name: "Deep Condition", price: 0, duration_extra_mins: 15, sort_order: 20 }),
      addon({ name: "Style Finish", price: 0, duration_extra_mins: 10, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 10,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [],
      allow_recurring: false,
      require_deposit: false,
    },
  },

  medical_wellness: {
    services: ["Initial Consultation", "Follow-up", "Treatment Session", "Assessment"],
    booking_fields: [
      field({ name: "Reason for visit", type: "textarea", required: true, sort_order: 10 }),
      field({ name: "Health notes (private)", key: "health_notes", type: "textarea", is_private: true, sort_order: 20 }),
      field({
        name: "Referral (yes/no)",
        key: "referral",
        type: "select",
        options: ["No", "Yes"],
        sort_order: 30,
      }),
    ],
    addons: [
      addon({ name: "Telehealth option", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "Extended session (+30 min)", price: 0, duration_extra_mins: 30, sort_order: 20 }),
    ],
    scheduling: {
      buffer_mins: 0,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [48, 2],
      allow_recurring: false,
      require_deposit: false,
    },
  },

  consultant: {
    services: ["Discovery Call", "Strategy Session", "Ongoing Retainer", "Workshop"],
    booking_fields: [
      field({ name: "Company name", type: "text", sort_order: 10 }),
      field({ name: "Topic/goal", key: "topic_goal", type: "textarea", required: true, sort_order: 20 }),
      field({
        name: "Meeting format",
        type: "select",
        options: ["Video", "Phone", "In-person"],
        required: true,
        sort_order: 30,
      }),
    ],
    addons: [
      addon({ name: "Recording add-on", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "Follow-up report", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Extra 30 min", price: 0, duration_extra_mins: 30, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 0,
      advance_booking_hrs: 24,
      reminder_timing_hrs: [],
      allow_recurring: false,
      require_deposit: true,
    },
  },

  tutoring_education: {
    services: ["One-on-one Session", "Group Class", "Assessment", "Trial Lesson"],
    booking_fields: [
      field({ name: "Subject", type: "text", required: true, sort_order: 10 }),
      field({ name: "Student age/year level", key: "student_level", type: "text", sort_order: 20 }),
      field({ name: "Parent/guardian name (if minor)", key: "guardian_name", type: "text", sort_order: 30 }),
    ],
    addons: [
      addon({ name: "Study materials", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "Session recording", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Extra homework review", price: 0, duration_extra_mins: 15, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 0,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [],
      allow_recurring: true,
      require_deposit: false,
    },
  },

  home_services_trades: {
    services: ["Quote/Inspection", "Job Booking", "Follow-up Visit", "Emergency Call-out"],
    booking_fields: [
      field({ name: "Address (job location)", key: "job_address", type: "textarea", required: true, sort_order: 10 }),
      field({ name: "Type of work", key: "work_type", type: "text", required: true, sort_order: 20 }),
      field({ name: "Access instructions", key: "access_instructions", type: "textarea", sort_order: 30 }),
      field({ name: "Photo upload", key: "job_photos", type: "file", sort_order: 40 }),
    ],
    addons: [
      addon({ name: "Materials supply", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "After-hours rate", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Priority booking", price: 0, duration_extra_mins: 0, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 30,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [],
      allow_recurring: false,
      require_deposit: false,
    },
  },
};

export function normalizeBusinessType(value) {
  const id = String(value || "").trim();
  if (!id) return null;
  return BUSINESS_TYPES.some((t) => t.id === id) ? id : null;
}

export function getBusinessTypeTemplate(value) {
  const id = normalizeBusinessType(value);
  if (!id) return null;
  return BUSINESS_TYPE_TEMPLATES[id] || null;
}

