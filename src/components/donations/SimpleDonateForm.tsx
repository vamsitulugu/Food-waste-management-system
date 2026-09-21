import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Camera, X, MapPin, Loader2, Plus, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createDonation, addDonationImageRow, publishDonation } from '../../api/donations';
import { uploadDonationImage, validateImageFile, MAX_IMAGES_PER_DONATION } from '../../api/storage';
import { FOOD_CATEGORY_LABELS, QUANTITY_UNIT_LABELS } from '../../types/domain';
import type { FoodCategory, QuantityUnit } from '../../types/database';
import { CATEGORY_EMOJI } from '../../utils/foodEmoji';
import { compressImage } from '../../utils/image';
import { geocodeAddress, reverseGeocode } from '../../utils/geocode';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../common/Button';

const CATEGORIES = Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[];
const UNITS = Object.keys(QUANTITY_UNIT_LABELS) as QuantityUnit[];
const PICKUP_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 2, label: '2 hours' },
  { hours: 4, label: '4 hours' },
  { hours: 8, label: '8 hours' },
  { hours: 24, label: 'Tomorrow' },
];

interface Photo {
  file: File;
  url: string;
}

type Errors = Partial<Record<'title' | 'quantity' | 'address', string>>;

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <p className="text-sm font-bold text-ink-100">{children}</p>
      {hint && <span className="text-xs text-ink-700">{hint}</span>}
    </div>
  );
}

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
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'border-brand-500 bg-brand-700/10 text-brand-400'
          : 'border-base-600 bg-base-900 text-ink-300 hover:bg-base-800'
      }`}
    >
      {children}
    </button>
  );
}

/** One-screen donation form: photos + the handful of details people actually need.
 * Creates, uploads photos and publishes in a single tap. */
export function SimpleDonateForm({
  onDone,
  onCancel,
  stickyFooter = false,
}: {
  onDone: (donationId: string) => void;
  onCancel?: () => void;
  /** Pin the submit button to the bottom of a scrolling container (used inside the modal). */
  stickyFooter?: boolean;
}) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const { coords, loading: locLoading, error: locError, requestLocation } = useGeolocation();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<FoodCategory>('cooked_meals');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<QuantityUnit>('servings');
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [hours, setHours] = useState(4);
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState('');

  // When the browser gives us a location, keep the coordinates and fill in the address if it is empty.
  useEffect(() => {
    if (!coords) return;
    setPoint(coords);
    let cancelled = false;
    reverseGeocode(coords.latitude, coords.longitude).then((name) => {
      if (!cancelled && name) setAddress((prev) => (prev.trim() ? prev : name));
    });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  // Free object URLs on unmount.
  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    const room = MAX_IMAGES_PER_DONATION - photos.length;
    if (picked.length > room) {
      showToast('info', `You can add up to ${MAX_IMAGES_PER_DONATION} photos.`);
    }
    const next: Photo[] = [];
    for (const original of picked.slice(0, Math.max(room, 0))) {
      const file = await compressImage(original);
      const problem = validateImageFile(file);
      if (problem) {
        showToast('error', problem);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function validate(): Errors {
    const next: Errors = {};
    if (title.trim().length < 2) next.title = 'Tell us what food this is.';
    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || qty <= 0) next.quantity = 'Enter how much there is.';
    if (!address.trim()) next.address = 'Add the pickup address.';
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      setStep('Finding your location…');
      const location = point ?? (await geocodeAddress(address.trim()));
      if (!location) {
        setErrors({ address: "We couldn't find that address. Tap “Use my location” or add more detail." });
        return;
      }

      setStep('Posting your donation…');
      const userId = session!.user.id;
      const now = Date.now();
      const end = new Date(now + hours * 60 * 60 * 1000).toISOString();
      const donation = await createDonation(userId, {
        title: title.trim(),
        description: note.trim() || undefined,
        category,
        quantityValue: Number(quantity),
        quantityUnit: unit,
        isVegetarian: isVeg,
        expiresAt: end,
        pickupWindowStart: new Date(now).toISOString(),
        pickupWindowEnd: end,
        pickupAddress: address.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
      });

      let photoFailed = false;
      for (let i = 0; i < photos.length; i += 1) {
        setStep(`Uploading photo ${i + 1} of ${photos.length}…`);
        try {
          const path = await uploadDonationImage(userId, donation.id, photos[i].file);
          await addDonationImageRow(donation.id, path, i === 0);
        } catch {
          photoFailed = true;
        }
      }

      setStep('Publishing…');
      await publishDonation(donation.id);

      showToast(
        photoFailed ? 'info' : 'success',
        photoFailed
          ? 'Your donation is live, but some photos could not be uploaded. You can add them by editing it.'
          : 'Your donation is live! 🎉'
      );
      onDone(donation.id);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not post your donation. Please try again.'));
    } finally {
      setSubmitting(false);
      setStep('');
    }
  }

  const inputBase =
    'w-full rounded-xl border bg-base-900 px-3.5 py-3 text-sm text-ink-100 outline-none transition-shadow placeholder:text-ink-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Photos */}
      <div>
        <Label hint={`${photos.length}/${MAX_IMAGES_PER_DONATION}`}>Photos</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.url} className="group relative aspect-square overflow-hidden rounded-2xl bg-base-800">
              <img src={p.url} alt={`Food photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {photos.length < MAX_IMAGES_PER_DONATION && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-700/5 text-brand-400 transition-colors hover:bg-brand-700/10"
            >
              {photos.length === 0 ? <Camera size={26} /> : <Plus size={24} />}
              <span className="text-xs font-bold">{photos.length === 0 ? 'Add photos' : 'Add more'}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
        <p className="mt-2 text-xs text-ink-700">A clear photo helps people trust and pick up your food faster.</p>
      </div>

      {/* What */}
      <div>
        <Label>What are you donating?</Label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Veg biryani, 20 packets"
          maxLength={140}
          className={`${inputBase} ${errors.title ? 'border-danger-500' : 'border-base-600'}`}
        />
        {errors.title && <p className="mt-1.5 text-sm text-danger-400">{errors.title}</p>}
      </div>

      {/* Category */}
      <div>
        <Label>Type of food</Label>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
              {CATEGORY_EMOJI[c]} {FOOD_CATEGORY_LABELS[c]}
            </Pill>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <Label>How much?</Label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="20"
            className={`${inputBase} w-28 shrink-0 ${errors.quantity ? 'border-danger-500' : 'border-base-600'}`}
          />
          <div className="scrollbar-none flex flex-1 gap-2 overflow-x-auto">
            {UNITS.map((u) => (
              <Pill key={u} active={unit === u} onClick={() => setUnit(u)}>
                {QUANTITY_UNIT_LABELS[u]}
              </Pill>
            ))}
          </div>
        </div>
        {errors.quantity && <p className="mt-1.5 text-sm text-danger-400">{errors.quantity}</p>}
      </div>

      {/* Veg / non-veg */}
      <div>
        <Label hint="Optional">Veg or non-veg?</Label>
        <div className="flex gap-2">
          <Pill active={isVeg === true} onClick={() => setIsVeg(isVeg === true ? null : true)}>
            <span className="inline-flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] border-2 border-success-500">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              </span>
              Veg
            </span>
          </Pill>
          <Pill active={isVeg === false} onClick={() => setIsVeg(isVeg === false ? null : false)}>
            <span className="inline-flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] border-2 border-danger-500">
                <span className="h-1.5 w-1.5 rounded-full bg-danger-500" />
              </span>
              Non-veg
            </span>
          </Pill>
        </div>
      </div>

      {/* Pickup time */}
      <div>
        <Label>Available for pickup for</Label>
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PICKUP_OPTIONS.map((o) => (
            <Pill key={o.hours} active={hours === o.hours} onClick={() => setHours(o.hours)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* Address */}
      <div>
        <Label>Pickup address</Label>
        <textarea
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            // A hand-edited address should be looked up again rather than reuse an old GPS point.
            setPoint(null);
          }}
          rows={2}
          placeholder="Street, area, landmark"
          className={`${inputBase} resize-none ${errors.address ? 'border-danger-500' : 'border-base-600'}`}
        />
        <button
          type="button"
          onClick={requestLocation}
          disabled={locLoading}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400 hover:text-brand-300 disabled:opacity-60"
        >
          {locLoading ? <Loader2 size={15} className="animate-spin" /> : point ? <Check size={15} /> : <MapPin size={15} />}
          {point ? 'Location added' : 'Use my current location'}
        </button>
        {errors.address && <p className="mt-1.5 text-sm text-danger-400">{errors.address}</p>}
        {locError && <p className="mt-1.5 text-sm text-danger-400">{locError}</p>}
      </div>

      {/* Optional note */}
      {showNote ? (
        <div>
          <Label hint="Optional">Note for the receiver</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything they should know — packaging, allergens, gate number…"
            className={`${inputBase} resize-none border-base-600`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="-mt-2 w-fit text-sm font-bold text-brand-400 hover:text-brand-300"
        >
          + Add a note (optional)
        </button>
      )}

      <div className={`flex gap-3 ${stickyFooter ? 'sticky bottom-0 -mx-1 bg-base-900 px-1 pb-1 pt-3' : ''}`}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1 py-3.5 text-base" disabled={submitting}>
          {submitting ? step || 'Posting…' : 'Post donation'}
        </Button>
      </div>
    </form>
  );
}
