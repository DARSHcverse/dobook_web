function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export function generateMetadata() {
  const base = resolveSiteUrl();
  const title = "Terms of Service | DoBook";
  const description = "DoBook terms of service for businesses using the booking and invoicing platform.";

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/terms" },
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

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-sm text-zinc-600">Effective date: February 18, 2026</p>
            <p className="text-sm text-zinc-600">
              These terms apply to DoBook (“DoBook”, “we”, “us”) and the DoBook website and services (the “Service”).
            </p>
            <p className="text-xs text-zinc-500">
              Template notice: this page is general information and not legal advice. Please review with your lawyer.
            </p>
          </header>

          <Section title="1) Who can use DoBook">
            <p>
              You must be at least 18 years old and able to form a binding contract to use the Service. If you use the
              Service on behalf of a business, you represent you have authority to bind that business.
            </p>
          </Section>

          <Section title="2) Your account and security">
            <p>
              You are responsible for your account credentials and all activity under your account. You must provide
              accurate information and keep it up to date. Notify us promptly if you suspect unauthorized access.
            </p>
          </Section>

          <Section title="3) The Service (bookings, invoices, reminders)">
            <p>
              DoBook provides tools to accept and manage bookings, send emails/reminders, and generate invoices. You are
              responsible for the content you send, the services you deliver to your customers, your prices, taxes, and
              compliance obligations.
            </p>
            <p>
              The Service may change over time. We may add, remove, or modify features, and we may suspend the Service
              for maintenance.
            </p>
          </Section>

          <Section title="4) Customer data and communications consent">
            <p>
              When you collect customer information (e.g., name, email, phone), you must have a lawful basis to collect
              and use it, and you must provide any required disclosures to your customers.
            </p>
            <p>
              You may only send booking confirmations and reminders to customers who have provided their details for
              that purpose. You must honor opt-out requests and comply with applicable marketing and anti-spam laws.
            </p>
          </Section>

          <Section title="5) Payments, subscriptions, and fees">
            <p>
              If you purchase a paid plan, you agree to the pricing and billing terms presented at checkout. Fees are
              non-refundable except where required by law. We may change pricing with reasonable notice.
            </p>
          </Section>

          <Section title="6) Prohibited use">
            <p>You must not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for unlawful, harmful, or deceptive activities.</li>
              <li>Send spam or unsolicited messages.</li>
              <li>Attempt to bypass security, rate limits, or access controls.</li>
              <li>Reverse engineer or misuse the Service, except to the extent permitted by law.</li>
            </ul>
          </Section>

          <Section title="7) Intellectual property">
            <p>
              We own the Service and its intellectual property. You retain ownership of your content. You grant us a
              limited license to host and process your content solely to provide the Service.
            </p>
          </Section>

          <Section title="8) Third-party services">
            <p>
              The Service may integrate with third-party providers (e.g., email delivery, payments, hosting). Their
              terms and policies may apply to your use of those services.
            </p>
          </Section>

          <Section title="9) Disclaimers">
            <p>
              The Service is provided “as is” and “as available”. We do not guarantee uninterrupted or error-free
              operation. DoBook does not provide legal, tax, accounting, or compliance advice.
            </p>
          </Section>

          <Section title="10) Limitation of liability">
            <p>
              To the maximum extent permitted by law, DoBook will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill. Our total liability
              for claims relating to the Service is limited to the amount you paid to DoBook in the 3 months before the
              event giving rise to the claim.
            </p>
          </Section>

          <Section title="11) Termination">
            <p>
              You can stop using the Service at any time. We may suspend or terminate access if you violate these terms
              or if required to protect the Service or other users.
            </p>
          </Section>

          <Section title="12) Changes to these terms">
            <p>
              We may update these terms from time to time. If changes are material, we will provide reasonable notice.
              Continued use of the Service after changes become effective constitutes acceptance.
            </p>
          </Section>

          <Section title="13) Contact">
            <p>
              Questions about these terms? Contact us at{" "}
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

