import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buildSessionSections,
  toObservationLines,
} from "@/app/(app)/modules/[id]/assessments/grading-sections";
import { OralPlan, type PlanSlot } from "@/components/assessments/oral-plan";
import { OralStage, type StageSlot } from "@/components/assessments/oral-stage";
import type { TextMeta } from "@/components/assessments/oral-texts-panel";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import type { OralSpaceInit } from "@/components/assessments/oral-space";
import { memberValues, parseWritten, type OralCriterion } from "@/lib/assessments/oral-space";
import { loadRewriteKeys, seedFor } from "@/lib/assessments/oral-space-server";
import {
  getAssessment,
  getGradesByAssessment,
  listComments,
  listGroupGradeMembers,
} from "@/lib/assessments/queries";
import { isOralAssessment, oralSchedule, slotDuration } from "@/lib/assessments/oral";
import { getModule } from "@/lib/modules/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { themeTitleByGroup } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/oral">): Promise<Metadata> {
  const { assessmentId } = await params;
  const assessment = await getAssessment(assessmentId);
  return { title: assessment ? `Oral — ${assessment.title}` : "Oral" };
}

export default async function OralPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/oral">) {
  const { id, assessmentId } = await params;
  const supabase = await createClient();
  const [mod, assessment, grades, comments, moduleObservations, { data: slotRows }] =
    await Promise.all([
      getModule(id),
      getAssessment(assessmentId),
      getGradesByAssessment(assessmentId, { skipRewrite: true }),
      listComments(),
      listModuleObservations(id),
      supabase.from("oral_slot").select("*").eq("assessment_id", assessmentId).order("position"),
    ]);
  if (!mod || !assessment || assessment.module_id !== id) notFound();
  if (!isOralAssessment(assessment)) notFound();

  const [overrideRows, themes] = await Promise.all([
    listGroupGradeMembers(grades.filter((g) => g.student_group_id).map((g) => g.id)),
    themeTitleByGroup(assessment.project_id),
  ]);

  const rows = (slotRows ?? []).filter((r) =>
    assessment.groups.some((g) => g.id === r.student_group_id),
  );
  const durations = rows.map((r) => slotDuration(r.duration_minutes, assessment.duration_minutes));
  const schedule = oralSchedule(assessment.oral_start_time, durations);
  const slots: (PlanSlot & StageSlot)[] = rows.map((r, i) => {
    const group = assessment.groups.find((g) => g.id === r.student_group_id)!;
    return {
      id: r.id,
      groupId: group.id,
      groupName: group.name,
      method: r.order_method,
      durationMinutes: r.duration_minutes,
      effectiveMinutes: durations[i],
      start: schedule[i].start,
      end: schedule[i].end,
      status: r.status,
      members: group.members.map((m) => `${m.first_name} ${m.last_name}`),
      theme: themes[group.id] ?? null,
    };
  });

  // Les copies suivent l'ordre de passage ; les groupes sans créneau viennent après.
  const sections = buildSessionSections({
    moduleId: id,
    assessment,
    grades,
    overrideRows,
    observations: toObservationLines(moduleObservations),
    themes,
  }).map((section) => ({
    ...section,
    items: [...section.items].sort((a, b) => {
      const rank = (itemId: string) => {
        const i = slots.findIndex((s) => s.groupId === itemId);
        return i === -1 ? slots.length : i;
      };
      return rank(a.id) - rank(b.id);
    }),
  }));
  const orderedSlots = slots;

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
    for (const slot of orderedSlots) {
      const group = assessment.groups.find((g) => g.id === slot.groupId);
      if (!group) continue;
      const members = group.members
        .map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
      const grade = grades.find((g) => g.student_group_id === group.id) ?? null;
      const overrides = grade ? overrideRows.filter((o) => o.grade_id === grade.id) : [];
      const seed = seedFor({
        assessment: {
          id: assessment.id,
          module_id: id,
          is_group_grade: true,
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

  return (
    <div className="mx-auto max-w-[96rem] space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Link
          href={`/modules/${id}/assessments/${assessmentId}`}
          className="text-sm underline underline-offset-2"
        >
          ← {assessment.title}
        </Link>
        <h1 className="text-xl font-semibold">Faire passer l’oral</h1>
        <Link
          href={`/modules/${id}/assessments/${assessmentId}/consignes`}
          className="text-sm underline underline-offset-2"
        >
          Voir les consignes comme l’étudiant·e
        </Link>
      </div>

      <details open={orderedSlots.length === 0} className="rounded-lg border px-3 py-1.5">
        <summary className="cursor-pointer text-base font-medium">
          Ordre de passage et créneaux
          {orderedSlots.length > 0 ? (
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              · {orderedSlots.length} groupe{orderedSlots.length > 1 ? "s" : ""}
              {orderedSlots[0].start && orderedSlots[orderedSlots.length - 1].end
                ? ` · ${orderedSlots[0].start}–${orderedSlots[orderedSlots.length - 1].end}`
                : ""}
            </span>
          ) : null}
        </summary>
        <div className="mt-4">
          <OralPlan
            moduleId={id}
            assessmentId={assessmentId}
            groups={assessment.groups.map((g) => ({ id: g.id, name: g.name }))}
            slots={orderedSlots}
            startTime={assessment.oral_start_time?.slice(0, 5) ?? null}
            durationMinutes={assessment.duration_minutes}
            orderSeed={rows.find((r) => r.order_seed)?.order_seed ?? null}
          />
        </div>
      </details>

      {orderedSlots.length > 0 ? (
        <OralStage
          moduleId={id}
          assessmentId={assessmentId}
          slots={orderedSlots}
          sections={sections}
          grid={assessment.grading_grid}
          maxScore={assessment.maxScore}
          comments={comments}
          autoValidatedIds={assessment.auto_validated_criterion_ids}
          subject={mod.name}
          absenceRule={schoolRule}
          spaces={Object.keys(spaces).length > 0 ? spaces : undefined}
          oralCriteria={Object.keys(spaces).length > 0 ? oralCriteria : undefined}
        />
      ) : (
        <p className="text-muted-foreground">
          Établissez l’ordre de passage pour ouvrir le chronomètre et la grille.
        </p>
      )}
    </div>
  );
}
