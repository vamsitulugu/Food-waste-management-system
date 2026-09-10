import { supabase } from '../lib/supabaseClient';

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string | null;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const payload: { full_name?: string; avatar_url?: string | null } = {};
  if (input.fullName !== undefined) payload.full_name = input.fullName;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

export async function fetchPhone(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profile_private')
    .select('phone')
    .eq('profile_id', userId)
    .single();
  if (error) throw error;
  return data.phone;
}

export async function updatePhone(userId: string, phone: string | null) {
  const { error } = await supabase
    .from('profile_private')
    .update({ phone })
    .eq('profile_id', userId);
  if (error) throw error;
}

export async function deactivateAccount(targetProfileId: string) {
  const { error } = await supabase.rpc('deactivate_account', {
    p_target_profile_id: targetProfileId,
  });
  if (error) throw error;
}
