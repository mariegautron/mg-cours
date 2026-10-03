/**
 * US-144 : préparer une évaluation individuelle. Fonctions pures : type (rendu de fichiers ou de
 * liens, QCM, en classe, oral), cadre attendu selon le type, points à vérifier avant de la fournir.
 * Le type reste un texte libre (champ existant) : les propositions ne remplacent rien.
 */
export type IndividualKind = "delivery" | "quiz" | "in_class" | "oral" | "other";

export const TYPE_PRESETS = [
  "Rendu de fichiers ou de liens",
  "QCM",
  "En classe (écrit)",
  "Oral individuel",
] as const;

/** Famille d'un type saisi, d'après son texte (accents et casse ignorés). */
export function kindOf(type: string | null | undefined): IndividualKind {
  const t = (type ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/\b(qcm|quiz)\b/.test(t)) return "quiz";
  if (/\boral\b/.test(t)) return "oral";
  if (/\b(en classe|sur table|ecrit)\b/.test(t)) return "in_class";
  if (/\b(rendu|fichier|fichiers|lien|liens|projet|dossier|depot)\b/.test(t)) return "delivery";
  return "other";
}

export interface Frame {
  dateLabel: string;
  /** La durée fait partie du cadre attendu pour ce type. */
  needsDuration: boolean;
  /** Phrase d'aide sous les champs du cadre. */
  hint: string;
}

const FRAMES: Record<IndividualKind, Frame> = {
  delivery: {
    dateLabel: "Date de rendu",
    needsDuration: false,
    hint: "Les étudiant·es rendent un ou plusieurs fichiers ou liens avant cette date. Précise la consigne et le rendu attendu.",
  },
  quiz: {
    dateLabel: "Date de passation",
    needsDuration: true,
    hint: "Le QCM se prépare dans « QCM en ligne » une fois l'évaluation créée : durée et ouverture s'y règlent.",
  },
  in_class: {
    dateLabel: "Date de l'épreuve",
    needsDuration: true,
    hint: "Épreuve écrite en classe : indique la durée et ce qui est autorisé dans la consigne.",
  },
  oral: {
    dateLabel: "Date de passage",
    needsDuration: true,
    hint: "Oral individuel : indique la durée de passage par personne.",
  },
  other: {
    dateLabel: "Date",
    needsDuration: false,
    hint: "Choisis un type pour voir le cadre qui lui correspond.",
  },
};

export function frameFor(type: string | null | undefined): Frame {
  return FRAMES[kindOf(type)];
}

/** Points à vérifier avant de fournir le sujet (jamais bloquants). */
export function frameWarnings(input: {
  type: string | null | undefined;
  date: string | null | undefined;
  durationMinutes: number | string | null | undefined;
}): string[] {
  const kind = kindOf(input.type);
  const frame = FRAMES[kind];
  const out: string[] = [];
  if (kind !== "other" && !input.date) out.push(`Indique la ${frame.dateLabel.toLowerCase()}.`);
  const minutes = Number(input.durationMinutes);
  if (frame.needsDuration && !(Number.isFinite(minutes) && minutes > 0)) {
    out.push("Indique la durée en minutes.");
  }
  return out;
}

/** Un rattrapage d'avance n'a de sens que pour une évaluation individuelle. */
export function canPrepareMakeupInAdvance(isGroupGrade: boolean, isMakeup: boolean): boolean {
  return !isGroupGrade && !isMakeup;
}
