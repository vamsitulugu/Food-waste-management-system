import { Home, Package, ClipboardList, Bookmark, Truck, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** One source of truth for the desktop bar and the mobile menu. */
export const MAIN_NAV: NavItem[] = [
  { to: '/browse', label: 'Home', icon: Home },
  { to: '/my-donations', label: 'My Donations', icon: Package },
  { to: '/my-claims', label: 'My Requests', icon: ClipboardList },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/volunteer/tasks', label: 'Deliveries', icon: Truck },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
];
