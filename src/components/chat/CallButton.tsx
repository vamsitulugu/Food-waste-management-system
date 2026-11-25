import { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { fetchContactPhone } from '../../api/profile';

interface CallButtonProps {
  targetProfileId: string;
  donationId: string;
  name: string;
  /** Compact = icon + first name (used in the chat header). */
  compact?: boolean;
}

/** Tap-to-call button. The number is fetched through the access-controlled RPC. */
export function CallButton({ targetProfileId, donationId, name, compact = false }: CallButtonProps) {
  const [phone, setPhone] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchContactPhone(targetProfileId, donationId)
      .then((p) => !cancelled && setPhone(p))
      .catch(() => !cancelled && setPhone(null));
    return () => {
      cancelled = true;
    };
  }, [targetProfileId, donationId]);

  const firstName = name.split(' ')[0] || name;

  if (phone === undefined) {
    return <span className="h-9 w-24 animate-pulse rounded-xl bg-base-800" aria-label="Loading phone number" />;
  }

  if (!phone) {
    return (
      <span
        title={`${name} has not added a phone number yet — use chat instead`}
        className="inline-flex items-center gap-1.5 rounded-xl bg-base-800 px-3 py-2 text-xs font-semibold text-ink-500"
      >
        <PhoneOff size={14} /> {compact ? `${firstName}: no number` : 'No number shared'}
      </span>
    );
  }

  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className="inline-flex items-center gap-1.5 rounded-xl bg-success-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-success-400 active:scale-[0.98]"
      aria-label={`Call ${name} on ${phone}`}
    >
      <Phone size={14} />
      {compact ? `Call ${firstName}` : phone}
    </a>
  );
}
