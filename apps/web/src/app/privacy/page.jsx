function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export function generateMetadata() {
  const base = resolveSiteUrl();
  const title = "Privacy Policy | DoBook";
  const description = "DoBook privacy policy describing how we collect and use personal information.";

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/privacy" },
    robots: { index: true, follow: true },
  };
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="text-sm text-zinc-700 leading-6 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
            <span aria-hidden>←</span> Back to DoBook
          </a>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:p-10 space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "Manrope" }}>
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-600">Effective date: February 18, 2026</p>
            <p className="text-sm text-zinc-600">
              This policy explains how DoBook (“we”, “us”) collects, uses, and shares information when you use the
              Service.
            </p>
          </header>

          <Section title="1) Information we collect">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Account and business info:</span> email, business name, phone, and
                subscription plan.
              </li>
              <li>
                <span className="font-medium">Booking/customer info (entered by you):</span> customer name, email,
                phone, booking details, and notes.
              </li>
              <li>
                <span className="font-medium">Usage and device data:</span> basic logs (e.g., IP address, browser type)
                used for security and performance.
              </li>
            </ul>
          </Section>

          <Section title="2) How we use information">
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide and improve the Service (bookings, invoices, reminders).</li>
              <li>Send transactional emails (e.g., confirmations and reminders).</li>
              <li>Prevent fraud, abuse, and security incidents.</li>
              <li>Process billing and subscriptions for paid plans.</li>
              <li>Support and communications about your account.</li>
            </ul>
          </Section>

          <Section title="3) How we share information">
            <p>
              We may share information with service providers that help us run DoBook (for example, email delivery,
              payment processing, hosting, and analytics). We only share what is necessary to provide the Service.
            </p>
            <p>
              We may also share information if required by law, to protect rights and safety, or in connection with a
              business transaction (e.g., merger or acquisition).
            </p>
          </Section>

          <Section title="4) Your responsibilities (business users)">
            <p>
              If you use DoBook to store your customers’ information, you are responsible for providing appropriate
              notices to your customers and complying with privacy and communication laws in your jurisdiction.
            </p>
          </Section>

          <Section title="5) Data retention">
            <p>
              We retain information for as long as needed to provide the Service, comply with legal obligations, resolve
              disputes, and enforce agreements. You may request deletion of your account subject to legal and operational
              requirements.
            </p>
          </Section>

          <Section title="6) Security">
            <p>
              We use reasonable administrative, technical, and organizational measures to protect information. No method
              of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="7) Cookies">
            <p>
              DoBook may use cookies and similar technologies to keep you signed in, remember preferences, and measure
              performance.
            </p>
          </Section>

          <Section title="8) International users">
            <p>
              If you access DoBook from outside the country where our servers are located, your information may be
              processed and stored in that country.
            </p>
          </Section>

          <Section title="9) Changes to this policy">
            <p>
              We may update this policy from time to time. If changes are material, we will provide reasonable notice.
            </p>
          </Section>

          <Section title="10) Contact">
            <p>
              Privacy questions? Email{" "}
              <a className="text-rose-600 hover:underline" href="mailto:privacy@do-book.com">
                privacy@do-book.com
              </a>{" "}
              or{" "}
              <a className="text-rose-600 hover:underline" href="mailto:support@do-book.com">
                support@do-book.com
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

