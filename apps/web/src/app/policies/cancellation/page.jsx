function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  return "https://www.do-book.com";
}

export function generateMetadata() {
  const base = resolveSiteUrl();
  const title = "Cancellation Policy | DoBook";
  const description = "General cancellation and no-show policy guidance for bookings created through DoBook.";

  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: { canonical: "/policies/cancellation" },
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

export default function CancellationPolicyPage() {
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
              Cancellation Policy
            </h1>
            <p className="text-sm text-zinc-600">Effective date: February 18, 2026</p>
            <p className="text-sm text-zinc-600">
              This page provides default guidance for bookings created through DoBook. Individual businesses may apply
              their own cancellation and refund policies.
            </p>
          </header>

          <Section title="For customers booking with a business">
            <ul className="list-disc pl-5 space-y-2">
              <li>Contact the business as soon as possible if you need to cancel or reschedule.</li>
              <li>Some businesses may charge a cancellation or no-show fee.</li>
              <li>Refunds (if any) are handled by the business according to their policy.</li>
            </ul>
          </Section>

          <Section title="For businesses using DoBook (recommended defaults)">
            <p>To reduce no-shows, consider setting and communicating a clear policy such as:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">Reschedule:</span> free reschedule up to 24 hours before the appointment.
              </li>
              <li>
                <span className="font-medium">Cancellation:</span> allow cancellation up to 24 hours before; late
                cancellations may incur a fee.
              </li>
              <li>
                <span className="font-medium">No-shows:</span> may be charged in full or partially, depending on your
                industry.
              </li>
              <li>
                <span className="font-medium">Deposits:</span> if you collect deposits, specify whether they are
                refundable and under what conditions.
              </li>
            </ul>
          </Section>

          <Section title="Reminder messages">
            <p>
              DoBook can send booking confirmations and reminders based on your plan and configuration. Delivery is not
              guaranteed (e.g., spam filters, carrier issues, user inbox rules). You should still maintain your own
              operational processes for confirmations and changes.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              If you’re a customer, contact the business you booked with. If you’re a DoBook user and need help, contact{" "}
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

