import "server-only";

import { isUngradedReview } from "@/lib/assessments/progress-review";
import { parsePublishedReview, type PublishedReview } from "@/lib/assessments/review-public";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;

export interface FollowUpItem {
  id: string;
  kind: "file" | "link";
  name: string;
  url: string | null;
  /** Chemin privé : sert uniquement à la route de téléchargement, jamais affiché. */
  path: string | null;
}

/** Suivi d'un point d'étape non noté pour une personne : ce qui est enregistré et le retour publié. */
export interface FollowUp {
  items: FollowUpItem[];
  review: PublishedReview | null;
}

/**
 * Points d'étape non notés seulement : documents de la personne (ou de son groupe), déposés par
 * elle ou ajoutés par l'enseignante, et retour publié. Jamais les notes privées. L'appelant vérifie
 * l'accès (jeton d'espace ou session de l'enseignante) avant d'appeler.
 */
export async function loadFollowUp(
  client: Client,
  moduleId: string,
  studentId: string,
  assessmentIds: readonly string[],
): Promise<Record<string, FollowUp>> {
  const out: Record<string, FollowUp> = {};
  if (assessmentIds.length === 0) return out;
  const { data: rows } = await client
    .from("assessment")
    .select(
      "id, type, review_graded, is_group_grade, review_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, label, position, is_bonus))",
    )
    .eq("module_id", moduleId)
    .in("id", [...assessmentIds]);
  const reviews = (rows ?? []).filter((a) => isUngradedReview(a));
  if (reviews.length === 0) return out;
  const ids = reviews.map((a) => a.id);
  const [{ data: memberships }, { data: links }, { data: items }, { data: written }] =
    await Promise.all([
      client.from("group_member").select("student_group_id").eq("student_id", studentId),
      client
        .from("assessment_group")
        .select("assessment_id, student_group_id")
        .in("assessment_id", ids),
      client.from("submission_item").select("*").in("assessment_id", ids).order("created_at"),
      client
        .from("progress_review")
        .select("assessment_id, subject_id, published, published_at")
        .in("assessment_id", ids),
    ]);
  const mine = new Set((memberships ?? []).map((m) => m.student_group_id));
  for (const a of reviews) {
    const subject = a.is_group_grade
      ? (links ?? []).find((l) => l.assessment_id === a.id && mine.has(l.student_group_id))
          ?.student_group_id
      : studentId;
    if (!subject) continue;
    const owned = (items ?? []).filter(
      (i) =>
        i.assessment_id === a.id &&
        !(i as { replaced_at?: string | null }).replaced_at &&
        (a.is_group_grade ? i.group_id === subject : i.student_id === subject),
    );
    const row = (written ?? []).find((r) => r.assessment_id === a.id && r.subject_id === subject);
    out[a.id] = {
      items: owned.map((i) => ({
        id: i.id,
        kind: i.kind === "link" ? "link" : "file",
        name: i.file_name || i.label || i.url || "document",
        url: i.url,
        path: i.storage_path,
      })),
      review: row ? parsePublishedReview(a, row, studentId) : null,
    };
  }
  return out;
}

/** Même suivi depuis un lien d'espace : le jeton est vérifié avant toute lecture. */
export async function followUpForToken(
  token: string,
  assessmentIds: readonly string[],
): Promise<Record<string, FollowUp>> {
  if (!isWellFormedToken(token)) return {};
  try {
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("module_student_link")
      .select("module_id, student_id")
      .eq("token_hash", hashToken(token))
      .is("revoked_at", null)
      .maybeSingle();
    if (!link) return {};
    return await loadFollowUp(admin, link.module_id, link.student_id, assessmentIds);
  } catch {
    return {};
  }
}
