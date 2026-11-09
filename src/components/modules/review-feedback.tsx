import { REVIEW_MARK_LABELS, type ReviewMark } from "@/lib/assessments/progress-review";
import type { PublishedReview } from "@/lib/assessments/review-public";

const TONE: Record<ReviewMark, string> = {
  ahead: "border-mint bg-mint/15",
  on_track: "border-primary bg-primary/10",
  review: "border-sun bg-sun/15",
};

/** Espace étudiant : « Point d'étape : retour de Marie » (sans note). */
export function ReviewFeedback({ review }: { review: PublishedReview }) {
  return (
    <section aria-labelledby="review-feedback" className="bg-card space-y-3 rounded-2xl border p-4">
      <h2 id="review-feedback" className="font-heading text-xl font-bold">
        Point d’étape : retour de Marie
      </h2>
      {review.globalComment.trim() ? (
        <p className="whitespace-pre-wrap">{review.globalComment}</p>
      ) : null}
      <ul className="space-y-2">
        {review.criteria.map((c) => (
          <li key={c.label} className="rounded-xl border p-3">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {c.label}
              {c.mark ? (
                <span className={`rounded-md border px-2 py-0.5 text-sm ${TONE[c.mark]}`}>
                  {REVIEW_MARK_LABELS[c.mark]}
                </span>
              ) : null}
            </p>
            {c.comment.trim() ? (
              <p className="mt-1 text-sm whitespace-pre-wrap">{c.comment}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {review.personal.trim() ? (
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold">Pour toi</p>
          <p className="text-sm whitespace-pre-wrap">{review.personal}</p>
        </div>
      ) : null}
    </section>
  );
}
