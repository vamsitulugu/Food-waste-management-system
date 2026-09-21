import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchDonationImages,
  addDonationImageRow,
  deleteDonationImageRow,
  setPrimaryImage,
} from '../../api/donations';
import {
  uploadDonationImage,
  deleteDonationImageFile,
  getDonationImageUrl,
  validateImageFile,
  MAX_IMAGES_PER_DONATION,
} from '../../api/storage';
import type { DonationImage } from '../../types/domain';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { getErrorMessage } from '../../utils/errors';

export function DonationImageUploader({ donationId }: { donationId: string }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [images, setImages] = useState<DonationImage[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function loadImages() {
    try {
      const rows = await fetchDonationImages(donationId);
      setImages(rows);
      const urls: Record<string, string> = {};
      await Promise.all(
        rows.map(async (img) => {
          const url = await getDonationImageUrl(img.storagePath);
          if (url) urls[img.id] = url;
        })
      );
      setPreviews(urls);
    } catch {
      showToast('error', 'Could not load images.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donationId]);

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    if (images.length + files.length > MAX_IMAGES_PER_DONATION) {
      showToast('error', `You can add up to ${MAX_IMAGES_PER_DONATION} images per donation.`);
      return;
    }

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        showToast('error', validationError);
        return;
      }
    }

    setUploading(true);
    try {
      for (const file of files) {
        const path = await uploadDonationImage(session!.user.id, donationId, file);
        await addDonationImageRow(donationId, path, images.length === 0);
      }
      await loadImages();
      showToast('success', 'Image uploaded.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(image: DonationImage) {
    try {
      await deleteDonationImageRow(image.id);
      await deleteDonationImageFile(image.storagePath);
      await loadImages();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not delete image.'));
    }
  }

  async function handleSetPrimary(image: DonationImage) {
    try {
      await setPrimaryImage(donationId, image.id);
      await loadImages();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update primary image.'));
    }
  }

  if (loading) return <LoadingSpinner label="Loading images" />;

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-xl border border-base-700">
              {previews[img.id] ? (
                <img src={previews[img.id]} alt="Donation" className="h-28 w-full object-cover" />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-base-850 text-xs text-ink-700">
                  No preview
                </div>
              )}
              {img.isPrimary && (
                <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-medium text-base-950">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-base-950/80 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(img)}
                    className="text-[11px] text-ink-300 hover:text-ink-100"
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  className="text-[11px] text-danger-400 hover:text-danger-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES_PER_DONATION && (
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-base-700 px-4 py-2.5 text-sm text-ink-300 hover:border-base-600">
          {uploading ? 'Uploading…' : 'Add photo (JPEG/PNG/WebP, up to 5MB)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
