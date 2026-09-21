import { ArrowRight, Camera } from 'lucide-react';

/** Big call-to-action card shown at the top of the home screen. */
export function DonateCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-600 p-6 text-left text-white shadow-card-hover transition-transform hover:-translate-y-0.5 sm:p-8"
    >
      <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 right-28 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 gap-3 text-6xl sm:flex">
        <span className="-rotate-6">🍲</span>
        <span className="mt-6 rotate-6">🥗</span>
      </div>

      <div className="relative max-w-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
          <Camera size={13} /> Photo + 5 quick details
        </span>
        <h2 className="font-display mt-3 text-2xl leading-tight sm:text-3xl">Got extra food? Donate it in a minute.</h2>
        <p className="mt-2 text-sm text-white/90">
          Snap a picture, tell us what it is and where to pick it up — someone nearby will take it.
        </p>
        <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-400 shadow-md transition-transform group-hover:translate-x-0.5">
          Donate food <ArrowRight size={16} />
        </span>
      </div>
    </button>
  );
}
