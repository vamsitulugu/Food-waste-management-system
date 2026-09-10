import { useState } from 'react';
import type { FormEvent } from 'react';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { DonationInput } from '../../api/donations';
import {
  FOOD_CATEGORY_LABELS,
  QUANTITY_UNIT_LABELS,
  STORAGE_REQUIREMENT_LABELS,
} from '../../types/domain';
import type { FoodCategory, QuantityUnit, StorageRequirement } from '../../types/database';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];
const UNITS = Object.keys(QUANTITY_UNIT_LABELS) as QuantityUnit[];
const STORAGE_OPTIONS = Object.keys(STORAGE_REQUIREMENT_LABELS) as StorageRequirement[];

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface DonationFormValues {
  title: string;
  description: string;
  category: FoodCategory;
  quantityValue: string;
  quantityUnit: QuantityUnit;
  isVegetarian: 'unspecified' | 'yes' | 'no';
  allergens: string;
  storageRequirement: StorageRequirement | '';
  packagingCondition: string;
  preparedAt: string;
  expiresAt: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  pickupAddress: string;
  latitude: string;
  longitude: string;
}

const EMPTY_VALUES: DonationFormValues = {
  title: '',
  description: '',
  category: 'cooked_meals',
  quantityValue: '',
  quantityUnit: 'servings',
  isVegetarian: 'unspecified',
  allergens: '',
  storageRequirement: '',
  packagingCondition: '',
  preparedAt: '',
  expiresAt: '',
  pickupWindowStart: '',
  pickupWindowEnd: '',
  pickupAddress: '',
  latitude: '',
  longitude: '',
};

export function donationToFormValues(d: {
  title: string;
  description: string | null;
  category: FoodCategory;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  isVegetarian: boolean | null;
  allergens: string[] | null;
  storageRequirement: StorageRequirement | null;
  packagingCondition: string | null;
  preparedAt: string | null;
  expiresAt: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
}): DonationFormValues {
  return {
    title: d.title,
    description: d.description ?? '',
    category: d.category,
    quantityValue: String(d.quantityValue),
    quantityUnit: d.quantityUnit,
    isVegetarian: d.isVegetarian === null ? 'unspecified' : d.isVegetarian ? 'yes' : 'no',
    allergens: (d.allergens ?? []).join(', '),
    storageRequirement: d.storageRequirement ?? '',
    packagingCondition: d.packagingCondition ?? '',
    preparedAt: toLocalInputValue(d.preparedAt),
    expiresAt: toLocalInputValue(d.expiresAt),
    pickupWindowStart: toLocalInputValue(d.pickupWindowStart),
    pickupWindowEnd: toLocalInputValue(d.pickupWindowEnd),
    pickupAddress: d.pickupAddress,
    latitude: String(d.latitude),
    longitude: String(d.longitude),
  };
}

interface DonationFormProps {
  initialValues?: DonationFormValues;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (input: DonationInput) => void | Promise<void>;
}

type Errors = Partial<Record<keyof DonationFormValues, string>>;

export function DonationForm({ initialValues, submitLabel, submitting, onSubmit }: DonationFormProps) {
  const [values, setValues] = useState<DonationFormValues>(initialValues ?? EMPTY_VALUES);
  const [errors, setErrors] = useState<Errors>({});
  const { coords, loading: locLoading, error: locError, requestLocation } = useGeolocation();

  function set<K extends keyof DonationFormValues>(key: K, value: DonationFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  if (coords && (values.latitude === '' || values.longitude === '')) {
    set('latitude', String(coords.latitude));
    set('longitude', String(coords.longitude));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (values.title.trim().length < 2 || values.title.trim().length > 140) {
      e.title = 'Title must be between 2 and 140 characters.';
    }
    const qty = Number(values.quantityValue);
    if (!values.quantityValue || Number.isNaN(qty) || qty <= 0) {
      e.quantityValue = 'Enter a quantity greater than 0.';
    }
    if (!values.expiresAt) {
      e.expiresAt = 'Enter a best-before / expiry date and time.';
    }
    if (!values.pickupWindowStart) {
      e.pickupWindowStart = 'Enter when pickup can start.';
    }
    if (!values.pickupWindowEnd) {
      e.pickupWindowEnd = 'Enter when pickup must end by.';
    }
    if (values.pickupWindowStart && values.pickupWindowEnd) {
      if (new Date(values.pickupWindowEnd) <= new Date(values.pickupWindowStart)) {
        e.pickupWindowEnd = 'Pickup end must be after pickup start.';
      }
    }
    if (values.expiresAt && values.pickupWindowEnd) {
      if (new Date(values.pickupWindowEnd) > new Date(values.expiresAt)) {
        e.pickupWindowEnd = "Pickup must end before or at the food's best-before time.";
      }
    }
    if (values.preparedAt && values.expiresAt) {
      if (new Date(values.expiresAt) <= new Date(values.preparedAt)) {
        e.expiresAt = 'Best-before time must be after the prepared time.';
      }
    }
    if (!values.pickupAddress.trim()) {
      e.pickupAddress = 'Enter a pickup address.';
    }
    if (!values.latitude || !values.longitude) {
      e.latitude = 'Set pickup coordinates using "Use my current location" below.';
    }
    return e;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const input: DonationInput = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      category: values.category,
      quantityValue: Number(values.quantityValue),
      quantityUnit: values.quantityUnit,
      isVegetarian: values.isVegetarian === 'unspecified' ? null : values.isVegetarian === 'yes',
      allergens: values.allergens
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      storageRequirement: values.storageRequirement || null,
      packagingCondition: values.packagingCondition.trim() || undefined,
      preparedAt: values.preparedAt ? new Date(values.preparedAt).toISOString() : null,
      expiresAt: new Date(values.expiresAt).toISOString(),
      pickupWindowStart: new Date(values.pickupWindowStart).toISOString(),
      pickupWindowEnd: new Date(values.pickupWindowEnd).toISOString(),
      pickupAddress: values.pickupAddress.trim(),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Title" value={values.title} onChange={(e) => set('title', e.target.value)} error={errors.title} required />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="description" className="text-sm text-ink-300">
            Description (optional)
          </label>
          <textarea
            id="description"
            rows={3}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100 outline-none focus:border-brand-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm text-ink-300">
            Category
          </label>
          <select
            id="category"
            value={values.category}
            onChange={(e) => set('category', e.target.value as FoodCategory)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {FOOD_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Quantity"
            type="number"
            min="0"
            step="any"
            value={values.quantityValue}
            onChange={(e) => set('quantityValue', e.target.value)}
            error={errors.quantityValue}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unit" className="text-sm text-ink-300">
              Unit
            </label>
            <select
              id="unit"
              value={values.quantityUnit}
              onChange={(e) => set('quantityUnit', e.target.value as QuantityUnit)}
              className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {QUANTITY_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="rounded-lg border border-base-700 p-4">
        <legend className="px-1 text-sm font-medium text-ink-100">Food safety information</legend>
        <p className="mb-3 text-xs text-ink-500">
          You are responsible for the accuracy of this information. Recipients and volunteers
          should use their own judgment and follow applicable food-safety practices — this
          platform does not verify or guarantee food safety.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="vegetarian" className="text-sm text-ink-300">
              Vegetarian
            </label>
            <select
              id="vegetarian"
              value={values.isVegetarian}
              onChange={(e) => set('isVegetarian', e.target.value as DonationFormValues['isVegetarian'])}
              className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100"
            >
              <option value="unspecified">Not specified</option>
              <option value="yes">Vegetarian</option>
              <option value="no">Non-vegetarian</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="storage" className="text-sm text-ink-300">
              Storage requirement
            </label>
            <select
              id="storage"
              value={values.storageRequirement}
              onChange={(e) => set('storageRequirement', e.target.value as StorageRequirement | '')}
              className="rounded-md border border-base-700 bg-base-900 px-3 py-2.5 text-sm text-ink-100"
            >
              <option value="">Not specified</option>
              {STORAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STORAGE_REQUIREMENT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Allergens (comma-separated, optional)"
            value={values.allergens}
            onChange={(e) => set('allergens', e.target.value)}
            placeholder="nuts, dairy"
          />
          <Input
            label="Packaging condition (optional)"
            value={values.packagingCondition}
            onChange={(e) => set('packagingCondition', e.target.value)}
            placeholder="Sealed containers"
          />
          <Input
            label="Prepared at (optional)"
            type="datetime-local"
            value={values.preparedAt}
            onChange={(e) => set('preparedAt', e.target.value)}
          />
          <Input
            label="Best-before / expiry"
            type="datetime-local"
            value={values.expiresAt}
            onChange={(e) => set('expiresAt', e.target.value)}
            error={errors.expiresAt}
            required
          />
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-base-700 p-4">
        <legend className="px-1 text-sm font-medium text-ink-100">Pickup</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Pickup window start"
            type="datetime-local"
            value={values.pickupWindowStart}
            onChange={(e) => set('pickupWindowStart', e.target.value)}
            error={errors.pickupWindowStart}
            required
          />
          <Input
            label="Pickup window end"
            type="datetime-local"
            value={values.pickupWindowEnd}
            onChange={(e) => set('pickupWindowEnd', e.target.value)}
            error={errors.pickupWindowEnd}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Pickup address"
              value={values.pickupAddress}
              onChange={(e) => set('pickupAddress', e.target.value)}
              error={errors.pickupAddress}
              required
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={requestLocation} loading={locLoading} className="w-fit">
              Use my current location for pickup coordinates
            </Button>
            {locError && <p className="text-sm text-danger-400">{locError}</p>}
            {values.latitude && values.longitude && (
              <p className="text-xs text-ink-500">
                Coordinates set: {Number(values.latitude).toFixed(5)}, {Number(values.longitude).toFixed(5)}
              </p>
            )}
            {errors.latitude && <p className="text-sm text-danger-400">{errors.latitude}</p>}
          </div>
        </div>
      </fieldset>

      <div>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
