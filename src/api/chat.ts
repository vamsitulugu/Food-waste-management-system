import { supabase } from '../lib/supabaseClient';
import type { ChatMessage, ChatParticipant, ChatParty, ChatThread } from '../types/domain';

interface MessageRow {
  id: string;
  claim_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    claimId: row.claim_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function fetchMessages(claimId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('claim_messages')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(claimId: string, body: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_chat_message', { p_claim_id: claimId, p_body: body });
  if (error) throw error;
  return data as string;
}

export async function markChatRead(claimId: string) {
  const { error } = await supabase.rpc('mark_chat_read', { p_claim_id: claimId });
  if (error) throw error;
}

export async function fetchParticipants(claimId: string): Promise<ChatParticipant[]> {
  const { data, error } = await supabase.rpc('chat_participants', { p_claim_id: claimId });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    profileId: r.profile_id,
    fullName: r.full_name,
    party: r.party as ChatParty,
  }));
}

export async function fetchChatThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase.rpc('my_chat_threads');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    claimId: r.claim_id,
    donationId: r.donation_id,
    donationTitle: r.donation_title,
    otherNames: r.other_names ?? '',
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at,
    lastSenderId: r.last_sender_id,
    unreadCount: r.unread_count,
  }));
}

/** Live-subscribe to new messages in one conversation. Returns an unsubscribe fn. */
export function subscribeToMessages(claimId: string, onInsert: (m: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat:${claimId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'claim_messages', filter: `claim_id=eq.${claimId}` },
      (payload) => onInsert(mapMessage(payload.new as MessageRow))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
