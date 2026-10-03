/**
 * Le cadre d'une évaluation projeté en classe (maquette « CadreProjete ») : quand, avec qui, ce
 * qu'on rend, comment c'est noté. Fonctions pures ; uniquement du contenu destiné aux étudiant·es.
 */
import { firstLine } from "@/lib/modules/frise";

export interface CadreInput {
  title: string;
  objective: string | null;
  /** Date de l'évaluation, sinon celle de la séance du rendu (AAAA-MM-JJ). */
  date: string | null;
  sessionNumber: number | null;
  /** Heure de passage (oral), `HH:MM`. */
  startTime: string | null;
  isGroupGrade: boolean;
  deliverableMd: string | null;
  maxScore: number;
  hasGrid: boolean;
}

export interface CadreBlock {
  key: "when" | "who" | "deliver" | "graded";
  label: string;
  value: string;
  sub: string | null;
  /** Bloc mis en avant (le quand) et bloc large (le rendu). */
  key_?: boolean;
  wide?: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Lundi 2 novembre ». */
export function longDay(iso: string): string {
  return cap(
    new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

/** Éléments du rendu attendu : les trois premières lignes utiles, puces retirées. */
export function deliverableItems(md: string | null): string[] {
  return (md ?? "")
    .split("\n")
    .map((l) => firstLine(l))
    .filter((l): l is string => !!l)
    .slice(0, 3);
}

export function cadreBlocks(c: CadreInput): CadreBlock[] {
  const blocks: CadreBlock[] = [
    {
      key: "when",
      label: "Quand",
      value: c.date ? longDay(c.date) : "Date à venir",
      sub: c.startTime
        ? `à ${c.startTime.slice(0, 5).replace(":", "h")}`
        : c.sessionNumber
          ? `séance ${c.sessionNumber}`
          : null,
      key_: true,
    },
    {
      key: "who",
      label: "Avec qui",
      value: c.isGroupGrade ? "En groupe" : "Seul·e",
      sub: c.isGroupGrade ? "votre groupe de projet" : "un travail personnel",
    },
  ];
  const items = deliverableItems(c.deliverableMd);
  if (items.length) {
    blocks.push({
      key: "deliver",
      label: "Ce que vous rendez",
      value: items.join(" · "),
      sub: null,
      wide: true,
    });
  }
  blocks.push({
    key: "graded",
    label: "Comment c’est noté",
    value: `${c.isGroupGrade ? "Note de groupe" : "Note individuelle"}, sur ${c.maxScore}`,
    sub: c.hasGrid ? "Grille sur la diapositive suivante" : null,
  });
  return blocks;
}
