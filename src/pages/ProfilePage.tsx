import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { updateProfile, fetchPhone, updatePhone, deactivateAccount } from '../api/profile';
import { uploadAvatar, getAvatarUrl, deleteAvatarFile, validateImageFile } from '../api/storage';
import { signOut } from '../api/auth';
import { roleLabel } from '../types/domain';

export function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profile?.avatarUrl) {
      setAvatarPreviewUrl(null);
      return;
    }
    let cancelled = false;
    getAvatarUrl(profile.avatarUrl).then((url) => {
      if (!cancelled) setAvatarPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.avatarUrl]);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetchPhone(session.user.id)
      .then((p) => {
        if (!cancelled) setPhone(p ?? '');
      })
      .catch(() => {
        if (!cancelled) showToast('error', 'Could not load your phone number.');
      })
      .finally(() => {
        if (!cancelled) setPhoneLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  if (!profile || !session) return null;

  async function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setUploadingAvatar(true);
    try {
      const oldPath = profile!.avatarUrl;
      const newPath = await uploadAvatar(session!.user.id, file);
      await updateProfile(session!.user.id, { avatarUrl: newPath });
      if (oldPath) {
        await deleteAvatarFile(oldPath).catch(() => undefined);
      }
      await refreshProfile();
      showToast('success', 'Profile photo updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    const trimmed = fullName.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setNameError('Full name must be between 1 and 120 characters.');
      return;
    }
    setNameError(undefined);
    setSavingProfile(true);
    try {
      await updateProfile(session!.user.id, { fullName: trimmed });
      await refreshProfile();
      showToast('success', 'Profile updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    try {
      await updatePhone(session!.user.id, phone.trim() || null);
      showToast('success', 'Phone number updated.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update phone number.');
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await deactivateAccount(session!.user.id);
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not deactivate account.');
      setDeactivating(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink-100">Your profile</h1>
        <p className="mt-1 text-sm text-ink-500">{roleLabel(profile.role)}</p>
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-base-700 bg-base-900 p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-800 text-lg text-ink-500">
          {avatarPreviewUrl ? (
            <img src={avatarPreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.fullName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-base-700 px-3 py-2 text-sm text-ink-300 hover:border-base-600">
            {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </label>
          <p className="mt-1 text-xs text-ink-700">JPEG, PNG, or WebP, up to 5MB.</p>
        </div>
      </div>

      <div className="rounded-lg border border-base-700 bg-base-900 p-6">
        <h2 className="text-sm font-medium text-ink-100">Profile ID</h2>
        <p className="mt-1 text-sm text-ink-500">
          Share this with an organization owner to be added as a member. It's not sensitive on
          its own — it doesn't reveal your contact details.
        </p>
        <code className="mt-3 block break-all rounded-md bg-base-850 px-3 py-2 text-xs text-ink-300">
          {session.user.id}
        </code>
      </div>

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 rounded-lg border border-base-700 bg-base-900 p-6">
        <h2 className="text-sm font-medium text-ink-100">Basic details</h2>
        <Input
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={nameError}
          required
        />
        <div>
          <Button type="submit" loading={savingProfile}>
            Save
          </Button>
        </div>
      </form>

      <form onSubmit={handleSavePhone} className="flex flex-col gap-4 rounded-lg border border-base-700 bg-base-900 p-6">
        <div>
          <h2 className="text-sm font-medium text-ink-100">Phone number</h2>
          <p className="mt-1 text-sm text-ink-500">
            Kept private. Only shared with the other party during an active pickup you're
            personally involved in.
          </p>
        </div>
        {phoneLoading ? (
          <LoadingSpinner label="Loading" />
        ) : (
          <>
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Not set"
            />
            <div>
              <Button type="submit" loading={savingPhone}>
                Save
              </Button>
            </div>
          </>
        )}
      </form>

      <div className="rounded-lg border border-danger-500/30 bg-base-900 p-6">
        <h2 className="text-sm font-medium text-ink-100">Deactivate account</h2>
        <p className="mt-1 text-sm text-ink-500">
          Your name and phone number will be removed and you'll be signed out. Your donation and
          claim history is preserved for record-keeping but will show as "Deleted User."
        </p>
        {!confirmingDeactivate ? (
          <Button variant="danger" className="mt-4" onClick={() => setConfirmingDeactivate(true)}>
            Deactivate my account
          </Button>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm text-danger-400">Are you sure? This can't be undone by you.</p>
            <Button variant="danger" loading={deactivating} onClick={handleDeactivate}>
              Confirm
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingDeactivate(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
