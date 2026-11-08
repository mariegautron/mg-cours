import { matchesRule } from "@/lib/quiz/draw";
import { createClient } from "@/lib/supabase/server";
import type { BankQuestion } from "@/lib/quiz/types";
import type { QuestionType } from "@/lib/questions/types";

/**
 * Dans combien de QCM une question peut-elle être tirée (selon les règles et la réserve du QCM),
 * dont combien ont déjà des tirages préparés. Le tirage déjà préparé garde l'ancienne version.
 */
export async function questionUsage(
  question: BankQuestion,
): Promise<{ quizzes: number; withDraws: number }> {
  const supabase = await createClient();
  const [{ data: quizzes }, { data: pools }, { data: attempts }] = await Promise.all([
    supabase.from("quiz").select("id, quiz_draw_rule(category, tags, types, count, points_each)"),
    supabase.from("quiz_pool").select("quiz_id, question_id"),
    supabase.from("quiz_attempt").select("quiz_id"),
  ]);
  const poolOf = new Map<string, Set<string>>();
  for (const p of pools ?? []) {
    const set = poolOf.get(p.quiz_id) ?? new Set<string>();
    set.add(p.question_id);
    poolOf.set(p.quiz_id, set);
  }
  const withAttempts = new Set((attempts ?? []).map((a) => a.quiz_id));
  let count = 0;
  let withDraws = 0;
  for (const q of quizzes ?? []) {
    const pool = poolOf.get(q.id);
    if (pool && !pool.has(question.id)) continue;
    const used = q.quiz_draw_rule.some((r) =>
      matchesRule(question, {
        category: r.category,
        tags: r.tags,
        types: r.types as QuestionType[],
        count: r.count,
        pointsEach: Number(r.points_each),
      }),
    );
    if (!used) continue;
    count++;
    if (withAttempts.has(q.id)) withDraws++;
  }
  return { quizzes: count, withDraws };
}
