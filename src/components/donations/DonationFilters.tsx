import { Search, Leaf, Timer } from 'lucide-react';
import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import type { FoodCategory } from '../../types/database';
import type { BrowseFilters } from '../../api/donations';
import { CATEGORY_EMOJI } from '../../utils/foodEmoji';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];


function Pill({
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
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-colors
        ${
          active
            ? 'border-brand-500 bg-brand-700/10 text-brand-400'
            : 'border-base-600 bg-base-900 text-ink-300 hover:bg-base-800'
        }`}
    >
      {children}
    </button>
  );
}

function CategoryTile({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center"
    >
      <span
        className={`flex h-[68px] w-[68px] items-center justify-center rounded-full text-3xl transition-all
          ${
            active
              ? 'bg-brand-700/15 ring-2 ring-brand-500 ring-offset-2 ring-offset-base-950'
              : 'bg-base-900 shadow-card group-hover:shadow-card-hover'
          }`}
      >
        {emoji}
      </span>
      <span className={`text-xs font-semibold leading-tight ${active ? 'text-brand-400' : 'text-ink-300'}`}>{label}</span>
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
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" />
        <input
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Search for meals, bakery, produce…"
          className="w-full rounded-2xl border border-base-700 bg-base-900 py-3.5 pl-11 pr-4 text-sm font-medium text-ink-100 shadow-card outline-none placeholder:font-normal placeholder:text-ink-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
        />
      </div>

      <div>
        <p className="mb-3 font-display text-lg text-ink-100">What&apos;s on your mind?</p>
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          <CategoryTile
            active={!filters.category}
            onClick={() => onChange({ ...filters, category: undefined })}
            emoji="✨"
            label="All"
          />
          {CATEGORIES.map((c) => (
            <CategoryTile
              key={c}
              active={filters.category === c}
              onClick={() => onChange({ ...filters, category: filters.category === c ? undefined : c })}
              emoji={CATEGORY_EMOJI[c]}
              label={FOOD_CATEGORY_LABELS[c]}
            />
          ))}
        </div>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Pill
          active={filters.isVegetarian === true}
          onClick={() => onChange({ ...filters, isVegetarian: filters.isVegetarian === true ? undefined : true })}
        >
          <span className="inline-flex items-center gap-1.5">
            <Leaf size={14} /> Pure veg
          </span>
        </Pill>
        <Pill
          active={filters.sortBy === 'expiring_soon'}
          onClick={() =>
            onChange({ ...filters, sortBy: filters.sortBy === 'expiring_soon' ? 'newest' : 'expiring_soon' })
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Timer size={14} /> Ending soon
          </span>
        </Pill>
      </div>
    </div>
  );
}
