import { NavLink } from 'react-router-dom';
import { Home, Package, ClipboardList, User, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
    isActive ? 'text-brand-500' : 'text-ink-500'
  }`;

/** Mobile tab bar — same five tabs for everyone, with Donate as the raised centre action. */
export function BottomNav() {
  const { profile } = useAuth();
  if (!profile) return null;

  const tabs = [
    { to: '/browse', label: 'Home', icon: Home },
    { to: '/my-donations', label: 'Donations', icon: Package },
    null,
    { to: '/my-claims', label: 'Requests', icon: ClipboardList },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-base-700 bg-base-900 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
      <div className="mx-auto flex max-w-6xl items-end">
        {tabs.map((tab) =>
          tab ? (
            <NavLink key={tab.to} to={tab.to} className={tabClass}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-brand-500" />}
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ) : (
            <NavLink
              key="donate"
              to="/donations/new"
              aria-label="Donate food"
              className="relative flex flex-1 flex-col items-center pb-2 text-[11px] font-bold text-brand-500"
            >
              <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-white shadow-lg shadow-brand-500/40 ring-4 ring-base-900">
                <Plus size={28} strokeWidth={3} />
              </span>
              Donate
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
}
