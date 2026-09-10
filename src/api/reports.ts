import { supabase } from '../lib/supabaseClient';

export async function submitReport(
  reporterId: string,
  input: { reportedDonationId?: string; reportedProfileId?: string; reason: string; details?: string }
) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_donation_id: input.reportedDonationId ?? null,
    reported_profile_id: input.reportedProfileId ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
}
