import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { FullPageLoading } from '../components/common/LoadingSpinner';
import type { UserRole } from '../types/database';

interface RequireAuthProps {
  children: ReactNode;
  /** If provided, only these roles may view the route. */
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
        <p className="max-w-sm text-sm text-ink-300">
          We couldn't load your account details. Try refreshing the page, or sign out and back in.
        </p>
      </div>
    );
  }

  if (!profile.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-950 px-4 text-center">
        <p className="max-w-sm text-sm text-ink-300">
          This account has been deactivated. Contact support if you believe this is a mistake.
        </p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
