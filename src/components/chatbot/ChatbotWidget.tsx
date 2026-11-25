import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, MessageCircle, Send, X } from 'lucide-react';
import {
  MAX_QUESTION_LENGTH,
  MIN_CONFIDENCE,
  logUnansweredQuestion,
  searchHelp,
  type HelpAnswer,
} from '../../api/chatbot';

type Message =
  | { id: number; from: 'user'; text: string }
  | { id: number; from: 'bot'; text: string; linkPath?: string | null; linkLabel?: string | null; related?: HelpAnswer[] };

const STARTERS = [
  'What is Second Serving?',
  'How do I donate food?',
  'How do I request food?',
  'How can I volunteer to deliver?',
  'Is it free?',
];

const GREETING =
  'Hi! I can answer questions about Second Serving: what it is, where things are, and how to donate, request or deliver food. What would you like to know?';

const FALLBACK =
  "Sorry, I couldn't find an answer to that. I only know about how Second Serving works. Try rephrasing, or pick one of these:";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: 'bot', text: GREETING }]);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  function push(msg: DistributiveOmit<Message, 'id'>) {
    setMessages((prev) => [...prev, { ...msg, id: nextId.current++ } as Message]);
  }

  /** Show an FAQ the person picked from the suggestions, without another search. */
  function showAnswer(item: HelpAnswer) {
    push({ from: 'user', text: item.question });
    push({ from: 'bot', text: item.answer, linkPath: item.linkPath, linkLabel: item.linkLabel });
  }

  async function ask(raw: string) {
    const question = raw.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!question || busy) return;
    setInput('');
    push({ from: 'user', text: question });
    setBusy(true);
    try {
      const results = await searchHelp(question, 4);
      const best = results[0];
      if (best && best.score >= MIN_CONFIDENCE) {
        const related = results.slice(1).filter((r) => r.score >= MIN_CONFIDENCE).slice(0, 2);
        push({ from: 'bot', text: best.answer, linkPath: best.linkPath, linkLabel: best.linkLabel, related });
      } else {
        push({ from: 'bot', text: FALLBACK, related: results.slice(0, 3) });
        void logUnansweredQuestion(question);
      }
    } catch {
      push({ from: 'bot', text: 'Something went wrong while looking that up. Please try again in a moment.' });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Help chatbot"
          className="fixed bottom-20 right-4 z-40 flex h-[32rem] max-h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-base-700 bg-base-900 shadow-card-hover sm:right-6"
        >
          <header className="flex shrink-0 items-center gap-3 bg-brand-500 px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <Bot size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight">Second Serving Help</p>
              <p className="text-xs text-white/85">Ask me anything about the app</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </header>

          <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-base-950 px-3 py-4">
            {messages.map((m) =>
              m.from === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2 text-sm text-white">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="flex flex-col items-start gap-2">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-base-900 px-3.5 py-2.5 text-sm text-ink-300 shadow-card">
                    <p className="whitespace-pre-line break-words">{m.text}</p>
                    {m.linkPath && (
                      <Link
                        to={m.linkPath}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:underline"
                      >
                        {m.linkLabel ?? 'Open'} <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                  {m.related && m.related.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.related.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => showAnswer(r)}
                          className="rounded-full border border-brand-500/40 bg-base-900 px-3 py-1 text-left text-xs font-semibold text-brand-400 hover:bg-brand-500/10"
                        >
                          {r.question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void ask(s)}
                    className="rounded-full border border-brand-500/40 bg-base-900 px-3 py-1 text-xs font-semibold text-brand-400 hover:bg-brand-500/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {busy && (
              <div className="flex" aria-label="Typing">
                <span className="rounded-2xl rounded-bl-md bg-base-900 px-3.5 py-2.5 text-sm text-ink-500 shadow-card">
                  Looking that up…
                </span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-base-700 bg-base-900 p-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="Type your question…"
              aria-label="Your question"
              className="min-w-0 flex-1 rounded-xl border border-base-600 bg-base-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close help chat' : 'Open help chat'}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-colors hover:bg-brand-400 sm:right-6"
      >
        {open ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
