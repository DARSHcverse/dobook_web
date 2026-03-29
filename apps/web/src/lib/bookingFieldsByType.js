export const BOOKING_TYPE_KEYS = [
  "photobooth",
  "salon_barbershop",
  "medical_wellness",
  "consultant",
  "tutoring_education",
  "home_services_trades",
];

export function inferBookingTypeKey({ businessType, industry }) {
  const bt = String(businessType || "").trim();
  if (BOOKING_TYPE_KEYS.includes(bt)) return bt;

  const ind = String(industry || "").trim().toLowerCase();
  if (ind === "salon") return "salon_barbershop";
  if (ind === "doctor") return "medical_wellness";
  if (ind === "consultant") return "consultant";
  if (ind === "tutor") return "tutoring_education";
  if (ind === "tradie") return "home_services_trades";
  return "photobooth";
}

export const BOOKING_FIELDS_BY_TYPE = {
  photobooth: [
    { key: "customer_name", label: "Full Name", type: "text", required: true, column: "customer_name" },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: false, column: "customer_phone" },
    { key: "booking_date", label: "Event Date", type: "date", required: true, column: "booking_date" },
    { key: "event_location", label: "Event Location", type: "address", required: true, column: "event_location" },
    { key: "booth_type", label: "Select Booth Type", type: "select_services", required: true, column: "booth_type" },
    { key: "package_duration", label: "Select Package Duration", type: "package_duration", required: true, column: "package_duration" },
    { key: "quantity", label: "Quantity", type: "number", required: false, column: "quantity" },
    { key: "price", label: "Agreed Price ($)", type: "money", required: true, column: "price" },
    { key: "booking_time", label: "Start Time", type: "time", required: true, column: "booking_time" },
    { key: "parking_info", label: "Parking Information", type: "text", required: false, column: "parking_info" },
    { key: "notes", label: "Notes", type: "text", required: false, column: "notes", placeholder: "Any special requests" },
  ],

  salon_barbershop: [
    { key: "customer_name", label: "Full Name", type: "text", required: true, column: "customer_name" },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: false, column: "customer_phone" },
    { key: "service_type", label: "Service Type", type: "select_services", required: true, column: "service_type" },
    { key: "booking_date", label: "Appointment Date", type: "date", required: true, column: "booking_date" },
    { key: "booking_time", label: "Appointment Time", type: "time", required: true, column: "booking_time" },
    { key: "notes", label: "Notes", type: "text", required: false, column: "notes" },
  ],

  medical_wellness: [
    { key: "customer_name", label: "Full Name", type: "text", required: true, column: "customer_name" },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: true, column: "customer_phone" },
    { key: "booking_date", label: "Date of Appointment", type: "date", required: true, column: "booking_date" },
    { key: "booking_time", label: "Time Slot", type: "time", required: true, column: "booking_time" },
    { key: "notes", label: "Notes", type: "text", required: false, column: "notes" },
  ],

  consultant: [
    { key: "customer_name", label: "Full Name", type: "text", required: true, column: "customer_name" },
    { key: "company_name", label: "Company Name", type: "text", required: true, column: null },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: false, column: "customer_phone" },
    { key: "service_type", label: "Session Type", type: "select_services", required: true, column: "service_type" },
    { key: "booking_date", label: "Preferred Date", type: "date", required: true, column: "booking_date" },
    { key: "booking_time", label: "Preferred Time", type: "time", required: true, column: "booking_time" },
    { key: "notes", label: "Notes", type: "text", required: false, column: "notes" },
  ],

  tutoring_education: [
    { key: "customer_name", label: "Student Full Name", type: "text", required: true, column: "customer_name" },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: true, column: "customer_phone" },
    { key: "service_type", label: "Session Type", type: "select_services", required: true, column: "service_type" },
    { key: "booking_date", label: "Preferred Date", type: "date", required: true, column: "booking_date" },
    { key: "booking_time", label: "Preferred Time", type: "time", required: true, column: "booking_time" },
    { key: "notes", label: "Notes / Learning Goals", type: "text", required: false, column: "notes" },
  ],

  home_services_trades: [
    { key: "customer_name", label: "Full Name", type: "text", required: true, column: "customer_name" },
    { key: "customer_email", label: "Email", type: "email", required: true, column: "customer_email" },
    { key: "customer_phone", label: "Phone Number", type: "tel", required: true, column: "customer_phone" },
    { key: "service_type", label: "Type of Work", type: "select_services", required: true, column: "service_type" },
    { key: "booking_date", label: "Preferred Date", type: "date", required: true, column: "booking_date" },
    {
      key: "time_window",
      label: "Preferred Time Window",
      type: "time_window",
      required: true,
      column: null,
      options: [
        { label: "Morning (8–12)", value: "morning", booking_time: "08:00" },
        { label: "Afternoon (12–5)", value: "afternoon", booking_time: "12:00" },
        { label: "Flexible", value: "flexible", booking_time: "09:00" },
      ],
    },
    { key: "notes", label: "Notes", type: "text", required: false, column: "notes" },
  ],
};

export const RESERVED_CUSTOM_FIELD_KEYS = new Set([
  "customer_name",
  "customer_email",
  "customer_phone",
  "booking_date",
  "booking_time",
  "service_type",
  "booth_type",
  "package_duration",
  "event_location",
  "parking_info",
  "quantity",
  "price",
  "notes",
  "time_window",
]);

