import { useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../context/ToastContext';
import { fetchAllUsers, provisionAdmin } from '../../api/admin';
import { deactivateAccount } from '../../api/profile';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/States';
import { ROLE_LABELS } from '../../types/domain';

export function AdminUsersPage() {
  const { data: users, loading, error, refetch } = useAsyncData(fetchAllUsers);
  const { showToast } = useToast();
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function handleDeactivate(userId: string) {
    setActingOn(userId);
    try {
      await deactivateAccount(userId);
      showToast('success', 'Account deactivated.');
      refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not deactivate account.');
    } finally {
      setActingOn(null);
    }
  }

  async function handlePromote(userId: string) {
    setActingOn(userId);
    try {
      await provisionAdmin(userId);
      showToast('success', 'User promoted to admin.');
      refetch();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not promote user.');
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-100">Users</h1>

      {loading && <LoadingSpinner label="Loading users" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {users && (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-md border border-base-700 bg-base-900 px-4 py-3">
              <div>
                <p className="text-sm text-ink-100">{u.fullName}</p>
                <p className="text-xs text-ink-500">
                  {ROLE_LABELS[u.role]} {!u.isActive && '· Deactivated'}
                </p>
              </div>
              {u.isActive && u.role !== 'admin' && (
                <div className="flex gap-2">
                  <Button variant="ghost" loading={actingOn === u.id} onClick={() => handlePromote(u.id)}>
                    Promote to admin
                  </Button>
                  <Button variant="danger" loading={actingOn === u.id} onClick={() => handleDeactivate(u.id)}>
                    Deactivate
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
