import { useState } from 'react';
import { ClaimStatusBadge } from './ClaimStatusBadge';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { acceptClaim, rejectClaim } from '../../api/claims';
import { FULFILLMENT_METHOD_LABELS } from '../../types/domain';
import type { DonationClaim } from '../../types/domain';
import { getErrorMessage } from '../../utils/errors';

export function ClaimList({
  claims,
  onChange,
  readOnly = false,
}: {
  claims: DonationClaim[];
  onChange: () => void;
  readOnly?: boolean;
}) {
  const { showToast } = useToast();
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function handleAccept(claimId: string) {
    setActingOn(claimId);
    try {
      await acceptClaim(claimId);
      showToast('success', 'Claim accepted.');
      onChange();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not accept claim.'));
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(claimId: string) {
    setActingOn(claimId);
    try {
      await rejectClaim(claimId);
      showToast('success', 'Claim declined.');
      onChange();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not decline claim.'));
    } finally {
      setActingOn(null);
    }
  }

  if (claims.length === 0) {
    return <p className="text-sm text-ink-500">No requests yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {claims.map((c) => (
        <div key={c.id} className="rounded-md border border-base-700 bg-base-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-100">{c.claimant?.fullName ?? 'A recipient'}</p>
              <p className="mt-0.5 text-xs text-ink-500">
                {FULFILLMENT_METHOD_LABELS[c.fulfillmentMethod]}
                {c.organization && ` · on behalf of ${c.organization.name}`}
              </p>
              {c.message && <p className="mt-1.5 text-sm text-ink-300">"{c.message}"</p>}
            </div>
            <ClaimStatusBadge status={c.status} />
          </div>
          {c.status === 'pending' && !readOnly && (
            <div className="mt-3 flex gap-2">
              <Button loading={actingOn === c.id} onClick={() => handleAccept(c.id)}>
                Accept
              </Button>
              <Button variant="secondary" loading={actingOn === c.id} onClick={() => handleReject(c.id)}>
                Decline
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
