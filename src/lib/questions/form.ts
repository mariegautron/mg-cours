import { isQuestionType, type ChoiceInput, type QuestionInput } from "@/lib/questions/types";
import { fractionsFromChecks, parseTags } from "@/lib/questions/validate";

interface RawChoice {
  text?: unknown;
  correct?: unknown;
  /** Fraction en pourcentage (−100…100) ; vide : répartie entre les bonnes réponses. */
  percent?: unknown;
  feedback?: unknown;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const optionalNumber = (raw: string): number | null => {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};

/** Choix du formulaire (`choicesJson`) → choix métier : la fraction saisie prime sur la répartition. */
export function choicesFromForm(json: string): ChoiceInput[] {
  let raw: RawChoice[] = [];
  try {
    const parsed: unknown = JSON.parse(json || "[]");
    if (Array.isArray(parsed)) raw = parsed as RawChoice[];
  } catch {
    raw = [];
  }
  const checks = raw.map((c) => c.correct === true);
  const shares = fractionsFromChecks(checks);
  return raw.map((c, i) => {
    const percent = typeof c.percent === "string" ? optionalNumber(c.percent) : null;
    const fraction =
      percent === null || Number.isNaN(percent)
        ? shares[i]
        : Math.max(-1, Math.min(1, Math.round(percent * 100) / 10000));
    return {
      text: typeof c.text === "string" ? c.text : "",
      fraction,
      feedback: typeof c.feedback === "string" ? c.feedback.trim() : "",
    };
  });
}

export function readQuestionForm(formData: FormData): { input: QuestionInput } | { error: string } {
  const type = str(formData.get("type"));
  if (!isQuestionType(type)) return { error: "Choisis le type de la question." };
  const points = optionalNumber(str(formData.get("defaultPoints")));
  const value = optionalNumber(str(formData.get("numericValue")));
  const tolerance = optionalNumber(str(formData.get("numericTolerance")));
  return {
    input: {
      category: str(formData.get("category")).trim(),
      name: str(formData.get("name")).trim(),
      type,
      statement: str(formData.get("statement")).trim(),
      generalFeedback: str(formData.get("generalFeedback")).trim(),
      defaultPoints: points === null ? 1 : points,
      tags: parseTags(str(formData.get("tags"))),
      choices: choicesFromForm(str(formData.get("choicesJson"))),
      numericValue: value,
      numericTolerance: tolerance,
    },
  };
}
