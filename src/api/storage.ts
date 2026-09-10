import { supabase } from '../lib/supabaseClient';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_DONATION = 5;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, or WebP images are allowed.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'Images must be 5MB or smaller.';
  }
  return null;
}

function extensionFor(file: File): string {
  const fromType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return fromType[file.type] ?? 'jpg';
}

export async function uploadDonationImage(
  donorId: string,
  donationId: string,
  file: File
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${donorId}/${donationId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from('donation-images').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getDonationImageUrl(storagePath: string): Promise<string | null> {
  // Bucket is private — a time-limited signed URL is required for display.
  const { data, error } = await supabase.storage
    .from('donation-images')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  if (error) return null;
  return data.signedUrl;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getAvatarUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(storagePath, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteAvatarFile(storagePath: string) {
  const { error } = await supabase.storage.from('avatars').remove([storagePath]);
  if (error) throw error;
}

export async function deleteDonationImageFile(storagePath: string) {
  const { error } = await supabase.storage.from('donation-images').remove([storagePath]);
  if (error) throw error;
}
