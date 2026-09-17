import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DonationForm } from '../components/donations/DonationForm';
import { createDonation } from '../api/donations';
import type { DonationInput } from '../api/donations';
import { getErrorMessage } from '../utils/errors';

export function NewDonationPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(input: DonationInput) {
    setSubmitting(true);
    try {
      const donation = await createDonation(session!.user.id, input);
      showToast('success', 'Draft created. Add photos, then publish when ready.');
      navigate(`/donations/${donation.id}/edit`, { replace: true });
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not create donation.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl text-ink-100">New donation</h1>
      <p className="mt-1 text-sm text-ink-500">
        This saves as a draft first — you'll add photos and publish it on the next screen.
      </p>
      <div className="mt-6">
        <DonationForm submitLabel="Save draft" submitting={submitting} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
