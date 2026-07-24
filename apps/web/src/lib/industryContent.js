// Unique, SEO-differentiated content per industry landing page.
// Each entry gives Google genuinely distinct content (headline, intro, benefits,
// use cases, FAQ) so /industries/* pages get indexed instead of being treated
// as duplicates of the homepage.

export const INDUSTRY_CONTENT = {
  photobooth: {
    label: "Photo Booth",
    slug: "photobooth",
    title: "Online Booking System for Photo Booth Businesses | DoBook",
    metaDescription:
      "Take photo booth bookings online 24/7. DoBook handles event enquiries, quotes, deposits, travel fees, and reminders — built for photo booth hire businesses.",
    h1: "The booking system built for photo booth businesses",
    intro:
      "Stop juggling DMs and spreadsheets. DoBook gives your photo booth hire business a professional enquiry-to-booking flow — customers pick a package, get an instant quote, pay a deposit, and you both get automatic reminders before the event.",
    benefits: [
      { title: "Event enquiry & quote flow", desc: "A branded multi-step form captures event date, venue, package and guest count, then sends an instant quote." },
      { title: "Travel fees calculated automatically", desc: "Charge by distance from your base — DoBook works out the travel fee from the event address." },
      { title: "Deposits & payment links", desc: "Secure the date with a deposit and share a payment link so you get paid on time." },
      { title: "SMS & email reminders", desc: "Cut no-shows and last-minute cancellations with automatic reminders before every event." },
    ],
    useCases: ["Weddings", "Birthday parties", "Corporate events", "School formals", "Engagement parties"],
    faq: [
      { q: "Can customers request a quote before paying?", a: "Yes. DoBook's enquiry flow lets customers submit event details and receive an instant or manual quote before any payment." },
      { q: "Does it handle travel fees for events?", a: "Yes — set your rate per km and free radius, and DoBook calculates the travel fee from the event address automatically." },
      { q: "Can I take a deposit to lock in the date?", a: "Yes. You can require a deposit and send a secure payment link so the booking is confirmed." },
    ],
  },
  salon: {
    label: "Salons & Barbershops",
    slug: "salon",
    title: "Booking System for Salons & Barbershops | DoBook",
    metaDescription:
      "Let clients book haircuts, colour and treatments online 24/7. DoBook is appointment scheduling software for salons and barbershops — with reminders that cut no-shows.",
    h1: "Online booking for salons and barbershops",
    intro:
      "Fill your chairs without the phone tag. DoBook lets clients book haircuts, colour, and treatments online any time, choose their service and stylist, and get automatic reminders — so you spend less time on admin and more behind the chair.",
    benefits: [
      { title: "Service & stylist selection", desc: "Clients pick the exact service and preferred stylist, so every booking arrives with the right details." },
      { title: "Fewer no-shows", desc: "Automatic SMS and email reminders keep your columns full and your day predictable." },
      { title: "Buffer times between clients", desc: "Set clean-up buffers so back-to-back bookings never overlap." },
      { title: "Client history & notes", desc: "Keep colour formulas and preferences on file for every returning client." },
    ],
    useCases: ["Haircuts", "Colour & balayage", "Blow dry & styling", "Beard trims", "Treatments"],
    faq: [
      { q: "Can clients choose their stylist?", a: "Yes. Clients select the service and their preferred staff member when booking." },
      { q: "Will it reduce no-shows?", a: "Automatic reminders by SMS and email significantly reduce no-shows for salons and barbershops." },
      { q: "Can I set time between appointments?", a: "Yes — set buffer times so you have room to clean up and reset between clients." },
    ],
  },
  doctor: {
    label: "Clinics & Practitioners",
    slug: "doctor",
    title: "Appointment Booking System for Clinics & Practitioners | DoBook",
    metaDescription:
      "Let patients book consultations online with confidential intake notes. DoBook is appointment scheduling software for clinics, allied health and wellness practitioners.",
    h1: "Appointment booking for clinics and practitioners",
    intro:
      "Give patients an easy way to book while keeping sensitive details private. DoBook handles consultations, follow-ups and treatments with confidential intake fields, and sends reminders so patients turn up prepared.",
    benefits: [
      { title: "Confidential intake fields", desc: "Collect reason-for-visit and health notes marked private, visible only to your practice." },
      { title: "Consultation & follow-up types", desc: "Offer initial consults, follow-ups and treatment sessions with the right durations." },
      { title: "Reminders that reduce no-shows", desc: "48-hour and 2-hour reminders keep your schedule full and patients on time." },
      { title: "Professional, trusted booking page", desc: "A clean, branded page reassures patients booking their first appointment." },
    ],
    useCases: ["Initial consultations", "Follow-up visits", "Treatment sessions", "Assessments"],
    faq: [
      { q: "Is patient information kept private?", a: "Yes. Intake fields can be marked private so health details are visible only to your practice, never on public-facing views." },
      { q: "Can I offer different appointment types?", a: "Yes — set up consultations, follow-ups and treatments each with their own duration and details." },
      { q: "Does it send appointment reminders?", a: "Yes, automatic email and SMS reminders help reduce missed appointments." },
    ],
  },
  consultant: {
    label: "Consultants",
    slug: "consultant",
    title: "Booking System for Consultants & Coaches | DoBook",
    metaDescription:
      "Let clients book paid discovery calls and strategy sessions online. DoBook is scheduling software for consultants and coaches — with deposits and meeting-format options.",
    h1: "Online scheduling for consultants and coaches",
    intro:
      "Turn interest into booked, paid sessions. DoBook lets clients book discovery calls, strategy sessions and workshops, choose video or in-person, and pay a deposit up front — so your calendar fills with committed clients.",
    benefits: [
      { title: "Paid sessions & deposits", desc: "Require a deposit or full payment so only serious clients take your time." },
      { title: "Meeting format selection", desc: "Clients choose video, phone or in-person when they book." },
      { title: "Advance-notice controls", desc: "Set minimum lead time so you're never booked with no prep." },
      { title: "Company & goal capture", desc: "Every booking arrives with the client's company and the goal for the session." },
    ],
    useCases: ["Discovery calls", "Strategy sessions", "Ongoing retainers", "Workshops"],
    faq: [
      { q: "Can I charge for a consultation up front?", a: "Yes. You can require a deposit or full payment via a secure link before the session is confirmed." },
      { q: "Can clients choose video or in-person?", a: "Yes — meeting format is a booking option, so you know how to prepare." },
      { q: "Can I stop last-minute bookings?", a: "Yes, set a minimum advance-notice window so you always have prep time." },
    ],
  },
  tutor: {
    label: "Tutors & Educators",
    slug: "tutor",
    title: "Booking System for Tutors & Educators | DoBook",
    metaDescription:
      "Let students and parents book lessons and classes online. DoBook is scheduling software for tutors — with recurring sessions, subject capture and reminders.",
    h1: "Lesson booking for tutors and educators",
    intro:
      "Spend your time teaching, not scheduling. DoBook lets students and parents book one-on-one sessions, group classes and trials, capture the subject and year level, and set up recurring lessons with automatic reminders.",
    benefits: [
      { title: "Recurring lessons", desc: "Set up weekly sessions once and let reminders handle the rest." },
      { title: "Subject & level capture", desc: "Every booking includes the subject, student level and learning goals." },
      { title: "Parent/guardian details", desc: "Collect guardian contact details when the student is a minor." },
      { title: "Trial & group class options", desc: "Offer trials and group classes alongside one-on-one sessions." },
    ],
    useCases: ["One-on-one sessions", "Group classes", "Trial lessons", "Assessments"],
    faq: [
      { q: "Can I set up weekly recurring lessons?", a: "Yes. DoBook supports recurring bookings so regular students are scheduled automatically." },
      { q: "Can I collect parent details for minors?", a: "Yes — the booking form can capture guardian name and contact details." },
      { q: "Can I offer trial lessons?", a: "Yes, set up trials, group classes and one-on-one sessions as separate options." },
    ],
  },
  fitness: {
    label: "Fitness & Personal Trainers",
    slug: "fitness",
    title: "Booking System for Personal Trainers & Fitness | DoBook",
    metaDescription:
      "Let clients book PT sessions and classes online. DoBook is scheduling software for personal trainers and fitness businesses — with recurring bookings and reminders.",
    h1: "Booking software for personal trainers and fitness",
    intro:
      "Keep your sessions booked and your clients showing up. DoBook lets clients book one-on-one training, group classes and assessments, capture their goals and health notes, and set recurring sessions with reminders that reduce cancellations.",
    benefits: [
      { title: "Recurring PT sessions", desc: "Lock in regular clients with recurring bookings and automatic reminders." },
      { title: "Goal & health capture", desc: "Collect fitness goals and private health notes with every booking." },
      { title: "Group classes & 1:1", desc: "Offer group classes and one-on-one sessions side by side." },
      { title: "Fewer late cancellations", desc: "Reminders keep clients accountable and your schedule full." },
    ],
    useCases: ["One-on-one training", "Group classes", "Fitness assessments", "Trial sessions"],
    faq: [
      { q: "Can I book regular clients weekly?", a: "Yes. Recurring bookings keep your regulars scheduled without re-booking each time." },
      { q: "Can I collect health information?", a: "Yes — health notes can be marked private and collected at booking." },
      { q: "Does it work for group classes?", a: "Yes, offer group classes and one-on-one sessions as separate services." },
    ],
  },
  tradie: {
    label: "Tradies & Home Services",
    slug: "tradie",
    title: "Booking System for Tradies & Home Services | DoBook",
    metaDescription:
      "Take job bookings and quote requests online. DoBook is scheduling software for tradies and home services — with site addresses, photo uploads and travel fees.",
    h1: "Job booking for tradies and home services",
    intro:
      "Win more jobs without the back-and-forth. DoBook lets customers request quotes and book site visits online, upload photos of the job, share access instructions, and get reminders — so your days are planned and your quotes go out fast.",
    benefits: [
      { title: "Quote & inspection requests", desc: "Customers request a quote or book an inspection with all the job details up front." },
      { title: "Job address & photo uploads", desc: "Collect the site address, access notes and photos so you arrive prepared." },
      { title: "Travel fees by distance", desc: "Charge call-out and travel fees calculated from the job location." },
      { title: "Time-window bookings", desc: "Offer morning/afternoon windows that suit trade work." },
    ],
    useCases: ["Quotes & inspections", "Job bookings", "Follow-up visits", "Emergency call-outs"],
    faq: [
      { q: "Can customers upload photos of the job?", a: "Yes. The booking form can collect job photos and access instructions so you can quote accurately." },
      { q: "Can I charge a call-out or travel fee?", a: "Yes — set your rate and DoBook calculates travel fees from the job address." },
      { q: "Can customers pick a time window?", a: "Yes, offer morning/afternoon windows instead of exact times." },
    ],
  },
  cleaning: {
    label: "Cleaning Businesses",
    slug: "cleaning",
    title: "Booking System for Cleaning Businesses | DoBook",
    metaDescription:
      "Take cleaning bookings online 24/7. DoBook is scheduling software for cleaning businesses — with property details, recurring cleans, add-ons and travel fees.",
    h1: "Online booking for cleaning businesses",
    intro:
      "Fill your run sheet without the phone calls. DoBook lets customers book standard, deep and end-of-lease cleans online, tell you the property size and access details, add extras like oven or windows, and set up recurring cleans.",
    benefits: [
      { title: "Property details captured", desc: "Bedrooms, bathrooms, property type and access notes come with every booking." },
      { title: "Recurring cleans", desc: "Set up weekly or fortnightly cleans that reschedule themselves." },
      { title: "Add-ons at booking", desc: "Let customers add oven, windows, carpet or fridge cleaning to the job." },
      { title: "Travel fees by distance", desc: "Charge travel from your base for jobs outside your free radius." },
    ],
    useCases: ["Standard cleans", "Deep cleans", "End of lease", "Office cleaning", "Regular cleans"],
    faq: [
      { q: "Can customers add extras like oven cleaning?", a: "Yes. Add-ons such as oven, windows, carpet and fridge cleaning can be selected at booking." },
      { q: "Can I offer recurring cleans?", a: "Yes — set up weekly or fortnightly recurring bookings for regular clients." },
      { q: "Does it collect property size?", a: "Yes, the booking form captures bedrooms, bathrooms, property type and access details." },
    ],
  },
  pet: {
    label: "Pet Services & Grooming",
    slug: "pet",
    title: "Booking System for Pet Groomers & Sitters | DoBook",
    metaDescription:
      "Let owners book grooming, sitting and walking online. DoBook is scheduling software for pet businesses — with pet details, add-ons and reminders.",
    h1: "Online booking for pet groomers and sitters",
    intro:
      "Keep your day full of happy pets, not phone calls. DoBook lets owners book grooming, sitting and walking online, tell you the pet's breed, size and temperament, add extras like nail trims, and get reminders before every appointment.",
    benefits: [
      { title: "Pet details captured", desc: "Breed, size and temperament come with every booking so you're ready." },
      { title: "Grooming add-ons", desc: "Offer de-shedding, nail trims and teeth cleaning as booking extras." },
      { title: "Multiple services", desc: "Full grooms, baths, sitting and walking in one booking page." },
      { title: "Appointment reminders", desc: "Reminders keep owners on time and reduce no-shows." },
    ],
    useCases: ["Full grooms", "Bath & brush", "Nail trims", "Pet sitting", "Dog walking"],
    faq: [
      { q: "Can owners tell me the pet's breed and size?", a: "Yes. The booking form captures pet type, breed, size and temperament." },
      { q: "Can I offer grooming add-ons?", a: "Yes — de-shedding, nail trims and teeth cleaning can be added at booking." },
      { q: "Does it send reminders?", a: "Yes, automatic reminders reduce no-shows for grooming and sitting appointments." },
    ],
  },
  events: {
    label: "Photographers & Events",
    slug: "events",
    title: "Booking System for Photographers & Event Businesses | DoBook",
    metaDescription:
      "Take shoot and event bookings online. DoBook is scheduling software for photographers and event businesses — with quotes, deposits, venue details and travel fees.",
    h1: "Booking software for photographers and events",
    intro:
      "Book more shoots with less admin. DoBook lets clients enquire and book portrait sessions, weddings and event coverage online, capture the event type, venue and guest count, request a quote, and pay a deposit to lock the date.",
    benefits: [
      { title: "Enquiry & quote flow", desc: "Clients submit event details and receive a quote before committing." },
      { title: "Deposits secure the date", desc: "Require a deposit so your calendar holds only confirmed bookings." },
      { title: "Venue & guest details", desc: "Every booking includes the event type, venue and estimated guests." },
      { title: "Add-ons for packages", desc: "Offer extra hours, a second shooter or albums as booking add-ons." },
    ],
    useCases: ["Portrait sessions", "Wedding coverage", "Corporate events", "Product shoots", "Videography"],
    faq: [
      { q: "Can clients request a quote first?", a: "Yes. The enquiry flow captures event details and returns a quote before any payment." },
      { q: "Can I take a deposit to hold the date?", a: "Yes — require a deposit via a secure payment link to confirm the booking." },
      { q: "Can I offer package add-ons?", a: "Yes, extras like extra hours, a second shooter or albums can be added at booking." },
    ],
  },
  automotive: {
    label: "Mechanics & Auto Services",
    slug: "automotive",
    title: "Booking System for Mechanics & Auto Services | DoBook",
    metaDescription:
      "Let customers book servicing and repairs online. DoBook is scheduling software for mechanics and auto services — with vehicle details and mobile call-out options.",
    h1: "Online booking for mechanics and auto services",
    intro:
      "Keep your workshop booked without the phone ringing off the hook. DoBook lets customers book logbook servicing, repairs and detailing online, provide their vehicle make, model and rego, and choose drop-off or a mobile call-out.",
    benefits: [
      { title: "Vehicle details captured", desc: "Make, model, year and rego come with every booking." },
      { title: "Drop-off or mobile", desc: "Customers choose to drop off at the workshop or book a mobile visit." },
      { title: "Service types & add-ons", desc: "Offer logbook, basic service, detailing and extras like wheel alignment." },
      { title: "Reminders reduce no-shows", desc: "Automatic reminders keep the workshop schedule running." },
    ],
    useCases: ["Logbook servicing", "Basic servicing", "Detailing", "Diagnostics", "Mobile call-outs"],
    faq: [
      { q: "Can customers give their vehicle details?", a: "Yes. The booking form captures make, model, year and registration." },
      { q: "Can I offer a mobile call-out?", a: "Yes — customers choose drop-off at the workshop or a mobile visit." },
      { q: "Can I list different service types?", a: "Yes, offer logbook, basic servicing, detailing and diagnostics as separate options." },
    ],
  },
  beauty: {
    label: "Beauty & Spa",
    slug: "beauty",
    title: "Booking System for Beauty & Spa Businesses | DoBook",
    metaDescription:
      "Let clients book treatments online 24/7. DoBook is appointment scheduling software for beauty and spa businesses — with therapist selection and reminders.",
    h1: "Online booking for beauty and spa businesses",
    intro:
      "Fill your appointment book while you focus on clients. DoBook lets clients book massage, nails, lashes and facials online, choose their preferred therapist, note any allergies privately, and get reminders that keep your day on schedule.",
    benefits: [
      { title: "Treatment & therapist choice", desc: "Clients pick the treatment and preferred therapist when they book." },
      { title: "Private health notes", desc: "Collect allergies and health notes marked private for your team only." },
      { title: "Add-ons & extended sessions", desc: "Offer hot stones, aromatherapy and longer sessions as add-ons." },
      { title: "Reminders cut no-shows", desc: "Automatic reminders keep your treatment rooms fully booked." },
    ],
    useCases: ["Massage", "Manicures & pedicures", "Lash extensions", "Facials", "Waxing"],
    faq: [
      { q: "Can clients choose their therapist?", a: "Yes. Clients select the treatment and their preferred therapist at booking." },
      { q: "Can I collect allergy information privately?", a: "Yes — health and allergy notes can be marked private, visible only to your team." },
      { q: "Can I offer treatment add-ons?", a: "Yes, extras like hot stones, aromatherapy and extended sessions can be added." },
    ],
  },
  legal: {
    label: "Legal & Professional Advisors",
    slug: "legal",
    title: "Booking System for Legal & Professional Advisors | DoBook",
    metaDescription:
      "Let clients book consultations online with confidential intake. DoBook is scheduling software for lawyers, accountants and advisors — with deposits and matter capture.",
    h1: "Consultation booking for legal and professional advisors",
    intro:
      "Give clients a professional way to book while protecting sensitive information. DoBook lets clients book consultations and document reviews online, capture the matter type and company, keep confidential notes private, and pay a deposit up front.",
    benefits: [
      { title: "Confidential matter capture", desc: "Collect the matter type and confidential notes marked private for your firm." },
      { title: "Paid consultations", desc: "Require a deposit so consultations are booked by committed clients." },
      { title: "Meeting format options", desc: "Clients choose video, phone or in-person when booking." },
      { title: "Professional booking page", desc: "A clean, branded page builds trust from the first interaction." },
    ],
    useCases: ["Initial consultations", "Follow-up meetings", "Document reviews", "Ongoing retainers"],
    faq: [
      { q: "Is client information kept confidential?", a: "Yes. Matter details and notes can be marked private, visible only to your firm." },
      { q: "Can I charge for a consultation?", a: "Yes — require a deposit or payment via a secure link before confirming." },
      { q: "Can clients choose the meeting format?", a: "Yes, clients select video, phone or in-person when they book." },
    ],
  },
};

export function getIndustryContent(key) {
  return INDUSTRY_CONTENT[String(key || "").toLowerCase()] || null;
}

export const INDUSTRY_KEYS = Object.keys(INDUSTRY_CONTENT);
