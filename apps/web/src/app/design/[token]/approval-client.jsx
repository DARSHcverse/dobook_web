"use client";

// Customer-facing design approval. Reached only from the emailed link, with no
// account and no login — the token in the URL is the credential.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DesignApprovalClient({ token }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [feedback, setFeedback] = useState("");
  const [showChanges, setShowChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/design/${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        if (cancelled) return;
        setState({ loading: false, data: json, error: "" });
        if (json?.status && json.status !== "pending") setDone(json.status);
        // The email's two buttons deep-link straight to the right action.
        if (searchParams?.get("action") === "changes") setShowChanges(true);
      } catch {
        if (!cancelled) {
          setState({ loading: false, data: null, error: "This design link is no longer valid." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, searchParams]);

  const respond = useCallback(
    async (action) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/public/design/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, feedback: action === "changes" ? feedback : "" }),
        });
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        setDone(json?.status || (action === "approve" ? "approved" : "changes_requested"));
      } catch {
        setState((s) => ({ ...s, error: "Something went wrong. Please try again." }));
      } finally {
        setSubmitting(false);
      }
    },
    [token, feedback],
  );

  if (state.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <p className="text-sm text-zinc-500">Loading your design…</p>
      </main>
    );
  }

  if (state.error && !state.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>
            Link not found
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{state.error}</p>
        </div>
      </main>
    );
  }

  const d = state.data || {};
  const label = d.kind === "monogram" ? "monogram" : "photo strip";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center">
          {d.business_logo ? (
            <img
              src={d.business_logo}
              alt={d.business_name || "Business"}
              className="mx-auto h-12 w-auto object-contain"
            />
          ) : (
            <div className="text-base font-semibold text-zinc-900" style={{ fontFamily: "Manrope" }}>
              {d.business_name}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1
            className="text-xl font-bold tracking-tight text-zinc-900"
            style={{ fontFamily: "Manrope" }}
          >
            {d.customer_first_name ? `Hi ${d.customer_first_name}, ` : ""}your {label} is ready
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600">
            {d.business_name} designed this for your event
            {d.booking_date ? ` on ${d.booking_date}` : ""}.
          </p>

          {d.preview_url ? (
            <div className="mt-5 flex justify-center rounded-xl border border-zinc-200 bg-[repeating-conic-gradient(#f4f4f5_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-5">
              <img
                src={d.preview_url}
                alt={`Your ${label} design`}
                className="max-h-[420px] w-auto rounded-lg shadow"
              />
            </div>
          ) : null}

          {done ? (
            <div
              className={`mt-6 rounded-xl border p-4 text-center text-sm ${
                done === "approved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {done === "approved"
                ? "Thanks! Your design is approved — we'll have it ready on the day."
                : "Thanks — we've passed your notes to the team and they'll be in touch."}
            </div>
          ) : (
            <>
              {state.error ? (
                <p className="mt-4 text-center text-sm text-rose-600">{state.error}</p>
              ) : null}

              {showChanges ? (
                <div className="mt-6 space-y-3">
                  <label htmlFor="design-feedback" className="block text-sm font-medium text-zinc-800">
                    What would you like changed?
                  </label>
                  <textarea
                    id="design-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="e.g. could the date be larger, and our surname spelled Smyth?"
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-full border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                      onClick={() => setShowChanges(false)}
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      onClick={() => respond("changes")}
                      disabled={submitting || !feedback.trim()}
                    >
                      {submitting ? "Sending…" : "Send request"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    className="w-full rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    onClick={() => respond("approve")}
                    disabled={submitting}
                  >
                    {submitting ? "Saving…" : "Approve design"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-full border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                    onClick={() => setShowChanges(true)}
                    disabled={submitting}
                  >
                    Request a change
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">Powered by DoBook</p>
      </div>
    </main>
  );
}
