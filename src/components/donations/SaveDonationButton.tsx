import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isDonationSaved, saveDonation, unsaveDonation } from '../../api/savedDonations';
import { getErrorMessage } from '../../utils/errors';

export function SaveDonationButton({ donationId }: { donationId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    isDonationSaved(session.user.id, donationId)
      .then((v) => {
        if (!cancelled) setSaved(v);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, donationId]);

  async function handleToggle() {
    if (!session?.user) return;
    setToggling(true);
    try {
      if (saved) {
        await unsaveDonation(session.user.id, donationId);
        setSaved(false);
      } else {
        await saveDonation(session.user.id, donationId);
        setSaved(true);
      }
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update saved donations.'));
    } finally {
      setToggling(false);
    }
  }

  if (loading) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors
        ${saved ? 'border-warm-500/40 bg-warm-600/10 text-warm-400' : 'border-base-700 text-ink-300 hover:border-base-600'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
