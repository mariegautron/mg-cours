import "server-only";

import { isAttendance, type Attendance, type MemberOverride } from "@/lib/assessments/attendance";
import { parseCriterionComments } from "@/lib/assessments/feedback";
import {
  lettersFromScores,
  needsRewrite,
  parseWritten,
  type OralCriterion,
  type OralLevel,
} from "@/lib/assessments/oral-space";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface OralContext {
  assessment: {
    id: string;
    module_id: string;
    is_group_grade: boolean;
    max_score: number | null;
    auto_validated_criterion_ids: string[];
  };
  criteria: OralCriterion[];
  maxScore: number | null;
  /** Personnes de l'espace : membres du groupe, ou la personne seule (oral individuel). */
  members: { id: string; name: string }[];
  /** Note existante (lue telle quelle), `null` si l'oral n'a jamais été noté. */
  grade: Tables<"grade"> | null;
  overrides: Tables<"group_grade_member">[];
}

/** Charge tout ce qu'il faut pour un espace (grille, personnes, note existante). `null` si introuvable. */
export async function loadOralContext(
  supabase: Supabase,
  assessmentId: string,
  subjectId: string,
): Promise<OralContext | null> {
  const { data: a } = await supabase
    .from("assessment")
    .select(
      "id, module_id, is_group_grade, max_score, auto_validated_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, label, weight, axis_id, is_bonus, position, criterion_level(points, description)))",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!a) return null;
  const rawCriteria = (
    a.grading_grid as unknown as {
      grid_criterion: {
        id: string;
        label: string;
        weight: number;
        axis_id: string | null;
        is_bonus: boolean;
        position: number;
        criterion_level: OralLevel[];
      }[];
    } | null
  )?.grid_criterion;
  const criteria: OralCriterion[] = [...(rawCriteria ?? [])]
    .sort((x, y) => x.position - y.position)
    .map((c) => ({
      id: c.id,
      label: c.label,
      weight: c.weight,
      axisId: c.axis_id,
      isBonus: c.is_bonus,
      levels: [...c.criterion_level].sort((x, y) => y.points - x.points),
    }));

  let members: { id: string; name: string }[];
  if (a.is_group_grade) {
    const { data: rows } = await supabase
      .from("group_member")
      .select("student:student_id(id, first_name, last_name)")
      .eq("student_group_id", subjectId);
    members = (rows ?? [])
      .map((r) => r.student as { id: string; first_name: string; last_name: string } | null)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))
      .sort((x, y) => x.name.localeCompare(y.name, "fr"));
  } else {
    const { data: s } = await supabase
      .from("student")
      .select("id, first_name, last_name")
      .eq("id", subjectId)
      .maybeSingle();
    members = s ? [{ id: s.id, name: `${s.first_name} ${s.last_name}` }] : [];
  }

  const { data: grade } = await supabase
    .from("grade")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq(a.is_group_grade ? "student_group_id" : "student_id", subjectId)
    .maybeSingle();
  const { data: overrides } = grade
    ? await supabase.from("group_grade_member").select("*").eq("grade_id", grade.id)
    : { data: [] };

  return {
    assessment: {
      id: a.id,
      module_id: a.module_id,
      is_group_grade: a.is_group_grade,
      max_score: a.max_score,
      auto_validated_criterion_ids: a.auto_validated_criterion_ids,
    },
    criteria,
    maxScore: a.max_score,
    members,
    grade: grade ?? null,
    overrides: overrides ?? [],
  };
}

export interface SpaceSeed {
  letters: Record<string, string>;
  criterion_notes: Record<string, string>;
  attendance: Record<string, Attendance>;
  from_existing: boolean;
  absence_rule: "group_all" | "legacy";
}

/**
 * Présences de l'espace, lues sur la copie (seule source) : `grade.attendance` pour une note
 * individuelle, `group_grade_member` pour une note de groupe (pas de ligne = présent·e). Sans
 * copie, aucune présence n'est connue : elles sont « à poser ».
 */
export function copyAttendance(
  ctx: Pick<OralContext, "assessment" | "members" | "grade" | "overrides">,
): Record<string, Attendance> {
  const out: Record<string, Attendance> = {};
  if (!ctx.grade) return out;
  if (ctx.assessment.is_group_grade) {
    const byStudent = new Map(ctx.overrides.map((o) => [o.student_id, o.attendance]));
    for (const m of ctx.members) {
      const a = byStudent.get(m.id);
      out[m.id] = isAttendance(a) ? a : "present";
    }
  } else if (ctx.members[0]) {
    out[ctx.members[0].id] = isAttendance(ctx.grade.attendance) ? ctx.grade.attendance : "present";
  }
  return out;
}

/**
 * État de départ d'un espace. Un oral déjà noté reprend ses lettres et ses commentaires. Les
 * présences viennent toujours de la copie (une absence posée avant la note comprise).
 */
export function seedFor(ctx: OralContext): SpaceSeed {
  const { grade } = ctx;
  const attendance = copyAttendance(ctx);
  if (
    !grade ||
    (grade.value === null && Object.keys((grade.scores ?? {}) as object).length === 0)
  ) {
    return {
      letters: {},
      criterion_notes: {},
      attendance,
      from_existing: false,
      absence_rule: "legacy",
    };
  }
  return {
    letters: lettersFromScores(ctx.criteria, grade.scores),
    criterion_notes: Object.fromEntries(
      Object.entries(parseCriterionComments(grade.criterion_comments)).filter(([k]) =>
        ctx.criteria.some((c) => c.id === k),
      ),
    ),
    attendance,
    from_existing: grade.value !== null,
    absence_rule: "legacy",
  };
}

export type { MemberOverride };

/**
 * Oraux dont la note écrite est « à réécrire » : une lettre a changé depuis l'écriture. Clés
 * `<évaluation>:<groupe ou personne>`. Ces copies comptent comme « en cours » (hors moyennes,
 * appréciations et publication) tant qu'elles ne sont pas réécrites. La présence n'entre plus en
 * compte : elle vit sur la copie, qui est donc toujours à jour. Les oraux jamais écrits par
 * l'espace (notes d'avant) ne sont jamais concernés : leur note ne bouge pas.
 */
export async function loadRewriteKeys(
  supabase: Supabase,
  assessmentIds: readonly string[],
): Promise<Set<string>> {
  if (assessmentIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("oral_space")
    .select("assessment_id, subject_id, letters, written")
    .in("assessment_id", assessmentIds as string[])
    .not("written", "is", null);
  if (error || !data) return new Set();
  const asStrings = (v: unknown): Record<string, string> =>
    typeof v === "object" && v !== null && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).filter(
            (e): e is [string, string] => typeof e[1] === "string",
          ),
        )
      : {};
  const keys = new Set<string>();
  for (const row of data) {
    const written = parseWritten(row.written);
    if (!written) continue;
    if (needsRewrite(written, asStrings(row.letters)))
      keys.add(`${row.assessment_id}:${row.subject_id}`);
  }
  return keys;
}
