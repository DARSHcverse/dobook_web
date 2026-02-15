"use client";

export default function SplashScreen({ open }) {
  if (!open) return null;

  return (
    <div
      className="dobook-splash fixed inset-0 z-[100] flex items-center justify-center bg-white"
      role="status"
      aria-live="polite"
      aria-label="Loading DoBook"
    >
      <div className="flex flex-col items-center gap-4 px-8">
        <div className="dobook-splash-logo relative">
          <div className="dobook-splash-halo absolute inset-[-22px] rounded-full" aria-hidden="true" />
          <img
            src="/brand/dobook-logo.png"
            alt="DoBook"
            className="relative h-24 w-auto select-none"
            draggable={false}
          />
        </div>
        <div className="text-zinc-700 text-sm tracking-wide">
          Opening DoBook
          <span className="dobook-splash-dot dobook-splash-dot-1" aria-hidden="true">
            .
          </span>
          <span className="dobook-splash-dot dobook-splash-dot-2" aria-hidden="true">
            .
          </span>
          <span className="dobook-splash-dot dobook-splash-dot-3" aria-hidden="true">
            .
          </span>
        </div>
      </div>
    </div>
  );
}
