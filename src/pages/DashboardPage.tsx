import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
  PlusCircle,
  Package,
  Search,
  ClipboardList,
  Building2,
  Truck,
  ListChecks,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../types/domain';

interface QuickLink {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const ROLE_QUICK_LINKS: Record<string, QuickLink[]> = {
  donor: [
    { to: '/donations/new', label: 'Create a donation', description: 'List surplus food for pickup.', icon: PlusCircle },
    { to: '/my-donations', label: 'My donations', description: 'View status and history.', icon: Package },
  ],
  recipient: [
    { to: '/browse', label: 'Browse donations', description: 'Find available food nearby.', icon: Search },
    { to: '/my-claims', label: 'My requests', description: "Track what you've claimed.", icon: ClipboardList },
  ],
  ngo: [
    { to: '/browse', label: 'Browse donations', description: 'Find available food to distribute.', icon: Search },
    { to: '/organizations', label: 'Your organization', description: 'Manage verification and members.', icon: Building2 },
    { to: '/my-claims', label: 'My requests', description: 'Track claims made on behalf of your org.', icon: ClipboardList },
  ],
  volunteer: [
    { to: '/volunteer/tasks', label: 'Open tasks', description: 'Find a pickup or delivery to help with.', icon: Truck },
    { to: '/volunteer/my-tasks', label: 'My tasks', description: 'Track your active and past deliveries.', icon: ListChecks },
  ],
  admin: [
    { to: '/admin', label: 'Admin dashboard', description: 'Platform stats and moderation queues.', icon: ShieldCheck },
  ],
};

export function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;

  const links = profile.role ? ROLE_QUICK_LINKS[profile.role] ?? [] : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100">Welcome, {profile.fullName.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">Signed in as {roleLabel(profile.role)}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 rounded-2xl border border-base-700 bg-base-900 p-5 transition-colors hover:border-base-600"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700/15 text-brand-400">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink-100">{label}</p>
              <p className="mt-0.5 text-sm text-ink-500">{description}</p>
            </div>
            <ArrowRight size={16} className="mt-1 shrink-0 text-ink-700 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
