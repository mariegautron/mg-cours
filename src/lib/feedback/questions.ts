/**
 * Questionnaire de retour des étudiant·es en fin de module. Fonctions pures : les questions, la
 * lecture défensive d'une réponse reçue, la synthèse pour l'enseignante. Les réponses sont
 * anonymes : aucune identité n'y figure.
 */

export interface RatingQuestion {
  id: string;
  label: string;
}
export interface RatingSection {
  id: string;
  title: string;
  questions: RatingQuestion[];
}
export interface TextQuestion {
  id: string;
  label: string;
  required?: false;
}

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_LABELS = ["Pas du tout", "Plutôt non", "Moyen", "Plutôt oui", "Tout à fait"];

export const RATING_SECTIONS: RatingSection[] = [
  {
    id: "global",
    title: "Ton ressenti global",
    questions: [
      { id: "liked", label: "Dans l’ensemble, ce module t’a plu." },
      {
        id: "useful",
        label: "Tu as appris des choses que tu pourras réutiliser en stage ou en entreprise.",
      },
      { id: "level", label: "Le niveau de difficulté était adapté." },
      { id: "pace", label: "Le rythme (quantité de contenu par séance) était adapté." },
    ],
  },
  {
    id: "sessions",
    title: "Les séances et les supports",
    questions: [
      { id: "clear", label: "Les explications étaient claires." },
      { id: "supports", label: "Les fiches et les diapos t’ont aidé·e." },
      {
        id: "practice",
        label: "Les mises en situation et les activités pratiques t’ont aidé·e à comprendre.",
      },
      { id: "group", label: "Le travail en groupe s’est bien passé." },
    ],
  },
  {
    id: "evaluation",
    title: "L’évaluation",
    questions: [
      { id: "grid", label: "Les consignes et la grille étaient claires." },
      { id: "expectations", label: "Tu savais ce qu’on attendait de toi pour chaque rendu." },
      { id: "load", label: "La charge de travail entre les séances était raisonnable." },
    ],
  },
];

export const TEXT_QUESTIONS: TextQuestion[] = [
  { id: "best", label: "Ce qui t’a le plus aidé·e à apprendre" },
  { id: "missing", label: "Ce qui t’a le plus manqué ou posé problème" },
  { id: "change", label: "Une chose que je devrais changer dès la prochaine fois" },
  { id: "topic", label: "Un sujet que tu aurais aimé voir ou approfondir" },
];

export const RECOMMEND_OPTIONS = [
  { id: "yes", label: "Oui" },
  { id: "rather_yes", label: "Plutôt oui" },
  { id: "rather_no", label: "Plutôt non" },
  { id: "no", label: "Non" },
] as const;

export const LAST_WORD = { id: "last", label: "Un dernier mot (facultatif)" };

export const MAX_TEXT = 1500;

export interface FeedbackAnswers {
  ratings: Record<string, number>;
  texts: Record<string, string>;
  recommend?: string;
}

const RATING_IDS = new Set(RATING_SECTIONS.flatMap((s) => s.questions.map((q) => q.id)));
const TEXT_IDS = new Set([...TEXT_QUESTIONS.map((q) => q.id), LAST_WORD.id]);
const RECOMMEND_IDS = new Set<string>(RECOMMEND_OPTIONS.map((o) => o.id));

/** Lit une réponse de façon défensive : seules les clés connues, notes entières de 1 à 5, textes bornés. */
export function parseAnswers(raw: unknown): FeedbackAnswers {
  const out: FeedbackAnswers = { ratings: {}, texts: {} };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as { ratings?: unknown; texts?: unknown; recommend?: unknown };
  if (r.ratings && typeof r.ratings === "object") {
    for (const [k, v] of Object.entries(r.ratings as Record<string, unknown>)) {
      if (
        RATING_IDS.has(k) &&
        Number.isInteger(v) &&
        (v as number) >= RATING_MIN &&
        (v as number) <= RATING_MAX
      ) {
        out.ratings[k] = v as number;
      }
    }
  }
  if (r.texts && typeof r.texts === "object") {
    for (const [k, v] of Object.entries(r.texts as Record<string, unknown>)) {
      if (TEXT_IDS.has(k) && typeof v === "string" && v.trim())
        out.texts[k] = v.trim().slice(0, MAX_TEXT);
    }
  }
  if (typeof r.recommend === "string" && RECOMMEND_IDS.has(r.recommend))
    out.recommend = r.recommend;
  return out;
}

/** Lit un formulaire envoyé par le navigateur (champs `rating_<id>`, `text_<id>`, `recommend`). */
export function answersFromForm(form: FormData): FeedbackAnswers {
  const ratings: Record<string, number> = {};
  const texts: Record<string, string> = {};
  for (const id of RATING_IDS) {
    const v = Number(form.get(`rating_${id}`));
    if (Number.isInteger(v)) ratings[id] = v;
  }
  for (const id of TEXT_IDS) {
    const v = form.get(`text_${id}`);
    if (typeof v === "string") texts[id] = v;
  }
  return parseAnswers({ ratings, texts, recommend: form.get("recommend") });
}

export function isEmptyAnswers(a: FeedbackAnswers): boolean {
  return Object.keys(a.ratings).length === 0 && Object.keys(a.texts).length === 0 && !a.recommend;
}

export interface RatingSummary {
  id: string;
  label: string;
  count: number;
  average: number | null;
  /** Nombre de réponses pour 1, 2, 3, 4, 5. */
  distribution: number[];
}

export interface FeedbackSummary {
  total: number;
  ratings: { section: string; items: RatingSummary[] }[];
  texts: { id: string; label: string; entries: string[] }[];
  recommend: { id: string; label: string; count: number }[];
}

/** Synthèse de toutes les réponses : moyennes et répartition par question, textes les plus récents d'abord. */
export function summarize(all: FeedbackAnswers[]): FeedbackSummary {
  return {
    total: all.length,
    ratings: RATING_SECTIONS.map((s) => ({
      section: s.title,
      items: s.questions.map((q) => {
        const distribution = [0, 0, 0, 0, 0];
        let sum = 0;
        let count = 0;
        for (const a of all) {
          const v = a.ratings[q.id];
          if (v === undefined) continue;
          distribution[v - 1] += 1;
          sum += v;
          count += 1;
        }
        return {
          id: q.id,
          label: q.label,
          count,
          average: count ? Math.round((sum / count) * 10) / 10 : null,
          distribution,
        };
      }),
    })),
    texts: [...TEXT_QUESTIONS, LAST_WORD].map((q) => ({
      id: q.id,
      label: q.label,
      entries: all.map((a) => a.texts[q.id]).filter((t): t is string => Boolean(t)),
    })),
    recommend: RECOMMEND_OPTIONS.map((o) => ({
      id: o.id,
      label: o.label,
      count: all.filter((a) => a.recommend === o.id).length,
    })),
  };
}

export function feedbackUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/retour/${token}`;
}

/** E-mail aux étudiant·es : vouvoiement, sobre, signé de l'enseignante. */
export function feedbackEmail(input: {
  firstName: string;
  moduleName: string;
  url: string;
  teacherName: string;
}): { subject: string; text: string } {
  const greeting = input.firstName.trim() ? `Bonjour ${input.firstName.trim()},` : "Bonjour,";
  const signature = input.teacherName.trim() || "Votre enseignante";
  return {
    subject: `Votre avis sur le module « ${input.moduleName} »`,
    text: [
      greeting,
      "",
      `Le module « ${input.moduleName} » se termine. J’aimerais connaître votre avis pour l’améliorer : le questionnaire prend environ 5 minutes.`,
      "",
      `Répondre au questionnaire : ${input.url}`,
      "",
      "Il est anonyme et n’a aucun lien avec la notation.",
      "",
      "Merci beaucoup,",
      signature,
    ].join("\n"),
  };
}
