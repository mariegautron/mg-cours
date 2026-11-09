import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface Enrollment {
  studentId: string;
  /** Date de départ (AAAA-MM-JJ) ; null = toujours inscrit·e. */
  leftAt: string | null;
}

/**
 * Inscrit·es d'un module. Sans la table `module_student` (migration pas encore appliquée) : les
 * membres de ses groupes, comme avant.
 */
export async function listEnrollments(
  moduleId: string,
): Promise<{ available: boolean; rows: Enrollment[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("module_student")
    .select("student_id, left_at")
    .eq("module_id", moduleId);
  if (!error) {
    return {
      available: true,
      rows: (data ?? []).map((r) => ({ studentId: r.student_id, leftAt: r.left_at })),
    };
  }
  const { data: groups } = await supabase
    .from("student_group")
    .select("group_member(student_id)")
    .eq("module_id", moduleId);
  const ids = new Set(
    ((groups ?? []) as unknown as { group_member: { student_id: string }[] }[]).flatMap((g) =>
      g.group_member.map((m) => m.student_id),
    ),
  );
  return { available: false, rows: [...ids].map((studentId) => ({ studentId, leftAt: null })) };
}

/** Personnes parties du module : elles sortent des comptes (appréciations, copies, liens…). */
export async function leftStudentIds(moduleId: string): Promise<Set<string>> {
  const { rows } = await listEnrollments(moduleId);
  return new Set(rows.filter((r) => r.leftAt).map((r) => r.studentId));
}

/** Inscrit au module (sans doublon) ; silencieux sans la table. */
export async function enroll(
  supabase: Supabase,
  moduleId: string,
  studentIds: string[],
): Promise<void> {
  if (studentIds.length === 0) return;
  await supabase.from("module_student").upsert(
    [...new Set(studentIds)].map((student_id) => ({ module_id: moduleId, student_id })),
    { onConflict: "module_id,student_id", ignoreDuplicates: true },
  );
}
