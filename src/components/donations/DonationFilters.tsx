import { Search, Leaf } from 'lucide-react';
import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import type { FoodCategory } from '../../types/database';
import type { BrowseFilters } from '../../api/donations';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors
        ${active ? 'border-brand-400 bg-brand-700/20 text-brand-300' : 'border-base-700 text-ink-300 hover:border-base-600'}`}
    >
      {children}
    </button>
  );
}

export function DonationFilters({
  filters,
  onChange,
}: {
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
        <input
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Search donations…"
          className="w-full rounded-full border border-base-700 bg-base-900 py-2.5 pl-9 pr-4 text-sm text-ink-100 outline-none placeholder:text-ink-700 focus:border-brand-400"
        />
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        <Chip active={!filters.category} onClick={() => onChange({ ...filters, category: undefined })}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={filters.category === c} onClick={() => onChange({ ...filters, category: c })}>
            {FOOD_CATEGORY_LABELS[c]}
          </Chip>
        ))}
        <Chip
          active={filters.isVegetarian === true}
          onClick={() => onChange({ ...filters, isVegetarian: filters.isVegetarian === true ? undefined : true })}
        >
          <span className="inline-flex items-center gap-1">
            <Leaf size={13} /> Veg only
          </span>
        </Chip>
        <Chip
          active={filters.sortBy === 'expiring_soon'}
          onClick={() =>
            onChange({ ...filters, sortBy: filters.sortBy === 'expiring_soon' ? 'newest' : 'expiring_soon' })
          }
        >
          Ending soon
        </Chip>
      </div>
    </div>
  );
}
