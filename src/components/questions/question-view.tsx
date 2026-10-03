import { Markdown } from "@/components/markdown";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/questions/types";
import type { StoredAnswer } from "@/lib/quiz/types";

export interface QuestionViewProps {
  /** Préfixe unique des identifiants (plusieurs questions sur une page). */
  idPrefix: string;
  /** « Question 3 », affiché comme légende du groupe. */
  label: string;
  type: QuestionType;
  statement: string;
  /** Choix sans aucune indication de bonne réponse : ce composant sert aussi la passation. */
  choices: { id: string; text: string }[];
  points?: number | null;
  /** Mode passation : réponse courante et rappel à chaque changement (sinon aperçu non interactif). */
  answer?: StoredAnswer | null;
  onAnswer?: (answer: StoredAnswer) => void;
}

/**
 * Question telle que la voit l'étudiant·e : groupe de champs légendé, vrais boutons radio / cases à
 * cocher reliés à leur libellé. Ne reçoit JAMAIS les bonnes réponses.
 */
export function QuestionView({
  idPrefix,
  label,
  type,
  statement,
  choices,
  points,
  answer,
  onAnswer,
}: QuestionViewProps) {
  const controlled = onAnswer !== undefined;
  const picked = answer && "choices" in answer ? answer.choices : [];
  const statementId = `${idPrefix}-statement`;
  const multiple = type === "multiple_choice";
  return (
    <fieldset aria-describedby={statementId} className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        {label}
        {points ? (
          <span className="text-muted-foreground font-normal">
            {" "}
            · {points} pt{points > 1 ? "s" : ""}
          </span>
        ) : null}
        <span className="text-muted-foreground font-normal">
          {" "}
          · {QUESTION_TYPE_LABELS[type]}
          {multiple ? " (plusieurs réponses possibles)" : ""}
        </span>
      </legend>
      <div id={statementId}>
        <Markdown source={statement} />
      </div>
      {type === "open" ? (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-answer`} className="text-sm font-medium">
            Votre réponse
          </label>
          <textarea
            id={`${idPrefix}-answer`}
            name={`${idPrefix}-answer`}
            rows={5}
            {...(controlled
              ? {
                  value: answer && "text" in answer ? answer.text : "",
                  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    onAnswer({ text: e.target.value }),
                }
              : {})}
            className="border-input w-full rounded-md border bg-transparent p-2 text-sm"
          />
        </div>
      ) : type === "numerical" ? (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-answer`} className="text-sm font-medium">
            Votre réponse (un nombre)
          </label>
          <input
            id={`${idPrefix}-answer`}
            name={`${idPrefix}-answer`}
            type="text"
            inputMode="decimal"
            {...(controlled
              ? {
                  value: answer && "number" in answer ? answer.number : "",
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    onAnswer({ number: e.target.value }),
                }
              : {})}
            className="border-input h-9 w-40 rounded-md border bg-transparent px-3 text-sm"
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {choices.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <input
                id={`${idPrefix}-${c.id}`}
                name={`${idPrefix}-choice`}
                value={c.id}
                type={multiple ? "checkbox" : "radio"}
                {...(controlled
                  ? {
                      checked: picked.includes(Number(c.id)),
                      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                        const id = Number(c.id);
                        onAnswer({
                          choices: multiple
                            ? e.target.checked
                              ? [...picked, id]
                              : picked.filter((x) => x !== id)
                            : [id],
                        });
                      },
                    }
                  : {})}
                className="mt-1 size-4"
              />
              <label htmlFor={`${idPrefix}-${c.id}`} className="text-sm">
                <Markdown source={c.text} />
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
