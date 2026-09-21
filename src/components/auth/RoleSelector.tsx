import { PUBLIC_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../types/domain';
import type { UserRole } from '../../types/database';

interface RoleSelectorProps {
  value: Exclude<UserRole, 'admin'> | null;
  onChange: (role: Exclude<UserRole, 'admin'>) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Account type">
      {PUBLIC_ROLES.map((role) => {
        const selected = value === role;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(role)}
            className={`rounded-2xl border-2 px-4 py-3.5 text-left transition-colors
              ${selected ? 'border-brand-500 bg-brand-700/10' : 'border-base-700 bg-base-900 hover:border-brand-500/40'}`}
          >
            <p className="text-sm font-bold text-ink-100">{ROLE_LABELS[role]}</p>
            <p className="mt-0.5 text-sm text-ink-500">{ROLE_DESCRIPTIONS[role]}</p>
          </button>
        );
      })}
    </div>
  );
}
