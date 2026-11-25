import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDown, Check, CheckCheck, Loader2, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchMessages,
  fetchParticipants,
  markChatRead,
  sendMessage,
  subscribeToMessages,
} from '../../api/chat';
import { fetchPhone } from '../../api/profile';
import { CHAT_PARTY_LABELS } from '../../types/domain';
import type { ChatMessage, ChatParticipant } from '../../types/domain';
import { getErrorMessage } from '../../utils/errors';
import { CallButton } from './CallButton';
import { ReportUserButton } from './ReportUserButton';

const MAX_LEN = 1000;

const PARTY_STYLES: Record<string, string> = {
  donor: 'bg-brand-700/15 text-brand-400',
  recipient: 'bg-success-500/15 text-success-400',
  volunteer: 'bg-warm-500/15 text-warm-400',
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface ChatPanelProps {
  claimId: string;
  donationId: string;
  /** Tailwind height classes for the whole panel. */
  heightClass?: string;
  title?: string;
}

export function ChatPanel({ claimId, donationId, heightClass = 'h-[34rem]', title }: ChatPanelProps) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const me = session?.user.id ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [myPhoneMissing, setMyPhoneMissing] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  const others = useMemo(() => participants.filter((p) => p.profileId !== me), [participants, me]);
  const nameOf = useCallback(
    (id: string) => participants.find((p) => p.profileId === id),
    [participants]
  );

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setMessages([]);
    Promise.all([fetchMessages(claimId), fetchParticipants(claimId)])
      .then(([msgs, people]) => {
        if (cancelled) return;
        setMessages(msgs);
        setParticipants(people);
        markChatRead(claimId).catch(() => undefined);
      })
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err, 'Could not load the chat.')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  // ---- do I have a number others can call? ----
  useEffect(() => {
    if (!me) return;
    fetchPhone(me)
      .then((p) => setMyPhoneMissing(!p))
      .catch(() => undefined);
  }, [me]);

  // ---- realtime ----
  useEffect(() => {
    const unsubscribe = subscribeToMessages(claimId, (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        // replace my optimistic copy of the same message, if present
        const idx = prev.findIndex(
          (m) => m.pending && m.senderId === incoming.senderId && m.body === incoming.body
        );
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = incoming;
          return next;
        }
        return [...prev, incoming];
      });
      if (incoming.senderId !== me) markChatRead(claimId).catch(() => undefined);
    });
    return unsubscribe;
  }, [claimId, me]);

  // ---- scrolling ----
  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }

  useLayoutEffect(() => {
    if (stickToBottom.current) scrollToBottom(!loading);
    else setShowJump(true);
  }, [messages, loading]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    if (nearBottom) setShowJump(false);
  }

  // ---- sending ----
  async function deliver(tempId: string, body: string) {
    try {
      const realId = await sendMessage(claimId, body);
      setMessages((prev) => {
        // realtime may already have swapped the optimistic message for the real one
        if (prev.some((m) => m.id === realId)) return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...m, id: realId, pending: false } : m));
      });
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      showToast('error', getErrorMessage(err, 'Message not sent.'));
    }
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    const tempId = `temp-${Date.now()}`;
    stickToBottom.current = true;
    setMessages((prev) => [
      ...prev,
      { id: tempId, claimId, senderId: me, body, createdAt: new Date().toISOString(), pending: true },
    ]);
    setDraft('');
    setSending(true);
    await deliver(tempId, body);
    setSending(false);
    inputRef.current?.focus();
  }

  async function retry(m: ChatMessage) {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, failed: false, pending: true } : x)));
    await deliver(m.id, m.body);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  // auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  // ---- group by day ----
  const rows = useMemo(() => {
    const out: Array<{ kind: 'day'; label: string; key: string } | { kind: 'msg'; m: ChatMessage; showName: boolean; tail: boolean }> = [];
    let lastDay = '';
    messages.forEach((m, i) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== lastDay) {
        out.push({ kind: 'day', label: dayLabel(m.createdAt), key: `day-${day}` });
        lastDay = day;
      }
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const sameAsPrev = prev && prev.senderId === m.senderId && new Date(prev.createdAt).toDateString() === day;
      const sameAsNext = next && next.senderId === m.senderId && new Date(next.createdAt).toDateString() === day;
      out.push({ kind: 'msg', m, showName: !sameAsPrev && m.senderId !== me, tail: !sameAsNext });
    });
    return out;
  }, [messages, me]);

  return (
    <section
      className={`flex ${heightClass} min-h-0 flex-col overflow-hidden rounded-3xl border border-base-700 bg-base-900 shadow-card`}
      aria-label="Chat"
    >
      {/* Header */}
      <header className="border-b border-base-700 bg-base-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-600 text-white">
            <MessageCircle size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base text-ink-100">{title ?? 'Chat'}</h2>
            <p className="truncate text-xs text-ink-500">
              {others.length > 0
                ? others.map((o) => `${o.fullName} (${CHAT_PARTY_LABELS[o.party]})`).join(' · ')
                : 'Loading…'}
            </p>
          </div>
          <ReportUserButton people={others} claimId={claimId} />
        </div>
        {others.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <CallButton
                key={o.profileId}
                targetProfileId={o.profileId}
                donationId={donationId}
                name={o.fullName}
                compact
              />
            ))}
          </div>
        )}
      </header>

      {myPhoneMissing && (
        <div className="flex items-start gap-2 border-b border-warm-500/30 bg-warm-500/10 px-4 py-2 text-xs text-warm-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>
            They can't call you because you haven't added a phone number.{' '}
            <Link to="/profile" className="font-bold underline">
              Add it in your profile
            </Link>
            .
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto bg-base-950 px-3 py-4"
          role="log"
          aria-live="polite"
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-ink-500">
              <Loader2 className="animate-spin" size={22} />
            </div>
          )}

          {loadError && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <AlertCircle className="text-danger-400" />
              <p className="text-sm text-ink-300">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700/10 text-brand-500">
                <MessageCircle size={26} />
              </span>
              <p className="font-display text-base text-ink-100">Say hello 👋</p>
              <p className="text-sm text-ink-500">
                Share when you'll arrive, ask for landmarks or confirm the pickup details.
              </p>
            </div>
          )}

          <div className="flex flex-col">
            {rows.map((row) => {
              if (row.kind === 'day') {
                return (
                  <div key={row.key} className="my-3 flex justify-center first:mt-0">
                    <span className="rounded-full bg-base-800 px-3 py-1 text-[11px] font-semibold text-ink-500">
                      {row.label}
                    </span>
                  </div>
                );
              }
              const { m, showName, tail } = row;
              const mine = m.senderId === me;
              const sender = nameOf(m.senderId);
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'} ${tail ? 'mb-2.5' : 'mb-0.5'}`}
                >
                  <div className={`flex max-w-[82%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <div className="mb-1 ml-1 flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-ink-300">{sender?.fullName ?? 'Member'}</span>
                        {sender && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${PARTY_STYLES[sender.party]}`}
                          >
                            {CHAT_PARTY_LABELS[sender.party]}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`whitespace-pre-wrap break-words px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                        mine
                          ? `bg-brand-500 text-white ${tail ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'} ${
                              m.failed ? 'opacity-60' : ''
                            }`
                          : `bg-base-900 text-ink-100 ${tail ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'}`
                      }`}
                    >
                      {m.body}
                    </div>
                    {tail && (
                      <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink-700">
                        {m.failed ? (
                          <button
                            onClick={() => retry(m)}
                            className="inline-flex items-center gap-1 font-bold text-danger-400 hover:underline"
                          >
                            <AlertCircle size={11} /> Not sent · Tap to retry
                          </button>
                        ) : (
                          <>
                            {timeLabel(m.createdAt)}
                            {mine &&
                              (m.pending ? (
                                <Check size={11} className="opacity-50" />
                              ) : (
                                <CheckCheck size={12} className="text-brand-400" />
                              ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showJump && (
          <button
            onClick={() => {
              stickToBottom.current = true;
              setShowJump(false);
              scrollToBottom();
            }}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-base-900 px-3 py-1.5 text-xs font-bold text-brand-400 shadow-card-hover"
          >
            <ArrowDown size={13} /> New messages
          </button>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="border-t border-base-700 bg-base-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Type a message…"
            aria-label="Message"
            className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-base-600 bg-base-950 px-4 py-2.5 text-sm text-ink-100 outline-none transition-shadow placeholder:text-ink-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
        {draft.length > MAX_LEN - 150 && (
          <p className="mt-1 text-right text-[11px] text-ink-500">
            {draft.length}/{MAX_LEN}
          </p>
        )}
      </form>
    </section>
  );
}
