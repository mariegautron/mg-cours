import Link from "next/link";

import {
  ProgressReviewScreen,
  type ReviewCopy,
  type ReviewCriterion,
} from "@/components/assessments/progress-review-screen";
import type { AssessmentDetail } from "@/lib/assessments/queries";
import { reviewCriteria, reviewState } from "@/lib/assessments/progress-review";
import { gradingTargets } from "@/lib/assessments/targets";
import { deadlineOf } from "@/lib/deposits/rules";
import { groupByOwner } from "@/lib/projects/submission-items";
import { listSubmissionItems } from "@/lib/projects/submission-queries";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

const obj = (v: Json | null | undefined): Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, Json>) : {};

/** Écran « Commenter un point d'étape » (serveur) : copies, dépôts, retours déjà écrits. */
export async function ProgressReviewPage({
  moduleId,
  assessment,
  initialId,
}: {
  moduleId: string;
  assessment: AssessmentDetail;
  initialId?: string;
}) {
  const supabase = await createClient();
  const [{ data: rows }, submissionData] = await Promise.all([
    supabase.from("progress_review").select("*").eq("assessment_id", assessment.id),
    listSubmissionItems(assessment.id),
  ]);
  const reviews = new Map(
    ((rows ?? []) as Tables<"progress_review">[]).map((r) => [r.subject_id, r]),
  );
  const criteria: ReviewCriterion[] = reviewCriteria(
    assessment.grading_grid?.criteria ?? [],
    assessment.review_criterion_ids,
  ).map((c) => ({
    id: c.id,
    label: c.label,
    levels: c.levels.map((l) => l.description).filter(Boolean),
  }));

  const nameOf = new Map(
    assessment.groups.flatMap((g) =>
      g.members.map((m) => [m.id, `${m.first_name} ${m.last_name}`] as const),
    ),
  );
  const byOwner = groupByOwner(
    submissionData.items.map((it) => {
      const x = it as unknown as {
        submitted_at?: string | null;
        submitted_by_student_id?: string | null;
      };
      return {
        ...it,
        submitted_at: x.submitted_at ?? null,
        submitted_by_name: x.submitted_by_student_id
          ? (nameOf.get(x.submitted_by_student_id) ?? null)
          : null,
      };
    }),
  );

  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  const subjects = assessment.is_group_grade
    ? targets.map(({ group }) => ({
        id: group.id,
        name: group.name,
        isGroup: true,
        members: group.members.map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })),
      }))
    : targets.flatMap(({ students }) =>
        students.map((st) => ({
          id: st.id,
          name: `${st.first_name} ${st.last_name}`,
          isGroup: false,
          members: [] as { id: string; name: string }[],
        })),
      );

  const copies: ReviewCopy[] = subjects.map((sub) => {
    const r = reviews.get(sub.id);
    const values: Record<string, string> = {
      global: r?.global_comment ?? "",
      private: r?.private_note ?? "",
    };
    for (const c of criteria) {
      const m = obj(r?.marks)[c.id];
      const t = obj(r?.comments)[c.id];
      values[`mark:${c.id}`] = typeof m === "string" ? m : "";
      values[`comment:${c.id}`] = typeof t === "string" ? t : "";
    }
    for (const m of sub.members) {
      const t = obj(r?.person_comments)[m.id];
      values[`person:${m.id}`] = typeof t === "string" ? t : "";
    }
    const versions = Object.fromEntries(
      Object.entries(obj(r?.field_versions)).filter(
        (e): e is [string, number] => typeof e[1] === "number",
      ),
    );
    return {
      ...sub,
      items: byOwner.get(sub.id) ?? [],
      values,
      versions,
      state: reviewState(r),
      startedAt: r?.created_at ?? null,
    };
  });
  const states = copies.map((c) => c.state);
  const doneCount = states.filter((s) => s === "done" || s === "published").length;
  const publishable = states.filter((s) => s === "done").length;
  const back = `/modules/${moduleId}/assessments/${assessment.id}`;

  return (
    <div className="mx-auto max-w-[96rem] space-y-3">
      <Link href={back} className="text-sm underline underline-offset-2">
        ← {assessment.title}
      </Link>
      {criteria.length === 0 ? (
        <p className="rounded-2xl border p-3 text-sm">
          Ce point d’étape n’a pas encore de critères : choisis la grille de l’évaluation notée
          qu’il prépare.{" "}
          <Link href={`${back}/edit`} className="font-semibold underline underline-offset-2">
            Modifier le point d’étape
          </Link>
        </p>
      ) : (
        <ProgressReviewScreen
          moduleId={moduleId}
          assessmentId={assessment.id}
          title={assessment.title}
          copies={copies}
          criteria={criteria}
          deadline={deadlineOf(assessment.date, null)?.toISOString() ?? null}
          initialId={initialId}
          doneCount={doneCount}
          publishable={publishable}
        />
      )}
    </div>
  );
}
