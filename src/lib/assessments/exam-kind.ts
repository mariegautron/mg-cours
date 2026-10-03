/**
 * Évaluation individuelle (maquette IndPrep) : type d'épreuve, versions du sujet, arrivée des rendus
 * et lignes du cadre pour les étudiant·es. Fonctions pures.
 */
export type ExamKind = "files" | "qcm" | "in_class" | "oral";
export type SubjectVersions = "single" | "ab";
export type SubmissionMode = "app" | "manual";

export const EXAM_KINDS: { value: ExamKind; label: string }[] = [
  { value: "files", label: "Rendu de fichiers" },
  { value: "qcm", label: "QCM" },
  { value: "in_class", label: "En classe, à l’écrit" },
  { value: "oral", label: "Oral individuel" },
];

export const SUBJECT_VERSIONS: { value: SubjectVersions; label: string }[] = [
  { value: "single", label: "Un sujet pour tous" },
  { value: "ab", label: "Deux versions, A et B" },
];

export const SUBMISSION_MODES: { value: SubmissionMode; label: string }[] = [
  { value: "app", label: "Les étudiant·es déposent dans l’appli" },
  { value: "manual", label: "Je les ajoute moi-même (fichiers ou liens)" },
];

const isIn = <T extends string>(list: readonly { value: T }[], v: unknown): v is T =>
  list.some((x) => x.value === v);

export const parseExamKind = (v: unknown): ExamKind | null => (isIn(EXAM_KINDS, v) ? v : null);
export const parseSubjectVersions = (v: unknown): SubjectVersions =>
  isIn(SUBJECT_VERSIONS, v) ? v : "single";
export const parseSubmissionMode = (v: unknown): SubmissionMode | null =>
  isIn(SUBMISSION_MODES, v) ? v : null;

/** Type d'épreuve choisi, sinon deviné d'après le texte libre « type » (QCM, oral, écrit…). */
export function examKindOf(assessment: {
  exam_kind?: string | null;
  type?: string | null;
}): ExamKind {
  const chosen = parseExamKind(assessment.exam_kind);
  if (chosen) return chosen;
  const t = (assessment.type ?? "").toLowerCase();
  if (t.includes("qcm")) return "qcm";
  if (t.includes("oral")) return "oral";
  if (/écrit|ecrit|classe|contrôle|controle/.test(t)) return "in_class";
  return "files";
}

export interface FrameLine {
  label: string;
  text: string;
  /** Texte déduit des choix précédents (« Prérempli »), sinon à renseigner. */
  filled: boolean;
}

/** Les six lignes du cadre, prérenseignées d'après l'épreuve et la séance. */
export function individualFrame(input: {
  kind: ExamKind;
  mode: SubmissionMode | null;
  courseNumber: number | null;
  date: string | null;
  deliverable: string | null;
  evaluated: string | null;
  maxScore: number;
  coefficient: number;
}): FrameLine[] {
  const what: Record<ExamKind, string> = {
    files: "Un travail individuel à rendre : un ou plusieurs fichiers (rapport, code, captures…).",
    qcm: "Un QCM individuel, répondu en ligne.",
    in_class: "Une épreuve individuelle écrite, en classe.",
    oral: "Un oral individuel.",
  };
  const where: Record<ExamKind, string> = {
    files:
      input.mode === "app"
        ? "Dans l’appli : vous déposez vos fichiers."
        : input.mode === "manual"
          ? "Sur la plateforme de l’école ou envoyés à l’enseignante."
          : "Selon le choix de l’enseignante : dans l’appli, ou sur la plateforme de l’école.",
    qcm: "En ligne, avec le lien donné en classe.",
    in_class: "En classe, sur table.",
    oral: "Dans la salle de passage, à l’heure convoquée.",
  };
  const when = input.courseNumber
    ? input.kind === "files"
      ? `À rendre pour la séance ${input.courseNumber}.`
      : `Pendant la séance ${input.courseNumber}.`
    : input.date
      ? `Le ${new Date(`${input.date}T00:00:00`).toLocaleDateString("fr-FR")}.`
      : "";
  const give = input.deliverable?.trim();
  const how = input.evaluated?.trim();
  const out = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return [
    { label: "Quoi", text: what[input.kind], filled: true },
    { label: "Quand", text: when, filled: when !== "" },
    { label: "Où", text: where[input.kind], filled: true },
    { label: "Avec qui", text: "Seul·e, sans échange.", filled: true },
    {
      label: "À rendre",
      text:
        give ||
        (input.kind === "files"
          ? "Vos fichiers, un ou plusieurs, nommés avec votre nom."
          : "Vos réponses."),
      filled: true,
    },
    {
      label: "Comment c’est noté",
      text:
        how ||
        `Note individuelle sur ${out(input.maxScore)}, coefficient ×${out(input.coefficient)}, grille à paliers.`,
      filled: true,
    },
  ];
}
