import { supabase } from '../lib/supabaseClient';

export interface HelpAnswer {
  id: string;
  category: string;
  question: string;
  answer: string;
  linkPath: string | null;
  linkLabel: string | null;
  score: number;
}

/** Matches below this score are treated as "the bot does not know". */
export const MIN_CONFIDENCE = 1.0;

export const MAX_QUESTION_LENGTH = 300;

/** Ranks the help FAQs in the database against a free-text question. Works signed-in or signed-out. */
export async function searchHelp(query: string, limit = 4): Promise<HelpAnswer[]> {
  const { data, error } = await supabase.rpc('search_help_faqs', {
    p_query: query.slice(0, MAX_QUESTION_LENGTH),
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    linkPath: row.link_path,
    linkLabel: row.link_label,
    score: row.score,
  }));
}

/** Lets admins see which questions the bot could not answer. Never throws: it is best-effort. */
export async function logUnansweredQuestion(query: string): Promise<void> {
  try {
    await supabase.rpc('log_unanswered_question', { p_query: query.slice(0, MAX_QUESTION_LENGTH) });
  } catch {
    /* ignore */
  }
}
