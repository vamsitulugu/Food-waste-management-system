import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { submitReport } from '../../api/reports';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export function ReportDonationButton({ donationId }: { donationId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      showToast('error', 'Please describe the issue.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReport(session!.user.id, { reportedDonationId: donationId, reason: reason.trim() });
      setSubmitted(true);
      showToast('success', 'Report submitted. Thank you.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <p className="text-xs text-ink-500">Report submitted for review.</p>;
  }

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} className="text-xs text-ink-700 hover:text-danger-400">
        Report this donation
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-base-700 bg-base-900 p-4">
      <Input label="What's wrong with this donation?" value={reason} onChange={(e) => setReason(e.target.value)} required />
      <div className="flex gap-2">
        <Button variant="danger" loading={submitting} onClick={handleSubmit}>
          Submit report
        </Button>
        <Button variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
