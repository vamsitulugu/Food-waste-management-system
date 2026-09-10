import type { UserRole } from './database';
import type {
  OrgType,
  OrgVerificationStatus,
  OrgMemberRole,
  DonationStatus,
  FoodCategory,
  QuantityUnit,
  StorageRequirement,
  ClaimStatus,
  FulfillmentMethod,
  PickupTaskStatus,
  ReportStatus,
} from './database';

export type { UserRole };

// Roles selectable at public signup. 'admin' is deliberately excluded —
// it can never be chosen through the UI, and the backend trigger
// independently enforces the same allow-list, so this restriction is
// defense-in-depth, not the only guard.
export const PUBLIC_ROLES: Exclude<UserRole, 'admin'>[] = [
  'donor',
  'recipient',
  'ngo',
  'volunteer',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  donor: 'Donor',
  recipient: 'Recipient',
  ngo: 'NGO / Food Bank',
  volunteer: 'Volunteer',
  admin: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<Exclude<UserRole, 'admin'>, string> = {
  donor: 'I have surplus food to give — a restaurant, shop, event, or household.',
  recipient: 'I want to find and collect available food for myself or my family.',
  ngo: 'We collect and distribute food on behalf of a registered organization.',
  volunteer: 'I want to help pick up and deliver food between donors and recipients.',
};

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  orgType: OrgType;
  registrationNumber: string | null;
  description: string | null;
  verificationStatus: OrgVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  organizationId: string;
  profileId: string;
  orgRole: OrgMemberRole;
  createdAt: string;
  // Joined from profiles when listing members
  profile?: Pick<Profile, 'id' | 'fullName' | 'avatarUrl'>;
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ngo: 'NGO',
  food_bank: 'Food Bank',
  restaurant: 'Restaurant',
  hotel: 'Hotel',
  shop: 'Shop',
  supermarket: 'Supermarket',
  event_organizer: 'Event Organizer',
  other: 'Other',
};

export const ORG_VERIFICATION_LABELS: Record<OrgVerificationStatus, string> = {
  pending: 'Verification pending',
  verified: 'Verified',
  rejected: 'Verification rejected',
  suspended: 'Suspended',
};

// ---------------- Donations ----------------

export interface Donation {
  id: string;
  donorId: string;
  organizationId: string | null;
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
  status: DonationStatus;
  cancellationReason: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DonationImage {
  id: string;
  donationId: string;
  storagePath: string;
  isPrimary: boolean;
  createdAt: string;
}

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  cooked_meals: 'Cooked meals',
  bakery: 'Bakery',
  produce: 'Produce',
  dairy: 'Dairy',
  packaged: 'Packaged goods',
  beverages: 'Beverages',
  grains_staples: 'Grains & staples',
  other: 'Other',
};

export const QUANTITY_UNIT_LABELS: Record<QuantityUnit, string> = {
  servings: 'servings',
  kg: 'kg',
  items: 'items',
  liters: 'liters',
};

export const STORAGE_REQUIREMENT_LABELS: Record<StorageRequirement, string> = {
  room_temp: 'Room temperature',
  refrigerated: 'Refrigerated',
  frozen: 'Frozen',
};

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  draft: 'Draft',
  available: 'Available',
  claimed: 'Claimed',
  pickup_assigned: 'Pickup assigned',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  rejected: 'Rejected',
};

// ---------------- Claims ----------------

export interface DonationClaim {
  id: string;
  donationId: string;
  claimantId: string;
  organizationId: string | null;
  fulfillmentMethod: FulfillmentMethod;
  status: ClaimStatus;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimant?: Pick<Profile, 'id' | 'fullName'>;
  organization?: { id: string; name: string };
  donation?: Pick<Donation, 'id' | 'title' | 'status'>;
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  self_pickup: 'I will pick this up myself',
  volunteer_assisted: 'I need volunteer delivery help',
};

// ---------------- Pickup tasks ----------------

export interface PickupTask {
  id: string;
  donationId: string;
  claimId: string;
  volunteerId: string | null;
  status: PickupTaskStatus;
  pickupConfirmedAt: string | null;
  deliveredConfirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  donation?: Pick<Donation, 'id' | 'title' | 'pickupAddress' | 'latitude' | 'longitude'>;
}

export const PICKUP_TASK_STATUS_LABELS: Record<PickupTaskStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  en_route_pickup: 'En route to pickup',
  picked_up: 'Picked up',
  en_route_delivery: 'En route to delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ---------------- Notifications ----------------

export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string | null;
  relatedDonationId: string | null;
  relatedClaimId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ---------------- Reports ----------------

export interface Report {
  id: string;
  reporterId: string;
  reportedDonationId: string | null;
  reportedProfileId: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  reviewing: 'Reviewing',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};
