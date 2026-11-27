import { Check, MessageSquareText, Search, TriangleAlert } from "lucide-react";

import { REVIEW_MARK_LABELS, type ReviewMark } from "@/lib/assessments/progress-review";
import type { PublishedReview } from "@/lib/assessments/review-public";

const TONE: Record<ReviewMark, string> = {
  ahead: "border-mint bg-muted",
  on_track: "border-primary bg-muted",
  review: "border-sun bg-muted",
};

/** « Titre : c'est bon » ou « Titre : à creuser » en première ligne d'un paragraphe. */
const VERDICT = /^(.{2,80}?)\s*:\s*(c[’']est bon|à creuser)\s*$/i;
const WARNING = /^un point de vigilance\s*:\s*/i;

/**
 * Commentaire global : le texte reste celui qui a été écrit. Seuls les paragraphes qui suivent ces
 * deux formes sont mis en valeur ; tout le reste s'affiche tel quel.
 */
function Comment({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text
        .trim()
        .split(/\n\s*\n/)
        .map((block, i) => {
          const [first, ...rest] = block.split("\n");
          const verdict = VERDICT.exec(first);
          if (verdict) {
            const ok = !/creuser/i.test(verdict[2]);
            const Icon = ok ? Check : Search;
            return (
              <div
                key={i}
                className={`bg-card rounded-xl border border-l-4 p-4 ${ok ? "border-l-success" : "border-l-sun"}`}
              >
                <h3 className="flex flex-wrap items-center justify-between gap-2 text-base font-semibold">
                  {verdict[1]}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm ${ok ? "border-success text-success" : "border-sun"}`}
                  >
                    <Icon aria-hidden className="size-4" />
                    {ok ? "C’est bon" : "À creuser"}
                  </span>
                </h3>
                <p className="mt-2 whitespace-pre-wrap">{rest.join("\n")}</p>
              </div>
            );
          }
          if (WARNING.test(block)) {
            const body = block.replace(WARNING, "");
            return (
              <div key={i} className="border-sun bg-card rounded-xl border-2 p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <TriangleAlert aria-hidden className="size-5 shrink-0" />
                  Un point de vigilance
                </h3>
                <p className="mt-2 whitespace-pre-wrap">
                  {body.charAt(0).toUpperCase() + body.slice(1)}
                </p>
              </div>
            );
          }
          return (
            <p key={i} className={`whitespace-pre-wrap ${i === 0 ? "text-lg font-medium" : ""}`}>
              {block}
            </p>
          );
        })}
    </div>
  );
}

/** Espace étudiant : « Point d'étape : retour de Marie » (sans note). */
export function ReviewFeedback({ review }: { review: PublishedReview }) {
  return (
    <section
      aria-labelledby="review-feedback"
      className="border-primary bg-primary/10 space-y-4 rounded-xl border-2 p-5"
    >
      <h2 id="review-feedback" className="title-display flex items-center gap-2 text-xl">
        <MessageSquareText aria-hidden className="size-6 shrink-0" />
        Le retour de Marie
      </h2>
      {review.globalComment.trim() ? <Comment text={review.globalComment} /> : null}
      {review.criteria.length > 0 ? (
        <ul className="space-y-2">
          {review.criteria.map((c) => (
            <li key={c.label} className="bg-card rounded-xl border p-4">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {c.label}
                {c.mark ? (
                  <span className={`rounded-md border px-2 py-0.5 text-sm ${TONE[c.mark]}`}>
                    {REVIEW_MARK_LABELS[c.mark]}
                  </span>
                ) : null}
              </p>
              {c.comment.trim() ? <p className="mt-1 whitespace-pre-wrap">{c.comment}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {review.personal.trim() ? (
        <div className="bg-card rounded-xl border p-4">
          <p className="font-semibold">Pour toi</p>
          <p className="whitespace-pre-wrap">{review.personal}</p>
        </div>
      ) : null}
    </section>
  );
}
