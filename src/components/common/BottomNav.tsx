import { NavLink } from 'react-router-dom';
import { Home, Search, Package, ClipboardList, Truck, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TabItem {
  to: string;
  label: string;
  icon: typeof Home;
}

export function BottomNav() {
  const { profile } = useAuth();
  if (!profile) return null;

  const tabs: TabItem[] = [{ to: '/dashboard', label: 'Home', icon: Home }, { to: '/browse', label: 'Browse', icon: Search }];

  if (profile.role === 'donor' || profile.role === 'ngo') {
    tabs.push({ to: '/my-donations', label: 'Donations', icon: Package });
  }
  if (profile.role === 'recipient' || profile.role === 'ngo') {
    tabs.push({ to: '/my-claims', label: 'Requests', icon: ClipboardList });
  }
  if (profile.role === 'volunteer') {
    tabs.push({ to: '/volunteer/my-tasks', label: 'Tasks', icon: Truck });
  }
  if (profile.role === 'admin') {
    tabs.push({ to: '/admin', label: 'Admin', icon: ShieldCheck });
  }
  tabs.push({ to: '/profile', label: 'Profile', icon: User });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-base-700 bg-base-900/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-6xl">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                isActive ? 'text-brand-400' : 'text-ink-500'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
