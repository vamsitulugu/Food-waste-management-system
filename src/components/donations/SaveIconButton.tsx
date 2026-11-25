import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { saveDonation, unsaveDonation } from '../../api/savedDonations';
import { getErrorMessage } from '../../utils/errors';

/** Round bookmark button for cards. Safe to place inside a <Link>. */
export function SaveIconButton({
  donationId,
  initialSaved,
  onChange,
}: {
  donationId: string;
  initialSaved: boolean;
  onChange?: (saved: boolean) => void;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle(e: MouseEvent) {
    e.preventDefault(); // don't follow the card link
    e.stopPropagation();
    if (!session?.user || busy) return;
    const next = !saved;
    setSaved(next); // optimistic
    setBusy(true);
    try {
      if (next) await saveDonation(session.user.id, donationId);
      else await unsaveDonation(session.user.id, donationId);
      showToast('success', next ? 'Saved for later.' : 'Removed from saved.');
      onChange?.(next);
    } catch (err) {
      setSaved(!next);
      showToast('error', getErrorMessage(err, 'Could not update saved donations.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save for later'}
      className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-all active:scale-90 ${
        saved ? 'bg-brand-500 text-white' : 'bg-white/90 text-ink-300 hover:text-brand-500'
      }`}
    >
      <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
