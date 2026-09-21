import { Outlet, useNavigate, Link, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { roleLabel } from '../../types/domain';
import { Logo } from './Logo';
import { NotificationBell } from '../notifications/NotificationBell';
import { BottomNav } from './BottomNav';

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

  const initial = profile?.fullName?.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-base-950">
      <header className="sticky top-0 z-20 bg-base-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" aria-label="Second Serving home">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 text-sm font-semibold text-ink-300 md:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 transition-colors ${
                      isActive ? 'bg-brand-700/10 text-brand-400' : 'hover:bg-base-800 hover:text-ink-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          {profile && (
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-base-800 sm:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-sm font-bold text-white">
                  {initial}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-sm font-semibold text-ink-100">{profile.fullName}</span>
                  <span className="block text-xs text-ink-500">{roleLabel(profile.role)}</span>
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-base-800 hover:text-brand-400 md:flex"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
