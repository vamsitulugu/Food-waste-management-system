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
            className={`rounded-md border px-4 py-3 text-left transition-colors
              ${selected ? 'border-brand-400 bg-brand-700/15' : 'border-base-700 bg-base-900 hover:border-base-600'}`}
          >
            <p className="text-sm font-medium text-ink-100">{ROLE_LABELS[role]}</p>
            <p className="mt-0.5 text-sm text-ink-500">{ROLE_DESCRIPTIONS[role]}</p>
          </button>
        );
      })}
    </div>
  );
}
