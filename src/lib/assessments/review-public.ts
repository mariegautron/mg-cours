import "server-only";

import { isProgressReview, isReviewMark, reviewCriteria, type ReviewMark } from "./progress-review";
import { hashToken, isWellFormedToken } from "@/lib/quiz/token";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublishedReview {
  globalComment: string;
  criteria: { label: string; mark: ReviewMark | null; comment: string }[];
  /** Mot perso, vu par la personne seule. */
  personal: string;
  publishedAt: string;
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const text = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Retour publié d'un point d'étape pour la personne du lien d'espace : le commentaire global,
 * chaque critère avec son repère et son commentaire, son mot perso. Jamais les notes privées.
 * Le client à droits complets n'est utilisé qu'après la vérification du jeton.
 */
export async function loadPublishedReview(
  token: string,
  assessmentId: string,
): Promise<PublishedReview | null> {
  if (!isWellFormedToken(token) || !/^[0-9a-f-]{36}$/i.test(assessmentId)) return null;
  try {
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("module_student_link")
      .select("module_id, student_id")
      .eq("token_hash", hashToken(token))
      .is("revoked_at", null)
      .maybeSingle();
    if (!link) return null;
    const { data: a } = await admin
      .from("assessment")
      .select(
        "id, type, module_id, is_group_grade, review_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, label, position, is_bonus))",
      )
      .eq("id", assessmentId)
      .eq("module_id", link.module_id)
      .maybeSingle();
    if (!a || !isProgressReview(a)) return null;

    let subjectId = link.student_id;
    if (a.is_group_grade) {
      const { data: groups } = await admin
        .from("assessment_group")
        .select("student_group_id")
        .eq("assessment_id", assessmentId);
      const ids = (groups ?? []).map((g) => g.student_group_id);
      const { data: member } = ids.length
        ? await admin
            .from("group_member")
            .select("student_group_id")
            .eq("student_id", link.student_id)
            .in("student_group_id", ids)
            .limit(1)
            .maybeSingle()
        : { data: null };
      if (!member) return null;
      subjectId = member.student_group_id;
    }
    const { data: review } = await admin
      .from("progress_review")
      .select("published, published_at")
      .eq("assessment_id", assessmentId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (!review?.published || !review.published_at) return null;
    const pub = obj(review.published);
    const marks = obj(pub.marks);
    const comments = obj(pub.comments);
    const grid = a.grading_grid as unknown as {
      grid_criterion: { id: string; label: string; position: number; is_bonus: boolean }[];
    } | null;
    const criteria = reviewCriteria(
      [...(grid?.grid_criterion ?? [])].sort((x, y) => x.position - y.position),
      a.review_criterion_ids,
    ).map((c) => {
      const m = marks[c.id];
      return { label: c.label, mark: isReviewMark(m) ? m : null, comment: text(comments[c.id]) };
    });
    return {
      globalComment: text(pub.global_comment),
      criteria,
      personal: text(obj(pub.person_comments)[link.student_id]),
      publishedAt: review.published_at,
    };
  } catch {
    return null;
  }
}
