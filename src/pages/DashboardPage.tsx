import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../types/domain';
import { Button } from '../components/common/Button';

interface QuickLink {
  to: string;
  label: string;
  description: string;
}

const ROLE_QUICK_LINKS: Record<string, QuickLink[]> = {
  donor: [
    { to: '/donations/new', label: 'Create a donation', description: 'List surplus food for pickup.' },
    { to: '/my-donations', label: 'My donations', description: 'View status and history.' },
  ],
  recipient: [
    { to: '/browse', label: 'Browse donations', description: 'Find available food nearby.' },
    { to: '/my-claims', label: 'My requests', description: 'Track what you\'ve claimed.' },
  ],
  ngo: [
    { to: '/browse', label: 'Browse donations', description: 'Find available food to distribute.' },
    { to: '/organizations', label: 'Your organization', description: 'Manage verification and members.' },
    { to: '/my-claims', label: 'My requests', description: 'Track claims made on behalf of your org.' },
  ],
  volunteer: [
    { to: '/volunteer/tasks', label: 'Open tasks', description: 'Find a pickup or delivery to help with.' },
    { to: '/volunteer/my-tasks', label: 'My tasks', description: 'Track your active and past deliveries.' },
  ],
  admin: [
    { to: '/admin', label: 'Admin dashboard', description: 'Platform stats and moderation queues.' },
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
        {links.map((link) => (
          <div key={link.to} className="rounded-lg border border-base-700 bg-base-900 p-6">
            <p className="font-medium text-ink-100">{link.label}</p>
            <p className="mt-1 text-sm text-ink-500">{link.description}</p>
            <Link to={link.to} className="mt-4 inline-block">
              <Button variant="secondary">Go</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
