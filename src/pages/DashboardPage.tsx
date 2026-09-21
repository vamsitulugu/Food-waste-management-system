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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-600 px-6 py-8 text-white shadow-card-hover sm:px-10 sm:py-10">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
        <p className="relative text-sm font-semibold uppercase tracking-wide text-white/80">
          {roleLabel(profile.role)}
        </p>
        <h1 className="font-display relative mt-1 text-3xl sm:text-4xl">Hey {profile.fullName.split(' ')[0]}, hungry to help?</h1>
        <p className="relative mt-2 max-w-md text-sm text-white/90">
          Every meal rescued is a meal not wasted. Pick up where you left off below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {links.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 rounded-2xl bg-base-900 p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700/15 text-brand-500">
              <Icon size={20} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-ink-100">{label}</p>
              <p className="mt-0.5 text-sm text-ink-500">{description}</p>
            </div>
            <ArrowRight size={16} className="mt-1 shrink-0 text-brand-500 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
