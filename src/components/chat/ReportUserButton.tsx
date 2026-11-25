import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitReport } from '../../api/reports';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../common/Button';
import type { ChatParticipant } from '../../types/domain';
import { CHAT_PARTY_LABELS } from '../../types/domain';

const REASONS = ['Abusive or rude messages', 'Spam or scam', 'Unsafe or fake food', 'No-show / did not turn up', 'Other'];

/** "Report" control for the chat header — files a report against another person on this pickup. */
export function ReportUserButton({ people, claimId }: { people: ChatParticipant[]; claimId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(people[0]?.profileId ?? '');
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  if (people.length === 0) return null;

  async function submit() {
    if (!session?.user || !target) return;
    setSending(true);
    try {
      await submitReport(session.user.id, {
        reportedProfileId: target,
        reason,
        details: `[chat ${claimId}] ${details.trim()}`.trim(),
      });
      showToast('success', 'Report sent to our team. Thank you.');
      setOpen(false);
      setDetails('');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not send report.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setTarget((t) => t || people[0].profileId);
          setOpen((v) => !v);
        }}
        aria-label="Report a user"
        title="Report"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-base-800 hover:text-danger-400"
      >
        <Flag size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-72 rounded-2xl border border-base-700 bg-base-900 p-4 shadow-card-hover">
          <p className="text-sm font-bold text-ink-100">Report someone</p>
          {people.length > 1 && (
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-3 w-full rounded-xl border border-base-600 bg-base-900 px-3 py-2 text-sm text-ink-100"
              aria-label="Who are you reporting?"
            >
              {people.map((p) => (
                <option key={p.profileId} value={p.profileId}>
                  {p.fullName} ({CHAT_PARTY_LABELS[p.party]})
                </option>
              ))}
            </select>
          )}
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 w-full rounded-xl border border-base-600 bg-base-900 px-3 py-2 text-sm text-ink-100"
            aria-label="Reason"
          >
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Add details (optional)"
            className="mt-2 w-full resize-none rounded-xl border border-base-600 bg-base-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700"
          />
          <div className="mt-3 flex gap-2">
            <Button variant="danger" loading={sending} onClick={submit}>
              Send report
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
