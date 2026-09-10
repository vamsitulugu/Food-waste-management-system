import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useToast } from '../../context/ToastContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { createClaim } from '../../api/claims';
import { fetchMyOrganizations } from '../../api/organizations';
import { FULFILLMENT_METHOD_LABELS } from '../../types/domain';
import type { FulfillmentMethod } from '../../types/database';

const METHODS = Object.keys(FULFILLMENT_METHOD_LABELS) as FulfillmentMethod[];

export function ClaimButton({ donationId, onClaimed }: { donationId: string; onClaimed: () => void }) {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState<FulfillmentMethod>('self_pickup');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: myOrgs } = useAsyncData(fetchMyOrganizations);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createClaim(donationId, method, organizationId || null, message.trim() || undefined);
      showToast('success', 'Claim submitted. The donor will review it.');
      setExpanded(false);
      onClaimed();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not submit claim.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return <Button onClick={() => setExpanded(true)}>Request this donation</Button>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-base-700 bg-base-900 p-5">
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Fulfillment method">
        {METHODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`rounded-md border px-4 py-3 text-left text-sm transition-colors
              ${method === m ? 'border-brand-400 bg-brand-700/15 text-ink-100' : 'border-base-700 text-ink-300 hover:border-base-600'}`}
          >
            {FULFILLMENT_METHOD_LABELS[m]}
          </button>
        ))}
      </div>

      {myOrgs && myOrgs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="claim-org" className="text-sm text-ink-300">
            Claiming as
          </label>
          <select
            id="claim-org"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="rounded-md border border-base-700 bg-base-850 px-3 py-2.5 text-sm text-ink-100"
          >
            <option value="">Myself</option>
            {myOrgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Input label="Message to the donor (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="flex gap-3">
        <Button loading={submitting} onClick={handleSubmit}>
          Submit request
        </Button>
        <Button variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
