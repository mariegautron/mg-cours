import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ClassLinkInfo {
  /** Les tables existent ; sinon la page dit que la fonction arrive après la mise à jour de la base. */
  available: boolean;
  token: string | null;
  claimed: { attemptId: string; name: string; status: string; claimedAt: string }[];
}

export async function getClassLinkInfo(quizId: string): Promise<ClassLinkInfo> {
  try {
    const supabase = await createClient();
    const { data: link, error } = await supabase
      .from("quiz_class_link")
      .select("token")
      .eq("quiz_id", quizId)
      .is("revoked_at", null)
      .maybeSingle();
    if (error) return { available: false, token: null, claimed: [] };
    const { data: claims } = await supabase
      .from("quiz_claim")
      .select(
        "attempt_id, claimed_at, attempt:attempt_id(status, quiz_id, student:student_id(first_name, last_name))",
      )
      .order("claimed_at", { ascending: false });
    const claimed = (
      (claims ?? []) as unknown as {
        attempt_id: string;
        claimed_at: string;
        attempt: {
          status: string;
          quiz_id: string;
          student: { first_name: string; last_name: string } | null;
        } | null;
      }[]
    )
      .filter((c) => c.attempt?.quiz_id === quizId && c.attempt.student)
      .map((c) => ({
        attemptId: c.attempt_id,
        name: `${c.attempt!.student!.first_name} ${c.attempt!.student!.last_name}`,
        status: c.attempt!.status,
        claimedAt: c.claimed_at,
      }));
    return { available: true, token: link?.token ?? null, claimed };
  } catch {
    return { available: false, token: null, claimed: [] };
  }
}
