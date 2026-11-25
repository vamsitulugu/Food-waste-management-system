import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { fetchChatThreads } from '../api/chat';
import { ChatPanel } from '../components/chat/ChatPanel';
import { ListRowSkeleton } from '../components/common/Skeleton';
import { EmptyState, ErrorState } from '../components/common/States';
import type { ChatThread } from '../types/domain';

function shortTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function ThreadRow({ t, active, meId }: { t: ChatThread; active: boolean; meId: string }) {
  const unread = t.unreadCount > 0;
  return (
    <Link
      to={`/chats/${t.claimId}`}
      className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${
        active ? 'bg-brand-700/10 ring-1 ring-brand-500/30' : 'bg-base-900 hover:bg-base-800'
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 font-display text-lg text-white">
        {(t.otherNames.trim().charAt(0) || '?').toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm ${unread ? 'font-bold text-ink-100' : 'font-semibold text-ink-100'}`}>
            {t.otherNames || 'Conversation'}
          </p>
          <span className={`shrink-0 text-[11px] ${unread ? 'font-bold text-brand-400' : 'text-ink-700'}`}>
            {shortTime(t.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-xs text-brand-400">{t.donationTitle}</p>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${unread ? 'font-semibold text-ink-100' : 'text-ink-500'}`}>
            {t.lastMessage
              ? `${t.lastSenderId === meId ? 'You: ' : ''}${t.lastMessage}`
              : 'No messages yet — say hello'}
          </p>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
              {t.unreadCount > 9 ? '9+' : t.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ChatsPage() {
  const { claimId } = useParams<{ claimId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const meId = session?.user.id ?? '';

  const { data: threads, loading, error, refetch } = useAsyncData(() => fetchChatThreads(), [session?.user.id]);
  useRealtimeTable('claim_messages', refetch, { event: 'INSERT' });
  useRealtimeTable('donation_claims', refetch);

  const active = threads?.find((t) => t.claimId === claimId);

  return (
    <div className="mx-auto max-w-5xl">
      <div className={`mb-4 ${claimId ? 'hidden md:block' : ''}`}>
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-ink-500">Chat and call the donor, recipient or volunteer on your pickups.</p>
      </div>

      {loading && !threads && (
        <div className="flex flex-col gap-2">
          <ListRowSkeleton />
          <ListRowSkeleton />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {threads && threads.length === 0 && (
        <EmptyState
          title="No conversations yet"
          description="Chat opens as soon as a donor accepts a request."
          action={
            <Link to="/browse" className="text-sm font-bold text-brand-400 hover:text-brand-300">
              Browse donations
            </Link>
          }
        />
      )}

      {threads && threads.length > 0 && (
        <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
          <div className={`flex flex-col gap-2 ${claimId ? 'hidden md:flex' : ''}`}>
            {threads.map((t) => (
              <ThreadRow key={t.claimId} t={t} active={t.claimId === claimId} meId={meId} />
            ))}
          </div>

          <div className={claimId ? '' : 'hidden md:block'}>
            {active ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <button
                    onClick={() => navigate('/chats')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-100 md:hidden"
                  >
                    <ArrowLeft size={16} /> All chats
                  </button>
                  <Link
                    to={`/donations/${active.donationId}`}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300"
                  >
                    View donation <ExternalLink size={12} />
                  </Link>
                </div>
                <ChatPanel
                  key={active.claimId}
                  claimId={active.claimId}
                  donationId={active.donationId}
                  title={active.donationTitle}
                  heightClass="h-[calc(100dvh-13rem)] min-h-[26rem]"
                />
              </>
            ) : (
              <div className="hidden h-[32rem] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-base-600 text-center md:flex">
                <MessageCircle className="text-ink-700" size={32} />
                <p className="text-sm text-ink-500">
                  {claimId ? 'This conversation is not available.' : 'Select a conversation'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
