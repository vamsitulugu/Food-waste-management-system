import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RoleSelector } from '../components/auth/RoleSelector';
import { Button } from '../components/common/Button';
import { setInitialRole } from '../api/profile';
import type { UserRole } from '../types/database';
import { getErrorMessage } from '../utils/errors';

export function ChooseRolePage() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState<Exclude<UserRole, 'admin'> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Role is one-time-only — once set, this screen isn't reachable again.
  if (profile?.role) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleContinue() {
    if (!role) {
      setError('Choose an option to continue.');
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await setInitialRole(role);
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not save your choice.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-xl text-ink-100">Second Serving</p>
        </div>
        <div className="rounded-lg border border-base-700 bg-base-900 p-8">
          <h1 className="font-display text-2xl text-ink-100">How will you use the platform?</h1>
          <p className="mt-1 text-sm text-ink-500">
            Pick one to get started — this sets up your dashboard.
          </p>

          <div className="mt-6">
            <RoleSelector value={role} onChange={setRole} />
            {error && <p className="mt-2 text-sm text-danger-400">{error}</p>}
          </div>

          <Button className="mt-6 w-full" loading={submitting} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
