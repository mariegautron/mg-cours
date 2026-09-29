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
  hidden: "Ta note ne s’affiche pas ici : ton enseignante te la communiquera.",
  pending: "Ta copie est en cours de correction : ta note apparaîtra ici quand tout sera corrigé.",
  after_close:
    "Ta note et le corrigé seront visibles ici quand le QCM sera clôturé pour tout le monde.",
} as const;

export function QuizResults({ state }: { state: SubmittedState }) {
  const r = state.results;
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{state.title}</h1>
      <p role="status">
        Ta copie est rendue ({dateTime(state.submitted_at)}). Merci !
        {state.late ? " Elle a été rendue après l’heure limite." : ""}
      </p>
      {r.visibility !== "shown" ? (
        <p>{MESSAGES[r.visibility]}</p>
      ) : (
        <>
          <p className="text-lg font-medium">
            Ta note : {fmt(r.score)} / {fmt(r.max)}
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
                        Ta réponse :{" "}
                        {answer && "text" in answer && answer.text.trim() ? answer.text : "aucune"}
                      </p>
                    ) : q.type === "numerical" ? (
                      <p className="text-sm">
                        Ta réponse :{" "}
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
                                {[good ? "Bonne réponse" : null, chosen ? "Ta réponse" : null]
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
