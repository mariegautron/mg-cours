/**
 * Brouillon d'appréciation par gabarit (aucun service externe, rien ne sort de l'appli) : un point
 * fort, un axe de progrès concret, un encouragement, au « tu », centré sur le comportement.
 * Fonction pure : les phrases sont choisies parmi plusieurs variantes selon l'étiquette dominante
 * des observations, et deux personnes n'ont jamais la même phrase dans un même lot (`used`).
 */
import type { ObservationTag } from "@/lib/notebook/notebook";
import { truncateAppreciation } from "./appreciation";

export interface DraftInput {
  /** Sert à varier les phrases de façon stable d'une personne à l'autre. */
  seed: string;
  /** Étiquettes des observations de la personne (l'absence ou le retard est ignoré : c'est Edusign). */
  ownTags: ObservationTag[];
  /** Étiquettes des observations faites sur son groupe. */
  groupTags: ObservationTag[];
  hasStrengthsComment: boolean;
  hasProgressComment: boolean;
  /** Longueur maximale de l'école. */
  max: number;
}

export type DraftBasis = "personal" | "group" | "corrections" | "none";

export interface Draft {
  text: string;
  basis: DraftBasis;
}

export const BASIS_LABELS: Record<DraftBasis, string> = {
  personal: "Basé sur tes observations.",
  group: "Basé sur les infos du groupe : rien de précis sur cette personne.",
  corrections: "Basé sur tes commentaires de correction : aucune observation sur cette personne.",
  none: "Aucune info : brouillon générique, à personnaliser.",
};

const STRENGTH = {
  participation: [
    "Tu t’impliques à l’oral et ta participation fait avancer la classe.",
    "Tu prends la parole avec spontanéité et tes interventions nourrissent les échanges.",
    "Ta participation active pendant les séances est un vrai atout.",
    "Tu t’investis dans les échanges et tu donnes envie aux autres de s’exprimer.",
    "Tu es présent·e dans les discussions et tu apportes des idées utiles.",
    "Ton engagement en cours se remarque : tu participes avec sérieux et bonne humeur.",
  ],
  question: [
    "Tu poses des questions pertinentes qui montrent que tu réfléchis vraiment.",
    "Tes questions font avancer le cours et profitent à tout le monde.",
    "Tu cherches à comprendre en profondeur, et cela se voit dans tes questions.",
    "Ta curiosité est un moteur : tes questions sont toujours bien trouvées.",
    "Tu sais poser la bonne question au bon moment, c’est une vraie qualité.",
    "Tu questionnes avec justesse et cela t’aide à progresser.",
  ],
  group: [
    "Tu as trouvé ta place dans ton groupe et tu as contribué à une bonne dynamique.",
    "Tu as travaillé dans un esprit d’équipe qui a servi le projet.",
    "Au sein de ton groupe, tu as montré un vrai sens de la collaboration.",
    "Ton groupe a bien avancé et tu y as pris toute ta part.",
    "Tu as su travailler avec les autres de façon constructive.",
    "Tu t’es investi·e dans le travail collectif avec sérieux.",
  ],
  corrections: [
    "Tes rendus montrent de vrais points forts et un travail soigné.",
    "Tu as livré un travail de qualité dont les points forts sont bien visibles.",
    "Ton travail est sérieux et on y voit de vraies compétences.",
    "Tes productions témoignent d’un investissement réel.",
    "Tu as fourni un travail solide, avec des réussites à valoriser.",
    "Tes rendus sont appliqués et montrent ce que tu sais faire.",
  ],
  generic: [
    "Tu as montré de l’investissement tout au long du module.",
    "Tu t’es engagé·e dans le module avec sérieux.",
    "Ton attitude a été positive et agréable pendant les séances.",
    "Tu as suivi le module avec application.",
    "Tu as fait preuve de motivation pendant le module.",
    "Ton comportement en classe a été respectueux et constructif.",
  ],
};

const AXIS = {
  difficulty: [
    "Pour progresser, n’hésite pas à demander de l’aide dès qu’un point te bloque.",
    "Quand une notion t’échappe, ose le dire tout de suite : on avancera ensemble.",
    "Prends l’habitude de solliciter de l’aide plus tôt, cela t’évitera de te décourager.",
    "Un axe de progrès : revenir sur les notions difficiles sans attendre la fin.",
    "Ose poser tes questions dès qu’une difficulté apparaît, elles sont légitimes.",
    "Pour consolider, reprends régulièrement les points qui t’ont posé problème.",
  ],
  voice: [
    "Pour aller plus loin, ose prendre davantage la parole et partager tes idées.",
    "Tu peux gagner en confiance en intervenant plus souvent à l’oral.",
    "Un axe de progrès : t’exprimer plus spontanément devant la classe.",
    "N’hésite pas à proposer tes idées, elles ont leur place dans les échanges.",
    "Essaie de te lancer plus souvent : tes remarques seraient précieuses.",
    "Ose sortir de ta zone de confort en intervenant davantage.",
  ],
  progress: [
    "Poursuis tes efforts sur les points signalés dans tes corrections.",
    "Pour progresser, reprends les remarques de tes corrections et applique-les.",
    "Un axe de progrès : t’appuyer sur les retours reçus pour affiner ton travail.",
    "Continue à travailler les points relevés lors des corrections.",
    "Tes corrections indiquent des pistes concrètes : saisis-les.",
    "Prends le temps de relire les retours pour passer un cap.",
  ],
  generic: [
    "Pour aller plus loin, essaie d’être plus régulier·e dans ton investissement.",
    "Un axe de progrès : préparer davantage tes interventions et tes rendus.",
    "Tu peux encore progresser en prenant plus d’initiatives.",
    "Pour consolider, pense à approfondir par toi-même les sujets abordés.",
    "Essaie de gagner en autonomie sur les points que tu maîtrises moins.",
    "Un effort de régularité t’aiderait à franchir une nouvelle étape.",
  ],
};

const ENCOURAGEMENT = [
  "Continue ainsi, tu as de belles ressources.",
  "Je suis confiante pour la suite, bravo pour le chemin parcouru.",
  "Tu peux être fier·ère de ton parcours, poursuis dans cette voie.",
  "Garde cette énergie, elle te mènera loin.",
  "Tu as tout ce qu’il faut pour réussir, continue.",
  "Bonne continuation, je crois en ton potentiel.",
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Première variante pas encore utilisée dans le lot, à partir d'un point de départ propre à la personne. */
function pick(pool: readonly string[], seed: string, salt: string, used: Set<string>): string {
  const start = hash(`${seed}:${salt}`) % pool.length;
  for (let i = 0; i < pool.length; i++) {
    const phrase = pool[(start + i) % pool.length];
    if (!used.has(phrase)) return phrase;
  }
  return pool[start];
}

const count = (tags: ObservationTag[], tag: ObservationTag) => tags.filter((t) => t === tag).length;

/** Propose un brouillon ; `used` (modifié) mémorise les phrases déjà employées dans le lot. */
export function draftAppreciation(input: DraftInput, used: Set<string> = new Set()): Draft {
  const own = input.ownTags.filter((t) => t !== "absent_late");
  const group = input.groupTags.filter((t) => t !== "absent_late");
  const basis: DraftBasis =
    own.length > 0
      ? "personal"
      : group.length > 0
        ? "group"
        : input.hasStrengthsComment || input.hasProgressComment
          ? "corrections"
          : "none";
  const tags = basis === "personal" ? own : basis === "group" ? group : [];

  const participation = count(tags, "participation");
  const question = count(tags, "relevant_question");
  const difficulty = count(tags, "difficulty");

  const strengthPool =
    basis === "group"
      ? STRENGTH.group
      : participation === 0 && question === 0
        ? input.hasStrengthsComment
          ? STRENGTH.corrections
          : STRENGTH.generic
        : question > participation
          ? STRENGTH.question
          : STRENGTH.participation;
  const axisPool =
    difficulty > 0
      ? AXIS.difficulty
      : participation === 0 && basis !== "none" && basis !== "corrections"
        ? AXIS.voice
        : input.hasProgressComment
          ? AXIS.progress
          : AXIS.generic;

  const strength = pick(strengthPool, input.seed, "s", used);
  const axis = pick(axisPool, input.seed, "a", used);
  const encouragement = pick(ENCOURAGEMENT, input.seed, "e", used);

  const join = (parts: string[]) => parts.join(" ");
  let closing = encouragement;
  // Deux personnes n'ont jamais exactement le même texte : on change la conclusion au besoin.
  for (const alt of ENCOURAGEMENT) {
    if (!used.has(`T:${join([strength, axis, closing])}`)) break;
    closing = alt;
  }
  let text = join([strength, axis, closing]);
  if (text.length > input.max) text = join([strength, axis]);
  if (text.length > input.max) text = truncateAppreciation(join([strength, axis]), input.max);
  // Les phrases réellement gardées sont mémorisées pour les autres personnes du lot.
  for (const p of [strength, axis, closing]) if (text.includes(p)) used.add(p);
  used.add(`T:${text}`);
  return { text, basis };
}
