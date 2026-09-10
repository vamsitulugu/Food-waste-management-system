import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { createOrganization } from '../api/organizations';
import { ORG_TYPE_LABELS } from '../types/domain';
import type { OrgType } from '../types/database';

const ORG_TYPES = Object.keys(ORG_TYPE_LABELS) as OrgType[];

export function NewOrganizationPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState<OrgType>('ngo');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 160) {
      setNameError('Organization name must be between 2 and 160 characters.');
      return;
    }
    setNameError(undefined);
    setSubmitting(true);
    try {
      const org = await createOrganization(session!.user.id, {
        name: trimmed,
        orgType,
        registrationNumber: registrationNumber.trim() || undefined,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
      });
      showToast('success', 'Organization created. You are its owner.');
      navigate(`/organizations/${org.id}`, { replace: true });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not create organization.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl text-ink-100">New organization</h1>
      <p className="mt-1 text-sm text-ink-500">
        You'll become its owner and can invite other members afterwards.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <Input label="Organization name" value={name} onChange={(e) => setName(e.target.value)} error={nameError} required />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-type" className="text-sm text-ink-300">
            Type
          </label>
          <select
            id="org-type"
            value={orgType}
            onChange={(e) => setOrgType(e.target.value as OrgType)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-brand-400"
          >
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Registration number (optional)"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-description" className="text-sm text-ink-300">
            Description (optional)
          </label>
          <textarea
            id="org-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-brand-400"
          />
        </div>

        <Input label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />

        <div>
          <Button type="submit" loading={submitting}>
            Create organization
          </Button>
        </div>
      </form>
    </div>
  );
}
