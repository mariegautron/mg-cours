/**
 * Gabarit d'appréciation (aucun service externe, rien ne sort de l'appli) : trame en trois parties,
 * au « tu » — un point fort, un axe de progrès, un encouragement — avec des trous
 * « [à compléter : …] » que Marie remplit. Fonctions pures.
 *
 * Les formulations sont composées (ouverture × corps) pour offrir assez de variantes : on choisit,
 * pour chaque partie, une phrase qu'aucune autre appréciation du module n'emploie déjà. Les
 * formulations de Marie passent avant celles de l'appli. Le texte brut des observations n'entre
 * jamais dans le gabarit : seules les étiquettes servent à choisir le thème.
 */
import type { ObservationTag } from "@/lib/notebook/notebook";
import { HOLE_PATTERN } from "./appreciation";

export type Part = "strength" | "axis" | "encouragement";

export const PARTS: Part[] = ["strength", "axis", "encouragement"];

export const PART_LABELS: Record<Part, string> = {
  strength: "Point fort",
  axis: "Axe de progrès",
  encouragement: "Encouragement",
};

export type DraftBasis = "personal" | "group" | "corrections" | "none";

export const BASIS_LABELS: Record<DraftBasis, string> = {
  personal: "Gabarit basé sur tes observations.",
  group: "Gabarit basé sur les infos du groupe : rien de précis sur cette personne.",
  corrections: "Gabarit basé sur tes commentaires de correction : aucune observation.",
  none: "Gabarit générique : aucune info sur cette personne.",
};

export interface TemplateInput {
  /** Fait varier de façon stable le point de départ dans les formulations. */
  seed: string;
  /** Étiquettes des observations de la personne (l'absence ou le retard relève d'Edusign : ignoré). */
  ownTags: ObservationTag[];
  /** Étiquettes des observations faites sur son groupe. */
  groupTags: ObservationTag[];
  hasStrengthsComment: boolean;
  hasProgressComment: boolean;
  /** Longueur maximale de l'école. */
  max: number;
}

export type Sentences = Record<Part, string>;

export interface Template {
  text: string;
  sentences: Sentences;
  basis: DraftBasis;
}

/** Formulations de Marie, par partie : elles passent avant celles de l'appli. */
export type CustomPhrases = Partial<Record<Part, string[]>>;

const compose = (openers: string[], cores: string[], join: (o: string, c: string) => string) =>
  openers.flatMap((o) => cores.map((c) => join(o, c)));

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const HOLE_EXAMPLE = "[à compléter : un exemple précis]";

const STRENGTH_OPENERS = [
  "",
  "Dans ce module,",
  "Pendant les séances,",
  "Tout au long du module,",
  "En cours,",
  "Sur ces séances,",
  "Cette fois,",
  "Au fil des cours,",
];

const strength = (cores: string[]) =>
  compose(
    STRENGTH_OPENERS,
    cores,
    (o, c) => `${o ? `${o} ` : ""}${o ? c : cap(c)} : ${HOLE_EXAMPLE}.`,
  );

const STRENGTH: Record<
  "participation" | "question" | "group" | "corrections" | "generic",
  string[]
> = {
  participation: strength([
    "tu participes avec régularité et tes interventions font avancer le groupe",
    "tu prends la parole avec spontanéité et tu nourris les échanges",
    "tu t’impliques à l’oral et cela se remarque",
    "ta participation active est un vrai atout pour la classe",
    "tu apportes des idées utiles dans les discussions",
  ]),
  question: strength([
    "tes questions pertinentes font avancer le groupe",
    "tu cherches à comprendre en profondeur et cela se voit dans tes questions",
    "ta curiosité est un moteur pour toi comme pour les autres",
    "tu sais poser la bonne question au bon moment",
    "tes questions montrent que tu réfléchis vraiment",
  ]),
  group: strength([
    "tu as trouvé ta place dans ton groupe et contribué à une bonne dynamique",
    "tu as travaillé dans un esprit d’équipe qui a servi le projet",
    "tu as montré un vrai sens de la collaboration",
    "tu t’impliques avec sérieux dans le travail collectif",
    "tu as su travailler avec les autres de façon constructive",
  ]),
  corrections: strength([
    "ton travail est sérieux et ses points forts sont bien visibles",
    "tes rendus montrent de vraies compétences",
    "tu as livré un travail soigné et réfléchi",
    "tes productions témoignent d’un investissement réel",
    "tu as fourni un travail solide qui te fait honneur",
  ]),
  generic: strength([
    "tu t’impliques avec sérieux",
    "ton attitude a été positive et agréable",
    "tu as suivi les cours avec application",
    "tu as fait preuve de motivation",
    "ton comportement en classe a été respectueux et constructif",
  ]),
};

const AXIS_OPENERS = [
  "Pour progresser,",
  "Un axe de progrès :",
  "Pour aller plus loin,",
  "Ton prochain pas :",
  "Pour la suite,",
  "Mon conseil :",
  "Pour consolider,",
  "Pour franchir une étape,",
];

const axis = (cores: string[]) => compose(AXIS_OPENERS, cores, (o, c) => `${o} ${c}.`);

const AXIS: Record<"difficulty" | "voice" | "progress" | "generic", string[]> = {
  difficulty: axis([
    "demande de l’aide dès qu’un point te bloque, par exemple [à compléter : le point en question]",
    "ne laisse pas une difficulté s’installer, parle-m’en vite ([à compléter : sur quel sujet])",
    "reprends les notions qui te résistent, en commençant par [à compléter : la première à revoir]",
    "pose tes questions dès qu’une difficulté apparaît, notamment sur [à compléter : un point concret]",
  ]),
  voice: axis([
    "ose prendre la parole plus souvent, par exemple [à compléter : dans quelle situation]",
    "lance-toi pour partager tes idées, en commençant par [à compléter : un moment précis]",
    "gagne en confiance à l’oral en intervenant sur [à compléter : un sujet que tu maîtrises]",
    "n’hésite pas à proposer tes idées au groupe ([à compléter : lesquelles])",
  ]),
  progress: axis([
    "reprends les remarques de tes corrections, en particulier [à compléter : la remarque à travailler]",
    "appuie-toi sur les retours reçus pour [à compléter : un axe concret]",
    "travaille les points relevés à la correction, d’abord [à compléter : un point précis]",
    "applique les conseils de tes corrections sur [à compléter : un point concret]",
  ]),
  generic: axis([
    "prépare davantage tes interventions et tes rendus ([à compléter : un axe concret])",
    "gagne en régularité, par exemple en [à compléter : une habitude à prendre]",
    "prends plus d’initiatives sur [à compléter : un sujet concret]",
    "approfondis par toi-même les sujets abordés, comme [à compléter : un sujet]",
  ]),
};

const ENCOURAGEMENT = [
  "Continue ainsi, tu as de belles ressources.",
  "Je suis confiante pour la suite.",
  "Le chemin parcouru te fait honneur, poursuis.",
  "Garde cette énergie, elle te mènera loin.",
  "Tu as tout ce qu’il faut pour réussir.",
  "Bonne continuation, je crois en toi.",
  "Poursuis sur cette voie, elle te réussit.",
  "Courage, tu es sur la bonne route.",
  "Bravo pour ton investissement, continue.",
  "Je suis curieuse de voir la suite de ton parcours.",
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Début de la phrase avant son premier trou : sert à repérer une formulation déjà employée. */
export function phraseKey(phrase: string): string {
  const cut = phrase.search(HOLE_PATTERN);
  return (cut === -1 ? phrase : phrase.slice(0, cut)).trim();
}

const normalizeSpaces = (s: string) => s.replace(/\s+/g, " ");

function isUsed(phrase: string, others: readonly string[]): boolean {
  const key = normalizeSpaces(phraseKey(phrase));
  return key.length >= 8 && others.some((t) => normalizeSpaces(t).includes(key));
}

/** Thèmes choisis d'après les étiquettes (jamais le texte des observations). */
function themes(input: TemplateInput) {
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
  const n = (t: ObservationTag) => tags.filter((x) => x === t).length;
  const participation = n("participation");
  const question = n("relevant_question");
  const strengthTheme: keyof typeof STRENGTH =
    basis === "group"
      ? "group"
      : participation === 0 && question === 0
        ? input.hasStrengthsComment
          ? "corrections"
          : "generic"
        : question > participation
          ? "question"
          : "participation";
  const axisTheme: keyof typeof AXIS =
    n("difficulty") > 0
      ? "difficulty"
      : participation === 0 && (basis === "personal" || basis === "group")
        ? "voice"
        : input.hasProgressComment
          ? "progress"
          : "generic";
  return { basis, strengthTheme, axisTheme };
}

/**
 * Formulations de l'appli, par partie, telles qu'en tête de phrase (sans les variantes
 * d'ouverture) : montrées en lecture dans Réglages, sous celles de Marie.
 */
export function appPhrasesPreview(): Record<Part, string[]> {
  const bare = (list: string[], opener: string) =>
    list.filter((p) =>
      opener ? p.startsWith(opener) : !STRENGTH_OPENERS.some((o) => o && p.startsWith(o)),
    );
  return {
    strength: [...new Set(Object.values(STRENGTH).flatMap((l) => bare(l, "")))],
    axis: [...new Set(Object.values(AXIS).flatMap((l) => bare(l, AXIS_OPENERS[0])))],
    encouragement: [...ENCOURAGEMENT],
  };
}

/** Toutes les formulations d'une partie pour cette personne : celles de Marie d'abord, puis celles de l'appli. */
export function phrasePool(part: Part, input: TemplateInput, custom: CustomPhrases = {}): string[] {
  const t = themes(input);
  const app =
    part === "strength"
      ? STRENGTH[t.strengthTheme]
      : part === "axis"
        ? AXIS[t.axisTheme]
        : ENCOURAGEMENT;
  const start = hash(`${input.seed}:${part}`) % app.length;
  const rotated = [...app.slice(start), ...app.slice(0, start)];
  return [...(custom[part] ?? []), ...rotated];
}

/** Première formulation du pool qu'aucune autre appréciation n'emploie ; à défaut, la première. */
export function choosePhrase(pool: readonly string[], others: readonly string[]): string {
  return pool.find((p) => !isUsed(p, others)) ?? pool[0];
}

/** « Autre formulation » : la suivante du pool après `current`, en évitant celles déjà employées. */
export function otherPhrase(
  pool: readonly string[],
  current: string,
  others: readonly string[],
): { phrase: string; fresh: boolean } {
  const at = pool.findIndex((p) => phraseKey(p) === phraseKey(current));
  for (let i = 1; i <= pool.length; i++) {
    const p = pool[(at + i) % pool.length];
    if (phraseKey(p) !== phraseKey(current) && !isUsed(p, others))
      return { phrase: p, fresh: true };
  }
  const p = pool[(at + 1) % pool.length];
  return { phrase: p, fresh: false };
}

/**
 * Où se trouve chaque partie du gabarit dans le texte, même après que Marie a rempli les trous :
 * on cherche le début de la phrase (jusqu'au premier trou) ; une partie s'arrête là où commence
 * la suivante. Renvoie `null` pour une partie introuvable.
 */
export function locateParts(
  text: string,
  sentences: Partial<Record<Part, string>>,
): Record<Part, { start: number; end: number } | null> {
  const starts = PARTS.map((p) => {
    const s = sentences[p];
    if (!s) return -1;
    const key = phraseKey(s);
    return key.length >= 8 ? text.indexOf(key) : -1;
  });
  const out = {} as Record<Part, { start: number; end: number } | null>;
  PARTS.forEach((p, i) => {
    const start = starts[i];
    if (start === -1) {
      out[p] = null;
      return;
    }
    const nexts = starts.filter((x) => x > start);
    const end = nexts.length ? Math.min(...nexts) : text.length;
    out[p] = { start, end };
  });
  return out;
}

/** Gabarit complet pour une personne, dans la limite de l'école (la conclusion saute en dernier recours). */
export function buildTemplate(
  input: TemplateInput,
  others: readonly string[],
  custom: CustomPhrases = {},
): Template {
  const { basis } = themes(input);
  const pick = (part: Part) => choosePhrase(phrasePool(part, input, custom), others);
  const sentences: Sentences = {
    strength: pick("strength"),
    axis: pick("axis"),
    encouragement: pick("encouragement"),
  };
  let text = PARTS.map((p) => sentences[p]).join(" ");
  if (text.length > input.max) text = `${sentences.strength} ${sentences.axis}`;
  if (text.length > input.max) {
    // Dernier recours : les formulations les plus courtes de chaque partie.
    const shortest = (part: Part) =>
      [...phrasePool(part, input, custom)].sort((a, b) => a.length - b.length)[0];
    sentences.strength = shortest("strength");
    sentences.axis = shortest("axis");
    text = `${sentences.strength} ${sentences.axis}`;
  }
  return { text, sentences, basis };
}
