// Hand-written to match supabase/migrations/0001_phase2_auth.sql and
// 0002_phase3_schema.sql. Once the Supabase project exists and migrations
// are applied, regenerate with:
//   supabase gen types typescript --project-id <ref> > src/types/database.ts
// so the frontend types can never silently drift from the real schema.

export type UserRole = 'donor' | 'recipient' | 'ngo' | 'volunteer' | 'admin';
export type OrgVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type OrgType =
  | 'ngo' | 'food_bank' | 'restaurant' | 'hotel' | 'shop'
  | 'supermarket' | 'event_organizer' | 'other';
export type OrgMemberRole = 'owner' | 'admin' | 'member';

export type DonationStatus =
  | 'draft' | 'available' | 'claimed' | 'pickup_assigned'
  | 'picked_up' | 'delivered' | 'completed'
  | 'cancelled' | 'expired' | 'rejected';

export type ClaimStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
export type FulfillmentMethod = 'self_pickup' | 'volunteer_assisted';
export type PickupTaskStatus =
  | 'open' | 'assigned' | 'en_route_pickup' | 'picked_up' | 'en_route_delivery' | 'delivered' | 'cancelled';
export type FoodCategory =
  | 'cooked_meals' | 'bakery' | 'produce' | 'dairy' | 'packaged'
  | 'beverages' | 'grains_staples' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type QuantityUnit = 'servings' | 'kg' | 'items' | 'liters';
export type StorageRequirement = 'room_temp' | 'refrigerated' | 'frozen';

export interface Database {
  public: {
    Views: Record<string, never>;
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole | null;
          avatar_url?: string | null;
          is_active?: boolean;
        };
        Update: {
          full_name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      profile_private: {
        Row: { profile_id: string; phone: string | null; updated_at: string };
        Insert: { profile_id: string; phone?: string | null };
        Update: { phone?: string | null };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          org_type: OrgType;
          registration_number: string | null;
          description: string | null;
          verification_status: OrgVerificationStatus;
          verified_by: string | null;
          verified_at: string | null;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          org_type: OrgType;
          registration_number?: string | null;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_by: string;
        };
        Update: {
          name?: string;
          org_type?: OrgType;
          registration_number?: string | null;
          description?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          profile_id: string;
          org_role: OrgMemberRole;
          created_at: string;
        };
        Insert: { organization_id: string; profile_id: string; org_role?: OrgMemberRole };
        Update: { org_role?: OrgMemberRole };
        Relationships: [];
      };
      donations: {
        Row: {
          id: string;
          donor_id: string;
          organization_id: string | null;
          title: string;
          description: string | null;
          category: FoodCategory;
          quantity_value: number;
          quantity_unit: QuantityUnit;
          is_vegetarian: boolean | null;
          allergens: string[] | null;
          storage_requirement: StorageRequirement | null;
          packaging_condition: string | null;
          prepared_at: string | null;
          expires_at: string;
          pickup_window_start: string;
          pickup_window_end: string;
          pickup_address: string;
          latitude: number;
          longitude: number;
          status: DonationStatus;
          cancellation_reason: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          donor_id: string;
          organization_id?: string | null;
          title: string;
          description?: string | null;
          category: FoodCategory;
          quantity_value: number;
          quantity_unit: QuantityUnit;
          is_vegetarian?: boolean | null;
          allergens?: string[] | null;
          storage_requirement?: StorageRequirement | null;
          packaging_condition?: string | null;
          prepared_at?: string | null;
          expires_at: string;
          pickup_window_start: string;
          pickup_window_end: string;
          pickup_address: string;
          latitude: number;
          longitude: number;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: FoodCategory;
          quantity_value?: number;
          quantity_unit?: QuantityUnit;
          is_vegetarian?: boolean | null;
          allergens?: string[] | null;
          storage_requirement?: StorageRequirement | null;
          packaging_condition?: string | null;
          prepared_at?: string | null;
          expires_at?: string;
          pickup_window_start?: string;
          pickup_window_end?: string;
          pickup_address?: string;
          latitude?: number;
          longitude?: number;
        };
        Relationships: [];
      };
      donation_images: {
        Row: { id: string; donation_id: string; storage_path: string; is_primary: boolean; created_at: string };
        Insert: { donation_id: string; storage_path: string; is_primary?: boolean };
        Update: { is_primary?: boolean };
        Relationships: [];
      };
      donation_claims: {
        Row: {
          id: string;
          donation_id: string;
          claimant_id: string;
          organization_id: string | null;
          fulfillment_method: FulfillmentMethod;
          status: ClaimStatus;
          message: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // create_claim() RPC only
        Update: never; // accept/reject/cancel_claim() RPCs only
        Relationships: [];
      };
      pickup_tasks: {
        Row: {
          id: string;
          donation_id: string;
          claim_id: string;
          volunteer_id: string | null;
          status: PickupTaskStatus;
          pickup_confirmed_at: string | null;
          delivered_confirmed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never; // created via accept_claim() RPC only
        Update: never; // accept_pickup_task() / update_task_status() RPCs only
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: string;
          title: string;
          body: string | null;
          related_donation_id: string | null;
          related_claim_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: never; // always a side effect of a lifecycle RPC
        Update: { is_read?: boolean };
        Relationships: [];
      };
      saved_donations: {
        Row: { profile_id: string; donation_id: string; created_at: string };
        Insert: { profile_id: string; donation_id: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_donation_id: string | null;
          reported_profile_id: string | null;
          reason: string;
          details: string | null;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          reported_donation_id?: string | null;
          reported_profile_id?: string | null;
          reason: string;
          details?: string | null;
        };
        Update: never; // resolve_report() RPC only
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: { uid: string }; Returns: boolean };
      provision_admin: { Args: { target_profile_id: string }; Returns: void };
      set_initial_role: { Args: { p_role: Exclude<UserRole, 'admin'> }; Returns: void };
      publish_donation: { Args: { p_donation_id: string }; Returns: void };
      create_claim: {
        Args: {
          p_donation_id: string;
          p_fulfillment_method: FulfillmentMethod;
          p_organization_id?: string | null;
          p_message?: string | null;
        };
        Returns: string;
      };
      accept_claim: { Args: { p_claim_id: string }; Returns: void };
      reject_claim: { Args: { p_claim_id: string }; Returns: void };
      cancel_claim: { Args: { p_claim_id: string }; Returns: void };
      confirm_self_pickup: { Args: { p_claim_id: string }; Returns: void };
      confirm_delivery: { Args: { p_claim_id: string }; Returns: void };
      cancel_donation: { Args: { p_donation_id: string; p_reason: string }; Returns: void };
      accept_pickup_task: { Args: { p_task_id: string }; Returns: void };
      update_task_status: { Args: { p_task_id: string; p_new_status: PickupTaskStatus }; Returns: void };
      add_organization_member: {
        Args: { p_org_id: string; p_target_profile_id: string; p_new_org_role?: OrgMemberRole };
        Returns: void;
      };
      update_member_role: {
        Args: { p_org_id: string; p_target_profile_id: string; p_new_role: OrgMemberRole };
        Returns: void;
      };
      verify_organization: { Args: { p_org_id: string; p_decision: OrgVerificationStatus }; Returns: void };
      admin_reject_donation: { Args: { p_donation_id: string; p_reason: string }; Returns: void };
      resolve_report: { Args: { p_report_id: string; p_decision: ReportStatus }; Returns: void };
      deactivate_account: { Args: { p_target_profile_id: string }; Returns: void };
      get_pickup_contact_info: {
        Args: { p_target_profile_id: string; p_donation_id: string };
        Returns: string | null;
      };
      nearby_donations: {
        Args: { user_lat: number; user_lng: number; radius_m: number };
        Returns: Database['public']['Tables']['donations']['Row'][];
      };
    };
  };
}
