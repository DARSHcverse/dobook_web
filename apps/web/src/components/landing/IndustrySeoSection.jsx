// Server component (no "use client"): renders unique, indexable HTML per
// industry so each /industries/* page is genuinely distinct content for Google.

export default function IndustrySeoSection({ content }) {
  if (!content) return null;
  const { label, h1, intro, benefits = [], useCases = [], faq = [] } = content;

  return (
    <section className="mx-auto max-w-5xl px-6 md:px-12 py-14">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">{label}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "Manrope" }}>
          {h1}
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600" style={{ fontFamily: "Inter" }}>
          {intro}
        </p>
      </header>

      {benefits.length > 0 && (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-base font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>{b.title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-600">{b.desc}</p>
            </div>
          ))}
        </div>
      )}

      {useCases.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>
            Perfect for {label.toLowerCase()}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {useCases.map((u) => (
              <li key={u} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700">
                {u}
              </li>
            ))}
          </ul>
        </div>
      )}

      {faq.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>
            Frequently asked questions
          </h2>
          <dl className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {faq.map((item) => (
              <div key={item.q} className="p-5">
                <dt className="font-medium text-zinc-900">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-6 text-zinc-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
