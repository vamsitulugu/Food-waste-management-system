import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import type { FoodCategory } from '../../types/database';
import type { BrowseFilters } from '../../api/donations';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];

export function DonationFilters({
  filters,
  onChange,
}: {
  filters: BrowseFilters;
  onChange: (next: BrowseFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-search" className="text-xs text-ink-500">
          Search
        </label>
        <input
          id="filter-search"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Title contains…"
          className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100 outline-none focus:border-brand-400"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-category" className="text-xs text-ink-500">
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category ?? ''}
          onChange={(e) => onChange({ ...filters, category: (e.target.value || undefined) as FoodCategory | undefined })}
          className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100"
        >
          <option value="">Any</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {FOOD_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-veg" className="text-xs text-ink-500">
          Diet
        </label>
        <select
          id="filter-veg"
          value={filters.isVegetarian === undefined ? '' : filters.isVegetarian ? 'yes' : 'no'}
          onChange={(e) =>
            onChange({
              ...filters,
              isVegetarian: e.target.value === '' ? undefined : e.target.value === 'yes',
            })
          }
          className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100"
        >
          <option value="">Any</option>
          <option value="yes">Vegetarian</option>
          <option value="no">Non-vegetarian</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-sort" className="text-xs text-ink-500">
          Sort by
        </label>
        <select
          id="filter-sort"
          value={filters.sortBy ?? 'newest'}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value as BrowseFilters['sortBy'] })}
          className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100"
        >
          <option value="newest">Newest first</option>
          <option value="expiring_soon">Pickup deadline soonest</option>
        </select>
      </div>
    </div>
  );
}
