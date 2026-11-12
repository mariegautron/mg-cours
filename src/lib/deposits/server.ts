import "server-only";

import { isUngradedReview } from "@/lib/assessments/progress-review";
import { callStudentView } from "@/lib/modules/student-public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

import { deadlineOf, parseAccepts, parseMode, type SubmitAccepts } from "./rules";

export interface DepositContext {
  studentId: string;
  firstName: string | null;
  assessmentId: string;
  ownerId: string;
  moduleId: string;
  title: string;
  accepts: SubmitAccepts;
  deadline: Date | null;
  /** Qui rend : la personne, ou son groupe. */
  owner: { kind: "student"; id: string } | { kind: "group"; id: string; name: string };
  /** Note écrite pour cette personne ou ce groupe : le dépôt est fermé (décision d'Arnaud, 9 nov.). */
  graded: boolean;
}

export type DepositContextResult = { ok: true; ctx: DepositContext } | { ok: false; error: string };

/**
 * Vérifie, côté serveur, TOUT ce qui autorise un dépôt : jeton d'espace valide (non révoqué), évaluation
 * publiée dans l'espace de cette personne, rendu « dans Marelle », et la personne appartient bien au
 * groupe visé. Le client à droits complets n'est utilisé qu'APRÈS ces contrôles, jamais avec un
 * identifiant venu du navigateur sans vérification.
 */
export async function loadDepositContext(
  token: string,
  assessmentId: string,
): Promise<DepositContextResult> {
  if (!isWellFormedToken(token) || !/^[0-9a-f-]{36}$/i.test(assessmentId)) {
    return { ok: false, error: "Ce lien ne fonctionne pas." };
  }
  const view = await callStudentView(token, false);
  if (view.status !== "ok" || !view.content?.espace) {
    return { ok: false, error: "Ce lien ne fonctionne pas." };
  }
  const published = view.content.espace.evaluations.find((e) => e.id === assessmentId);
  if (!published) return { ok: false, error: "Cette évaluation n’est pas disponible." };

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("module_student_link")
    .select("module_id, student_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (!link) return { ok: false, error: "Ce lien ne fonctionne pas." };

  const { data: row } = await admin
    .from("assessment")
    .select("*")
    .eq("id", assessmentId)
    .eq("module_id", link.module_id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Cette évaluation n’est pas disponible." };
  const extra = row as unknown as {
    submit_mode?: string;
    submit_accepts?: string;
    oral_start_time?: string | null;
  };
  if (parseMode(extra.submit_mode) !== "app") {
    return { ok: false, error: "Cette évaluation se rend ailleurs : suis la consigne." };
  }

  let owner: DepositContext["owner"] = { kind: "student", id: link.student_id };
  if (row.is_group_grade) {
    const { data: groups } = await admin
      .from("assessment_group")
      .select("student_group_id")
      .eq("assessment_id", assessmentId);
    const ids = (groups ?? []).map((g) => g.student_group_id);
    const { data: member } = ids.length
      ? await admin
          .from("group_member")
          .select("student_group_id, student_group:student_group_id(name)")
          .eq("student_id", link.student_id)
          .in("student_group_id", ids)
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (!member) return { ok: false, error: "Tu n’es dans aucun groupe pour cette évaluation." };
    owner = {
      kind: "group",
      id: member.student_group_id,
      name: (member.student_group as unknown as { name: string } | null)?.name ?? "Groupe",
    };
  }

  // Une fois la note écrite, plus de dépôt (même en retard) ; « Rouvrir la copie » ne le rouvre pas.
  const { data: gradeRow } = await admin
    .from("grade")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq(owner.kind === "group" ? "student_group_id" : "student_id", owner.id)
    .not("value", "is", null)
    .limit(1);
  // Point d'étape non noté : pas de note ; le dépôt se ferme quand le retour est terminé.
  let reviewDone = false;
  if (isUngradedReview(row)) {
    const { data: review } = await admin
      .from("progress_review")
      .select("state")
      .eq("assessment_id", assessmentId)
      .eq("subject_id", owner.id)
      .maybeSingle();
    reviewDone = review?.state === "done";
  }
  const { data: student } = await admin
    .from("student")
    .select("first_name")
    .eq("id", link.student_id)
    .maybeSingle();

  return {
    ok: true,
    ctx: {
      studentId: link.student_id,
      firstName: student?.first_name ?? null,
      assessmentId,
      ownerId: row.owner_id,
      moduleId: link.module_id,
      title: row.title,
      accepts: parseAccepts(extra.submit_accepts),
      deadline: deadlineOf(
        row.date,
        extra.oral_start_time ? extra.oral_start_time.slice(0, 5) : null,
      ),
      owner,
      graded: !!gradeRow?.[0] || reviewDone,
    },
  };
}
