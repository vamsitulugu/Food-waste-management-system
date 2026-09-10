import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABELS } from '../../types/domain';
import { Button } from './Button';
import { NotificationBell } from '../notifications/NotificationBell';

export function AppShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      showToast('error', 'Could not sign out. Please try again.');
    }
  }

  const navLinks: { to: string; label: string }[] = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/browse', label: 'Browse' },
  ];

  if (profile?.role === 'donor' || profile?.role === 'ngo') {
    navLinks.push({ to: '/my-donations', label: 'My Donations' });
  }
  if (profile?.role === 'recipient' || profile?.role === 'ngo') {
    navLinks.push({ to: '/my-claims', label: 'My Requests' });
    navLinks.push({ to: '/saved', label: 'Saved' });
  }
  if (profile?.role === 'volunteer') {
    navLinks.push({ to: '/volunteer/tasks', label: 'Open Tasks' });
    navLinks.push({ to: '/volunteer/my-tasks', label: 'My Tasks' });
  }
  navLinks.push({ to: '/organizations', label: 'Organizations' });
  if (profile?.role === 'admin') {
    navLinks.push({ to: '/admin', label: 'Admin' });
  }

  return (
    <div className="min-h-screen bg-base-950">
      <header className="border-b border-base-700 bg-base-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="font-display text-lg text-ink-100">
              Second Serving
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-ink-300 md:flex">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className="hover:text-ink-100">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link to="/profile" className="text-right">
                <p className="text-sm text-ink-100">{profile.fullName}</p>
                <p className="text-xs text-ink-500">{ROLE_LABELS[profile.role]}</p>
              </Link>
              <Button variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
        <nav className="flex flex-wrap gap-4 border-t border-base-800 px-4 py-2 text-sm text-ink-300 md:hidden">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-ink-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
