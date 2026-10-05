import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { FullPageLoading } from '../components/common/LoadingSpinner';

/**
 * Wraps the landing, login and signup pages. A signed-in user never sees them:
 * they go straight into the app. While the saved session is still being
 * checked we show a loader instead of flashing the landing page.
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <FullPageLoading />;

  if (session) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    return <Navigate to={from && from !== '/' ? from : '/browse'} replace />;
  }

  return <>{children}</>;
}
