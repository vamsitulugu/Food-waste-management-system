import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { fetchContactPhone } from '../../api/profile';

interface ContactCardProps {
  label: string;
  name: string;
  targetProfileId: string;
  donationId: string;
}

/** Shows a phone number (with tap-to-call) once the database allows it. */
export function ContactCard({ label, name, targetProfileId, donationId }: ContactCardProps) {
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-base-800 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">{label}</p>
        <p className="truncate text-sm font-medium text-ink-100">{name}</p>
      </div>
      {phone === undefined ? (
        <span className="text-xs text-ink-500">Loading…</span>
      ) : phone ? (
        <a
          href={`tel:${phone}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white hover:bg-brand-400"
        >
          <Phone size={13} /> {phone}
        </a>
      ) : (
        <span className="text-xs text-ink-500">No phone shared</span>
      )}
    </div>
  );
}
