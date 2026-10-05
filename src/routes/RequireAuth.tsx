import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { FullPageLoading } from '../components/common/LoadingSpinner';
import { signOut } from '../api/auth';
import type { UserRole } from '../types/database';

function SignOutButton() {
  return (
    <button
      onClick={() => void signOut().then(() => window.location.assign('/login'))}
      className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-400"
    >
      Sign out
    </button>
  );
}

interface RequireAuthProps {
  children: ReactNode;
  /** Only used for admin-only routes. Everyone else has the same access. */
  allowedRoles?: UserRole[];
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { session, profile, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <FullPageLoading />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    // Session exists but the profile failed to load — this points to a
    // backend inconsistency (see AuthContext.loadProfile). Don't render
    // role-gated UI against a null profile.
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-950 px-4 text-center">
        <div className="flex max-w-sm flex-col items-center">
          <p className="text-sm text-ink-300">
            We couldn't load your account details. Try refreshing the page, or sign out and back in.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  if (!profile.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-950 px-4 text-center">
        <div className="flex max-w-sm flex-col items-center">
          <p className="text-sm text-ink-300">
            This account has been deactivated. Contact support if you believe this is a mistake.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  if (allowedRoles && (!profile.role || !allowedRoles.includes(profile.role))) {
    return <Navigate to="/browse" replace />;
  }

  return <>{children}</>;
}
