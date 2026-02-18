export default function LegalLinks({ className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${className}`}>
      <a href="/terms" className="text-zinc-600 hover:text-zinc-900 hover:underline">
        Terms
      </a>
      <a href="/privacy" className="text-zinc-600 hover:text-zinc-900 hover:underline">
        Privacy
      </a>
      <a href="/policies/cancellation" className="text-zinc-600 hover:text-zinc-900 hover:underline">
        Cancellation policy
      </a>
    </div>
  );
}

