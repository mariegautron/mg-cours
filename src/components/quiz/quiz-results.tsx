import { Markdown } from "@/components/markdown";
import type { QuestionType } from "@/lib/questions/types";
import type { ReviewItem } from "@/lib/quiz/grading";
import type { StoredAnswer } from "@/lib/quiz/types";

interface ReviewQuestion {
  position: number;
  type: QuestionType;
  statement: string;
  points: number;
  choices: { id: number; text: string }[];
}

export interface SubmittedState {
  status: "submitted";
  title: string;
  submitted_at: string;
  late: boolean;
  results:
    | { visibility: "hidden" | "pending" | "after_close" }
    | {
        visibility: "shown";
        score: number;
        max: number;
        review: ReviewItem[] | null;
        questions: ReviewQuestion[] | null;
        answers: Record<string, StoredAnswer> | null;
      };
}

const fmt = (n: number | null) => (n === null ? "—" : String(n).replace(".", ","));
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });

const MESSAGES = {
  hidden: "Votre note ne s’affiche pas ici : votre enseignante vous la communiquera.",
  pending:
    "Votre copie est en cours de correction : votre note apparaîtra ici quand tout sera corrigé.",
  after_close:
    "Votre note et le corrigé seront visibles ici quand le QCM sera clôturé pour tout le monde.",
} as const;

export function QuizResults({ state }: { state: SubmittedState }) {
  const r = state.results;
  return (
    <section className="space-y-5">
      <p className="text-muted-foreground text-sm font-semibold">{state.title}</p>
      <div className="space-y-3">
        <p role="status">
          <span className="border-mint/45 bg-mint/12 text-mint inline-flex min-h-7 items-center rounded-full border px-3 text-sm font-bold">
            Vos réponses sont envoyées
          </span>
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Merci, c’est terminé</h1>
        <p>
          Votre copie est rendue ({dateTime(state.submitted_at)}).
          {state.late ? " Elle a été rendue après l’heure limite." : ""}
        </p>
      </div>
      {r.visibility !== "shown" ? (
        <div className="bg-card space-y-1 rounded-xl border p-4">
          <p className="font-semibold">Après la clôture</p>
          <p className="text-muted-foreground text-sm">{MESSAGES[r.visibility]}</p>
          <p className="text-muted-foreground text-sm">Revenez sur ce lien : il reste le vôtre.</p>
        </div>
      ) : (
        <>
          <p className="text-lg font-medium">
            Votre note : {fmt(r.score)} / {fmt(r.max)}
          </p>
          {r.review && r.questions ? (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Corrigé</h2>
              {r.questions.map((q) => {
                const item = r.review!.find((x) => x.position === q.position);
                const answer = r.answers?.[String(q.position)];
                return (
                  <section
                    key={q.position}
                    aria-labelledby={`c${q.position}`}
                    className="space-y-2 rounded-lg border p-4"
                  >
                    <h3 id={`c${q.position}`} className="text-sm font-medium">
                      Question {q.position} ·{" "}
                      {item
                        ? `${fmt(item.earned)} / ${fmt(item.max)} pt${item.max > 1 ? "s" : ""}`
                        : ""}
                    </h3>
                    <Markdown source={q.statement} />
                    {q.type === "open" ? (
                      <p className="bg-muted/40 rounded p-2 text-sm whitespace-pre-wrap">
                        Votre réponse :{" "}
                        {answer && "text" in answer && answer.text.trim() ? answer.text : "aucune"}
                      </p>
                    ) : q.type === "numerical" ? (
                      <p className="text-sm">
                        Votre réponse :{" "}
                        {answer && "number" in answer && answer.number.trim()
                          ? answer.number
                          : "aucune"}{" "}
                        — attendu : {item?.expected_number}
                        {item?.tolerance ? ` (± ${item.tolerance})` : ""}
                      </p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {q.choices.map((c) => {
                          const good = item?.correct.includes(c.id);
                          const chosen = item?.chosen.includes(c.id);
                          return (
                            <li key={c.id}>
                              <span className="font-medium">
                                {[good ? "Bonne réponse" : null, chosen ? "Votre réponse" : null]
                                  .filter(Boolean)
                                  .join(" · ") || "Autre choix"}
                                {" : "}
                              </span>
                              {c.text}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {item?.feedback.length ? (
                      <p className="text-muted-foreground text-sm">{item.feedback.join(" ")}</p>
                    ) : null}
                    {item?.general_feedback ? <Markdown source={item.general_feedback} /> : null}
                  </section>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
