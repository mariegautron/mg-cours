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
      getGradesByAssessment(assessmentId),
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

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          href={`/modules/${id}/assessments/${assessmentId}`}
          className="text-sm underline underline-offset-2"
        >
          ← {assessment.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Faire passer l’oral — {assessment.title}</h1>
        <p className="text-muted-foreground">
          Ordre de passage, chronomètre et grille ouverte sur le groupe qui passe.
        </p>
      </div>

      <details
        open={orderedSlots.every((s) => s.status === "waiting")}
        className="rounded-lg border p-4"
      >
        <summary className="cursor-pointer text-lg font-medium">
          Ordre de passage et créneaux
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
          absenceRule={await getAbsenceRuleForModule(id)}
        />
      ) : (
        <p className="text-muted-foreground">
          Établissez l’ordre de passage pour ouvrir le chronomètre et la grille.
        </p>
      )}
    </div>
  );
}
