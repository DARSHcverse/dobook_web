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
  {
    id: "cleaning_services",
    label: "Cleaning Services",
    description: "Home, office, and end-of-lease cleaning jobs.",
    icon: "sparkles",
  },
  {
    id: "fitness_training",
    label: "Fitness / Personal Training",
    description: "PT sessions, classes, and recurring bookings.",
    icon: "dumbbell",
  },
  {
    id: "pet_services",
    label: "Pet Services / Grooming",
    description: "Grooming, sitting, walking, and vet visits.",
    icon: "paw-print",
  },
  {
    id: "events_photography",
    label: "Events / Photography",
    description: "Shoots, event hire, and entertainment bookings.",
    icon: "camera",
  },
  {
    id: "automotive",
    label: "Automotive / Mechanic",
    description: "Servicing, detailing, and mobile mechanic jobs.",
    icon: "car",
  },
  {
    id: "beauty_spa",
    label: "Beauty / Spa",
    description: "Massage, nails, lashes, and treatments.",
    icon: "flower",
  },
  {
    id: "legal_advisory",
    label: "Legal / Professional Advisory",
    description: "Consultations for legal, accounting, and advisory.",
    icon: "scale",
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
      field({ name: "Access instructions", key: "access_instructions", type: "textarea", sort_order: 20 }),
      field({ name: "Upload photos", key: "job_photos", type: "file", sort_order: 30 }),
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

  cleaning_services: {
    services: ["Standard Clean", "Deep Clean", "End of Lease Clean", "Office Clean", "Regular Clean"],
    booking_fields: [
      field({ name: "Property address", key: "property_address", type: "textarea", required: true, sort_order: 10 }),
      field({
        name: "Property type",
        key: "property_type",
        type: "select",
        options: ["Apartment", "House", "Office", "Other"],
        required: true,
        sort_order: 20,
      }),
      field({ name: "Bedrooms", key: "bedrooms", type: "number", sort_order: 30 }),
      field({ name: "Bathrooms", key: "bathrooms", type: "number", sort_order: 40 }),
      field({ name: "Access instructions", key: "access_instructions", type: "textarea", sort_order: 50 }),
    ],
    addons: [
      addon({ name: "Inside oven", price: 0, duration_extra_mins: 30, sort_order: 10 }),
      addon({ name: "Interior windows", price: 0, duration_extra_mins: 30, sort_order: 20 }),
      addon({ name: "Carpet steam clean", price: 0, duration_extra_mins: 45, sort_order: 30 }),
      addon({ name: "Inside fridge", price: 0, duration_extra_mins: 20, sort_order: 40 }),
    ],
    scheduling: {
      buffer_mins: 30,
      advance_booking_hrs: 24,
      reminder_timing_hrs: [24],
      allow_recurring: true,
      require_deposit: false,
    },
  },

  fitness_training: {
    services: ["One-on-one Session", "Group Class", "Fitness Assessment", "Trial Session", "Program Review"],
    booking_fields: [
      field({
        name: "Fitness goal",
        key: "fitness_goal",
        type: "select",
        options: ["Weight loss", "Muscle gain", "General fitness", "Rehab/injury", "Sport-specific"],
        sort_order: 10,
      }),
      field({ name: "Health notes (private)", key: "health_notes", type: "textarea", is_private: true, sort_order: 20 }),
      field({ name: "Experience level", key: "experience_level", type: "text", sort_order: 30 }),
    ],
    addons: [
      addon({ name: "Nutrition plan", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "Progress tracking", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Extra 30 min", price: 0, duration_extra_mins: 30, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 10,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [24, 2],
      allow_recurring: true,
      require_deposit: false,
    },
  },

  pet_services: {
    services: ["Full Groom", "Bath & Brush", "Nail Trim", "Pet Sitting", "Dog Walking"],
    booking_fields: [
      field({ name: "Pet name", key: "pet_name", type: "text", required: true, sort_order: 10 }),
      field({
        name: "Pet type",
        key: "pet_type",
        type: "select",
        options: ["Dog", "Cat", "Other"],
        required: true,
        sort_order: 20,
      }),
      field({ name: "Breed", key: "pet_breed", type: "text", sort_order: 30 }),
      field({
        name: "Size",
        key: "pet_size",
        type: "select",
        options: ["Small", "Medium", "Large", "Extra large"],
        sort_order: 40,
      }),
      field({ name: "Temperament / notes", key: "pet_notes", type: "textarea", sort_order: 50 }),
    ],
    addons: [
      addon({ name: "De-shedding treatment", price: 0, duration_extra_mins: 20, sort_order: 10 }),
      addon({ name: "Teeth cleaning", price: 0, duration_extra_mins: 15, sort_order: 20 }),
      addon({ name: "Flea treatment", price: 0, duration_extra_mins: 10, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 15,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [24],
      allow_recurring: false,
      require_deposit: false,
    },
  },

  events_photography: {
    services: ["Portrait Session", "Event Coverage", "Wedding Package", "Product Shoot", "Videography"],
    booking_fields: [
      field({
        name: "Event type",
        key: "event_type",
        type: "select",
        options: ["Wedding", "Birthday", "Corporate", "Portrait", "Product", "Other"],
        required: true,
        sort_order: 10,
      }),
      field({ name: "Venue / location", key: "venue_location", type: "textarea", required: true, sort_order: 20 }),
      field({ name: "Estimated guests", key: "guest_count", type: "number", sort_order: 30 }),
      field({ name: "Notes / requests", key: "event_notes", type: "textarea", sort_order: 40 }),
    ],
    addons: [
      addon({ name: "Extra hour of coverage", price: 0, duration_extra_mins: 60, sort_order: 10 }),
      addon({ name: "Second shooter", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Printed album", price: 0, duration_extra_mins: 0, sort_order: 30 }),
      addon({ name: "Rush editing", price: 0, duration_extra_mins: 0, sort_order: 40 }),
    ],
    scheduling: {
      buffer_mins: 30,
      advance_booking_hrs: 48,
      reminder_timing_hrs: [48],
      allow_recurring: false,
      require_deposit: true,
    },
  },

  automotive: {
    services: ["Logbook Service", "Basic Service", "Detailing", "Diagnostic", "Mobile Call-out"],
    booking_fields: [
      field({ name: "Vehicle make & model", key: "vehicle_make_model", type: "text", required: true, sort_order: 10 }),
      field({ name: "Registration / plate", key: "vehicle_rego", type: "text", sort_order: 20 }),
      field({ name: "Year", key: "vehicle_year", type: "number", sort_order: 30 }),
      field({
        name: "Service location",
        key: "service_location",
        type: "select",
        options: ["Drop off at workshop", "Mobile (come to me)"],
        required: true,
        sort_order: 40,
      }),
      field({ name: "Issue / notes", key: "vehicle_notes", type: "textarea", sort_order: 50 }),
    ],
    addons: [
      addon({ name: "Wheel alignment", price: 0, duration_extra_mins: 30, sort_order: 10 }),
      addon({ name: "Air-con regas", price: 0, duration_extra_mins: 30, sort_order: 20 }),
      addon({ name: "Loan car", price: 0, duration_extra_mins: 0, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 30,
      advance_booking_hrs: 24,
      reminder_timing_hrs: [24],
      allow_recurring: false,
      require_deposit: false,
    },
  },

  beauty_spa: {
    services: ["Massage", "Manicure", "Pedicure", "Lash Extensions", "Facial", "Waxing"],
    booking_fields: [
      field({ name: "Treatment preference", key: "treatment_preference", type: "text", sort_order: 10 }),
      field({ name: "Allergies / health notes (private)", key: "health_notes", type: "textarea", is_private: true, sort_order: 20 }),
      field({ name: "Preferred therapist", key: "preferred_therapist", type: "text", sort_order: 30 }),
    ],
    addons: [
      addon({ name: "Hot stones", price: 0, duration_extra_mins: 15, sort_order: 10 }),
      addon({ name: "Aromatherapy", price: 0, duration_extra_mins: 0, sort_order: 20 }),
      addon({ name: "Extended session (+30 min)", price: 0, duration_extra_mins: 30, sort_order: 30 }),
    ],
    scheduling: {
      buffer_mins: 10,
      advance_booking_hrs: 0,
      reminder_timing_hrs: [24, 2],
      allow_recurring: false,
      require_deposit: false,
    },
  },

  legal_advisory: {
    services: ["Initial Consultation", "Follow-up Meeting", "Document Review", "Ongoing Retainer"],
    booking_fields: [
      field({ name: "Company / organisation", key: "company_name", type: "text", sort_order: 10 }),
      field({ name: "Matter type", key: "matter_type", type: "text", required: true, sort_order: 20 }),
      field({ name: "Confidential notes (private)", key: "confidential_notes", type: "textarea", is_private: true, sort_order: 30 }),
      field({
        name: "Meeting format",
        key: "meeting_format",
        type: "select",
        options: ["Video", "Phone", "In-person"],
        required: true,
        sort_order: 40,
      }),
    ],
    addons: [
      addon({ name: "Written summary", price: 0, duration_extra_mins: 0, sort_order: 10 }),
      addon({ name: "Extra 30 min", price: 0, duration_extra_mins: 30, sort_order: 20 }),
    ],
    scheduling: {
      buffer_mins: 0,
      advance_booking_hrs: 24,
      reminder_timing_hrs: [48],
      allow_recurring: false,
      require_deposit: true,
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
