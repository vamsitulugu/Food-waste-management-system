import { NavLink } from 'react-router-dom';

const tab = ({ isActive }: { isActive: boolean }) =>
  `flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition-colors ${
    isActive ? 'bg-brand-500 text-white shadow-sm' : 'text-ink-300 hover:bg-base-800'
  }`;

/** Shared switcher between open delivery tasks and the volunteer's own tasks. */
export function DeliveriesTabs() {
  return (
    <div className="flex max-w-sm gap-1 rounded-xl bg-base-900 p-1 shadow-card">
      <NavLink to="/volunteer/tasks" className={tab} end>
        Available
      </NavLink>
      <NavLink to="/volunteer/my-tasks" className={tab} end>
        My deliveries
      </NavLink>
    </div>
  );
}
