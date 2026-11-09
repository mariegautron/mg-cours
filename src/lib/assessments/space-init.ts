import "server-only";

import type { OralSpaceInit } from "@/components/assessments/oral-space";
import type { TextMeta } from "@/components/assessments/oral-texts-panel";
import { memberValues, parseWritten, type OralCriterion } from "@/lib/assessments/oral-space";
import { loadRewriteKeys, seedFor } from "@/lib/assessments/oral-space-server";
import type {
  getAssessment,
  getGradesByAssessment,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";

export interface SpaceSubject {
  id: string;
  isGroup: boolean;
  members: { id: string; name: string }[];
}

/**
 * États de départ des espaces de correction en lettres (oral, rendu) : une entrée par groupe ou
 * personne. `spaces` est vide si la table des espaces manque ou si la grille n'a aucun critère.
 */
export async function buildSpaceInits({
  id,
  assessmentId,
  assessment,
  grades,
  overrideRows,
  subjects,
}: {
  id: string;
  assessmentId: string;
  assessment: NonNullable<Awaited<ReturnType<typeof getAssessment>>>;
  grades: Awaited<ReturnType<typeof getGradesByAssessment>>;
  overrideRows: Awaited<ReturnType<typeof listGroupGradeMembers>>;
  subjects: readonly SpaceSubject[];
}) {
  const supabase = await createClient();
  // Espaces de correction (lettres, notes privées, récapitulatif). Sans la table en base, on garde
  // l'ancienne grille de correction.
  const { data: spaceRows, error: spaceError } = await supabase
    .from("oral_space")
    .select("*")
    .eq("assessment_id", assessmentId);
  const schoolRule = await getAbsenceRuleForModule(id);
  // Prénoms du module (un texte de groupe n'en contient aucun) et supports déposés par groupe.
  const { data: nameRows } = await supabase
    .from("group_member")
    .select("student:student_id(first_name), student_group:student_group_id!inner(module_id)")
    .eq("student_group.module_id", id);
  const moduleNames = [
    ...new Set(
      (nameRows ?? [])
        .map((r) => (r.student as unknown as { first_name: string } | null)?.first_name)
        .filter((n): n is string => !!n),
    ),
  ];
  const submissionData = await listSubmissionItems(assessmentId);
  const supportByGroup = groupByOwner(
    submissionData.items.map((it) => {
      const x = it as unknown as { submitted_at?: string | null };
      return { ...it, submitted_at: x.submitted_at ?? null, submitted_by_name: null };
    }),
  );
  const asTexts = (v: unknown): Record<string, TextMeta> => {
    if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
    const out: Record<string, TextMeta> = {};
    for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
      const e = raw as Record<string, unknown>;
      if (typeof e?.text !== "string") continue;
      out[k] = {
        text: e.text,
        state: (["proposed", "to_validate", "validated", "to_review"].includes(String(e.state))
          ? e.state
          : "to_validate") as TextMeta["state"],
        hash: typeof e.hash === "string" ? e.hash : null,
        letter: typeof e.letter === "string" ? e.letter : null,
        sources: Array.isArray(e.sources) ? (e.sources as TextMeta["sources"]) : [],
      };
    }
    return out;
  };
  const oralCriteria: OralCriterion[] = (assessment.grading_grid?.criteria ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    weight: c.weight,
    axisId: c.axis_id,
    isBonus: c.is_bonus,
    levels: c.levels.map((l) => ({ points: l.points, description: l.description })),
  }));
  const spaces: Record<string, { members: { id: string; name: string }[]; init: OralSpaceInit }> =
    {};
  // « À réécrire » calculé comme partout ailleurs (Résultats, cartes, moyennes) : une seule règle.
  const rewriteKeys = await loadRewriteKeys(supabase, [assessmentId]);
  if (!spaceError && oralCriteria.length > 0) {
    for (const group of subjects) {
      const members = [...group.members].sort((a, b) => a.name.localeCompare(b.name, "fr"));
      const grade =
        grades.find((g) =>
          group.isGroup ? g.student_group_id === group.id : g.student_id === group.id,
        ) ?? null;
      const overrides = grade ? overrideRows.filter((o) => o.grade_id === grade.id) : [];
      const seed = seedFor({
        assessment: {
          id: assessment.id,
          module_id: id,
          is_group_grade: group.isGroup,
          max_score: assessment.max_score,
          auto_validated_criterion_ids: assessment.auto_validated_criterion_ids,
        },
        criteria: oralCriteria,
        maxScore: assessment.max_score,
        members,
        grade,
        overrides,
      });
      const row = (spaceRows ?? []).find((r) => r.subject_id === group.id);
      const asObj = (v: unknown): Record<string, string> =>
        typeof v === "object" && v !== null && !Array.isArray(v)
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>).filter(
                (e): e is [string, string] => typeof e[1] === "string",
              ),
            )
          : {};
      const versions = Object.fromEntries(
        Object.entries((row?.field_versions ?? {}) as Record<string, unknown>).filter(
          (e): e is [string, number] => typeof e[1] === "number",
        ),
      );
      // Ancienne note par personne, d'après la règle d'origine de cet oral.
      const before =
        grade && grade.value !== null
          ? memberValues(
              grade.value,
              assessment.maxScore,
              members,
              Object.fromEntries(overrides.map((o) => [o.student_id, o.attendance])),
              "legacy",
              schoolRule,
            )
          : {};
      spaces[group.id] = {
        members,
        init: {
          letters: row ? asObj(row.letters) : seed.letters,
          criterionNotes: row ? asObj(row.criterion_notes) : seed.criterion_notes,
          pad: row?.pad ?? "",
          personNotes: row ? asObj(row.person_notes) : {},
          // Présence posée dans l'espace, sinon celle de la note existante (absence enregistrée en
          // correction comprise) : jamais « À poser » pour une présence déjà connue.
          attendance: { ...seed.attendance, ...(row ? asObj(row.attendance) : {}) },
          versions,
          absenceRule: row
            ? row.absence_rule === "legacy"
              ? "legacy"
              : "group_all"
            : seed.absence_rule,
          fromExisting: row ? row.from_existing : seed.from_existing,
          written: parseWritten(row?.written),
          writtenAt: row?.written_at ?? null,
          before,
          hasNote: (!!grade && grade.value !== null) || !!parseWritten(row?.written),
          serverRewrite: rewriteKeys.has(`${assessmentId}:${group.id}`),
          noteAt: row?.written_at ?? (grade && grade.value !== null ? grade.updated_at : null),
          texts: asTexts(row?.texts),
          routed: (row?.routed && typeof row.routed === "object" && !Array.isArray(row.routed)
            ? row.routed
            : {}) as Record<string, { dest: string; at: string }>,
          moduleNames,
          support: supportByGroup.get(group.id) ?? [],
          resultsHref: `/modules/${id}/assessments/${assessmentId}/results`,
        },
      };
    }
  }
  return { oralCriteria, spaces, schoolRule };
}
