import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, Plus, Shield, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { Logo } from './Logo';
import { NotificationBell } from '../notifications/NotificationBell';
import { MAIN_NAV } from './navLinks';

/** Active when the path is the link or any child of it (e.g. /volunteer/my-tasks under Deliveries). */
function isSectionActive(pathname: string, to: string) {
  if (to === '/volunteer/tasks') return pathname.startsWith('/volunteer');
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isAdmin = profile?.role === 'admin';
  const initial = profile?.fullName?.trim().charAt(0).toUpperCase() || '?';

  // Close the menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // While open: lock page scroll, close on Escape, move focus into the menu, restore on close.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const toggle = toggleRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      toggle?.focus();
    };
  }, [menuOpen]);

  // If the window grows to desktop size while the menu is open, close it.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      setMenuOpen(false);
      navigate('/login', { replace: true });
    } catch {
      showToast('error', 'Could not sign out. Please try again.');
    }
  }

  const desktopLink = (active: boolean) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      active ? 'bg-brand-700/10 text-brand-400' : 'text-ink-300 hover:bg-base-800 hover:text-ink-100'
    }`;

  const drawerLink = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
      active ? 'bg-brand-700/10 text-brand-400' : 'text-ink-300 hover:bg-base-800'
    }`;

  return (
    <div className="min-h-screen bg-base-950">
      <header className="sticky top-0 z-30 bg-base-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/browse" aria-label="Second Serving home" className="shrink-0">
            <Logo />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="ml-4 hidden min-w-0 items-center gap-0.5 lg:flex">
            {MAIN_NAV.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() => desktopLink(isSectionActive(location.pathname, link.to))}
              >
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={() => desktopLink(location.pathname.startsWith('/admin'))}>
                Admin
              </NavLink>
            )}
          </nav>

          {profile && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                to="/donations/new"
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-500/25 transition-colors hover:bg-brand-400 sm:inline-flex"
              >
                <Plus size={16} strokeWidth={3} /> Donate
              </Link>
              <NotificationBell />
              <Link
                to="/profile"
                aria-label="Your profile"
                className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-base-800 lg:flex xl:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-sm font-bold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-ink-100 xl:block">
                  {profile.fullName}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-base-800 hover:text-brand-400 lg:flex"
              >
                <LogOut size={18} />
              </button>
              <button
                ref={toggleRef}
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-100 transition-colors hover:bg-base-800 lg:hidden"
              >
                <Menu size={24} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile / tablet menu */}
      <div className={`lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <div
          onClick={() => setMenuOpen(false)}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-xs flex-col bg-base-900 shadow-2xl transition-transform duration-200 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-base-700 px-4">
            <span className="font-display text-lg text-ink-100">Menu</span>
            <button
              ref={closeRef}
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-100 hover:bg-base-800"
              tabIndex={menuOpen ? 0 : -1}
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            {profile && (
              <Link
                to="/profile"
                tabIndex={menuOpen ? 0 : -1}
                className="mb-3 flex items-center gap-3 rounded-2xl bg-base-950 p-3"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-base font-bold text-white">
                  {initial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink-100">{profile.fullName}</span>
                  <span className="block text-xs text-ink-500">View profile</span>
                </span>
              </Link>
            )}

            <Link
              to="/donations/new"
              tabIndex={menuOpen ? 0 : -1}
              className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-base font-bold text-white shadow-md shadow-brand-500/25"
            >
              <Plus size={18} strokeWidth={3} /> Donate food
            </Link>

            <nav aria-label="Mobile" className="flex flex-col gap-1">
              {MAIN_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  tabIndex={menuOpen ? 0 : -1}
                  className={() => drawerLink(isSectionActive(location.pathname, to))}
                >
                  <Icon size={20} /> {label}
                </NavLink>
              ))}
              <NavLink to="/profile" tabIndex={menuOpen ? 0 : -1} className={() => drawerLink(location.pathname === '/profile')}>
                <User size={20} /> Profile &amp; settings
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  tabIndex={menuOpen ? 0 : -1}
                  className={() => drawerLink(location.pathname.startsWith('/admin'))}
                >
                  <Shield size={20} /> Admin
                </NavLink>
              )}
            </nav>
          </div>

          <div className="shrink-0 border-t border-base-700 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={handleSignOut}
              tabIndex={menuOpen ? 0 : -1}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold text-ink-300 hover:bg-base-800"
            >
              <LogOut size={20} /> Sign out
            </button>
          </div>
        </aside>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
