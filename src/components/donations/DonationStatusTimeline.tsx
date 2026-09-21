import { Check } from 'lucide-react';
import type { DonationStatus, FulfillmentMethod } from '../../types/database';

const SELF_PICKUP_STEPS: { status: DonationStatus; label: string }[] = [
  { status: 'available', label: 'Listed' },
  { status: 'claimed', label: 'Claimed' },
  { status: 'completed', label: 'Picked up' },
];

const VOLUNTEER_STEPS: { status: DonationStatus; label: string }[] = [
  { status: 'available', label: 'Listed' },
  { status: 'pickup_assigned', label: 'Volunteer assigned' },
  { status: 'picked_up', label: 'Picked up' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

const TERMINAL: DonationStatus[] = ['cancelled', 'expired', 'rejected'];

export function DonationStatusTimeline({
  status,
  fulfillmentMethod,
}: {
  status: DonationStatus;
  fulfillmentMethod?: FulfillmentMethod;
}) {
  if (TERMINAL.includes(status)) {
    const label = status === 'cancelled' ? 'Cancelled' : status === 'expired' ? 'Expired' : 'Removed';
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-base-700 bg-base-900 shadow-card px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-danger-400" />
        <span className="text-sm text-ink-300">{label}</span>
      </div>
    );
  }

  const steps = fulfillmentMethod === 'volunteer_assisted' ? VOLUNTEER_STEPS : SELF_PICKUP_STEPS;
  const currentIndex = steps.findIndex((s) => s.status === status);
  // Statuses like 'draft' or a mismatched fulfillment step: treat as before the first step.
  const activeIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const done = i < activeIndex || (i === activeIndex && status === 'completed');
        const current = i === activeIndex && status !== 'completed';
        return (
          <div key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-medium
                  ${
                    done
                      ? 'border-brand-400 bg-brand-400 text-base-950'
                      : current
                        ? 'border-brand-400 text-brand-400'
                        : 'border-base-700 text-ink-700'
                  }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </div>
              <span className={`w-16 text-center text-[11px] leading-tight ${done || current ? 'text-ink-300' : 'text-ink-700'}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${i < activeIndex ? 'bg-brand-400' : 'bg-base-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
