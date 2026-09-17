import { supabase } from '../lib/supabaseClient';
import type { Donation, DonationImage } from '../types/domain';
import type { Database, DonationStatus, FoodCategory, QuantityUnit, StorageRequirement } from '../types/database';

type DonationRow = Database['public']['Tables']['donations']['Row'];
type DonationImageRow = Database['public']['Tables']['donation_images']['Row'];

function mapDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    donorId: row.donor_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    category: row.category,
    quantityValue: row.quantity_value,
    quantityUnit: row.quantity_unit,
    isVegetarian: row.is_vegetarian,
    allergens: row.allergens,
    storageRequirement: row.storage_requirement,
    packagingCondition: row.packaging_condition,
    preparedAt: row.prepared_at,
    expiresAt: row.expires_at,
    pickupWindowStart: row.pickup_window_start,
    pickupWindowEnd: row.pickup_window_end,
    pickupAddress: row.pickup_address,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapImage(row: DonationImageRow): DonationImage {
  return {
    id: row.id,
    donationId: row.donation_id,
    storagePath: row.storage_path,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export interface DonationInput {
  title: string;
  description?: string;
  category: FoodCategory;
  quantityValue: number;
  quantityUnit: QuantityUnit;
  isVegetarian?: boolean | null;
  allergens?: string[];
  storageRequirement?: StorageRequirement | null;
  packagingCondition?: string;
  preparedAt?: string | null;
  expiresAt: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
}

export async function createDonation(donorId: string, input: DonationInput): Promise<Donation> {
  const { data, error } = await supabase
    .from('donations')
    .insert({
      donor_id: donorId,
      title: input.title,
      description: input.description || null,
      category: input.category,
      quantity_value: input.quantityValue,
      quantity_unit: input.quantityUnit,
      is_vegetarian: input.isVegetarian ?? null,
      allergens: input.allergens ?? null,
      storage_requirement: input.storageRequirement ?? null,
      packaging_condition: input.packagingCondition || null,
      prepared_at: input.preparedAt ?? null,
      expires_at: input.expiresAt,
      pickup_window_start: input.pickupWindowStart,
      pickup_window_end: input.pickupWindowEnd,
      pickup_address: input.pickupAddress,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single();
  if (error) throw error;
  return mapDonation(data);
}

export async function updateDonation(donationId: string, input: Partial<DonationInput>) {
  const { error } = await supabase
    .from('donations')
    .update({
      title: input.title,
      description: input.description,
      category: input.category,
      quantity_value: input.quantityValue,
      quantity_unit: input.quantityUnit,
      is_vegetarian: input.isVegetarian,
      allergens: input.allergens,
      storage_requirement: input.storageRequirement,
      packaging_condition: input.packagingCondition,
      prepared_at: input.preparedAt,
      expires_at: input.expiresAt,
      pickup_window_start: input.pickupWindowStart,
      pickup_window_end: input.pickupWindowEnd,
      pickup_address: input.pickupAddress,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .eq('id', donationId);
  if (error) throw error;
}

export async function publishDonation(donationId: string) {
  const { error } = await supabase.rpc('publish_donation', { p_donation_id: donationId });
  if (error) throw error;
}

export async function cancelDonation(donationId: string, reason: string) {
  const { error } = await supabase.rpc('cancel_donation', { p_donation_id: donationId, p_reason: reason });
  if (error) throw error;
}

export async function fetchDonation(donationId: string): Promise<Donation> {
  const { data, error } = await supabase.from('donations').select('*').eq('id', donationId).single();
  if (error) throw error;
  return mapDonation(data);
}

export async function fetchMyDonations(donorId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .eq('donor_id', donorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDonation);
}

export interface BrowseFilters {
  category?: FoodCategory;
  quantityUnit?: QuantityUnit;
  isVegetarian?: boolean;
  search?: string;
  sortBy?: 'newest' | 'expiring_soon';
}

export async function fetchAvailableDonations(filters: BrowseFilters = {}): Promise<Donation[]> {
  let query = supabase.from('donations').select('*').eq('status', 'available');

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.quantityUnit) query = query.eq('quantity_unit', filters.quantityUnit);
  if (filters.isVegetarian !== undefined) query = query.eq('is_vegetarian', filters.isVegetarian);
  if (filters.search) query = query.ilike('title', `%${filters.search}%`);

  if (filters.sortBy === 'expiring_soon') {
    query = query.order('pickup_window_end', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDonation);
}

export async function fetchNearbyDonations(lat: number, lng: number, radiusM: number): Promise<Donation[]> {
  const { data, error } = await supabase.rpc('nearby_donations', {
    user_lat: lat,
    user_lng: lng,
    radius_m: radiusM,
  });
  if (error) throw error;
  return (data ?? []).map(mapDonation);
}

export async function fetchDonationImages(donationId: string): Promise<DonationImage[]> {
  const { data, error } = await supabase
    .from('donation_images')
    .select('*')
    .eq('donation_id', donationId)
    .order('is_primary', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapImage);
}

export async function addDonationImageRow(donationId: string, storagePath: string, isPrimary: boolean) {
  const { error } = await supabase
    .from('donation_images')
    .insert({ donation_id: donationId, storage_path: storagePath, is_primary: isPrimary });
  if (error) throw error;
}

export async function deleteDonationImageRow(imageId: string) {
  const { error } = await supabase.from('donation_images').delete().eq('id', imageId);
  if (error) throw error;
}

export async function setPrimaryImage(donationId: string, imageId: string) {
  const { error: clearError } = await supabase
    .from('donation_images')
    .update({ is_primary: false })
    .eq('donation_id', donationId);
  if (clearError) throw clearError;

  const { error } = await supabase.from('donation_images').update({ is_primary: true }).eq('id', imageId);
  if (error) throw error;
}

export async function fetchPrimaryImageUrls(donationIds: string[]): Promise<Record<string, string>> {
  if (donationIds.length === 0) return {};

  const { data: images, error } = await supabase
    .from('donation_images')
    .select('donation_id, storage_path')
    .in('donation_id', donationIds)
    .eq('is_primary', true);
  if (error) throw error;
  if (!images || images.length === 0) return {};

  const paths = images.map((img) => img.storage_path);
  const { data: signed, error: signError } = await supabase.storage
    .from('donation-images')
    .createSignedUrls(paths, 60 * 60);
  if (signError) throw signError;

  const pathToUrl = new Map<string, string>();
  (signed ?? []).forEach((s) => {
    if (s.path && s.signedUrl) pathToUrl.set(s.path, s.signedUrl);
  });

  const result: Record<string, string> = {};
  images.forEach((img) => {
    const url = pathToUrl.get(img.storage_path);
    if (url) result[img.donation_id] = url;
  });
  return result;
}

export function isDonationStatusOf(status: DonationStatus, group: 'active' | 'terminal'): boolean {
  const terminal: DonationStatus[] = ['completed', 'cancelled', 'expired', 'rejected'];
  return group === 'terminal' ? terminal.includes(status) : !terminal.includes(status);
}
