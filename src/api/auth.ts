import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types/domain';
import type { UserRole } from '../types/database';

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: Exclude<UserRole, 'admin'>;
}

export async function signUp({ fullName, email, password, role }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // This is client-supplied metadata. The backend trigger treats it as
        // untrusted input and allow-lists it — 'admin' is not reachable here
        // even if this value were tampered with before the request is sent.
        role,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url, is_active, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    avatarUrl: data.avatar_url,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
