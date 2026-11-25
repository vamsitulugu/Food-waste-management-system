import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchPlaces } from '../../utils/placeSearch';
import type { Place, SearchBias } from '../../utils/placeSearch';

interface PlaceSearchInputProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Called when the donor picks a suggestion: this is the exact point the tracking map will use. */
  onSelect: (place: Place) => void;
  /** True once a real location (suggestion, GPS or pin) is attached to the text. */
  hasPoint: boolean;
  error?: string;
  bias?: SearchBias | null;
  placeholder?: string;
  hint?: string;
}

/**
 * Address box with live place suggestions (shops, landmarks, streets, areas). Picking one fixes the
 * coordinates, so the pickup pin and live tracking use the real place rather than a guess from free text.
 */
export function PlaceSearchInput({
  label,
  value,
  onChange,
  onSelect,
  hasPoint,
  error,
  bias,
  placeholder = 'Search shop, landmark, street or area',
  hint,
}: PlaceSearchInputProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  // Only search text the person typed: text filled in by a pick or by GPS must not reopen the list.
  const userTyped = useRef(false);

  const query = useDebouncedValue(value, 400);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || !userTyped.current) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts an external request
    setLoading(true);
    searchPlaces(q, bias ?? undefined, ctrl.signal)
      .then((found) => {
        if (ctrl.signal.aborted) return;
        setResults(found);
        setSearched(true);
        setActive(-1);
        setOpen(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [query, bias]);

  function pick(place: Place) {
    userTyped.current = false;
    onSelect(place);
    setOpen(false);
    setResults([]);
    setSearched(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showEmpty = open && searched && !loading && results.length === 0 && value.trim().length >= 3;

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-300">
        {label}
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-700" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          aria-invalid={!!error}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            userTyped.current = true;
            onChange(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-xl border bg-base-900 py-3 pl-10 pr-10 text-sm text-ink-100 outline-none transition-shadow placeholder:text-ink-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 ${
            error ? 'border-danger-500' : 'border-base-600'
          }`}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-ink-700" />
          ) : hasPoint ? (
            <Check size={16} className="text-success-400" aria-label="Location confirmed" />
          ) : null}
        </span>
      </div>

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-base-700 bg-base-900 py-1 shadow-card-hover"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur does not close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 ${i === active ? 'bg-brand-700/10' : ''}`}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-100">{p.primary}</span>
                {p.secondary && <span className="block truncate text-xs text-ink-500">{p.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <p className="text-xs text-ink-500">
          No match yet. Try the area or town name, or use &ldquo;Use my current location&rdquo;.
        </p>
      )}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-sm text-danger-400">{error}</p>}
    </div>
  );
}
