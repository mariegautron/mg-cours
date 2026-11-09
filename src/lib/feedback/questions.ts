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
export interface ChoiceQuestion {
  id: string;
  label: string;
  options: { id: string; label: string }[];
}
export interface TextQuestion {
  id: string;
  label: string;
  /** Début de phrase affiché dans la zone de saisie : guide sans cadrer. */
  starter: string;
}

export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_LABELS = ["Pas du tout", "Plutôt non", "Moyen", "Plutôt oui", "Tout à fait"];

/** Peu de notes : l'école a déjà son propre formulaire, on ne garde que ce qu'il ne couvre pas. */
export const RATING_SECTIONS: RatingSection[] = [
  {
    id: "overview",
    title: "En un coup d’œil",
    questions: [
      { id: "liked", label: "Dans l’ensemble, ce module t’a plu." },
      {
        id: "useful",
        label: "Tu as appris des choses que tu pourras réutiliser en stage ou en entreprise.",
      },
      { id: "expectations", label: "Tu savais ce qu’on attendait de toi pour chaque rendu." },
    ],
  },
];

/** Choix forcés : pas de « milieu » confortable, une réponse qui oriente une décision. */
export const CHOICE_QUESTIONS: ChoiceQuestion[] = [
  {
    id: "balance",
    label: "Pour la prochaine promo, il faudrait…",
    options: [
      { id: "more_theory", label: "Plus de théorie" },
      { id: "balanced", label: "Garder l’équilibre actuel" },
      { id: "more_practice", label: "Plus de pratique" },
    ],
  },
  {
    id: "recommend",
    label: "Tu recommanderais ce module à une autre promo ?",
    options: [
      { id: "yes", label: "Oui" },
      { id: "rather_yes", label: "Plutôt oui" },
      { id: "rather_no", label: "Plutôt non" },
      { id: "no", label: "Non" },
    ],
  },
];

export const TEXT_QUESTIONS: TextQuestion[] = [
  {
    id: "progress",
    label: "Le moment qui t’a fait le plus progresser, et pourquoi",
    starter: "Je pense à…",
  },
  {
    id: "lost",
    label: "Le moment où tu as décroché ou été perdu·e",
    starter: "Je me suis senti·e perdu·e quand…",
  },
  {
    id: "before_after",
    label: "Ce que tu sais faire maintenant et que tu ne savais pas faire au début",
    starter: "Maintenant, je sais…",
  },
  {
    id: "friend",
    label: "Si tu devais expliquer ce module à un·e ami·e en deux phrases",
    starter: "C’est un module où…",
  },
  {
    id: "change",
    label: "Si tu étais à ma place, tu changerais quoi en premier ?",
    starter: "Je changerais…",
  },
  {
    id: "keep",
    label: "Ce que je ne dois surtout pas changer",
    starter: "Ne change surtout pas…",
  },
];

export const MAX_TEXT = 1500;

export interface FeedbackAnswers {
  ratings: Record<string, number>;
  choices: Record<string, string>;
  texts: Record<string, string>;
}

const RATING_IDS = new Set(RATING_SECTIONS.flatMap((s) => s.questions.map((q) => q.id)));
const TEXT_IDS = new Set(TEXT_QUESTIONS.map((q) => q.id));
const CHOICE_OPTIONS = new Map(
  CHOICE_QUESTIONS.map((q) => [q.id, new Set(q.options.map((o) => o.id))]),
);

/** Lit une réponse de façon défensive : seules les clés connues, notes entières de 1 à 5, textes bornés. */
export function parseAnswers(raw: unknown): FeedbackAnswers {
  const out: FeedbackAnswers = { ratings: {}, choices: {}, texts: {} };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as { ratings?: unknown; choices?: unknown; texts?: unknown };
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
  if (r.choices && typeof r.choices === "object") {
    for (const [k, v] of Object.entries(r.choices as Record<string, unknown>)) {
      if (typeof v === "string" && CHOICE_OPTIONS.get(k)?.has(v)) out.choices[k] = v;
    }
  }
  if (r.texts && typeof r.texts === "object") {
    for (const [k, v] of Object.entries(r.texts as Record<string, unknown>)) {
      if (TEXT_IDS.has(k) && typeof v === "string" && v.trim()) {
        out.texts[k] = v.trim().slice(0, MAX_TEXT);
      }
    }
  }
  return out;
}

/** Lit un formulaire envoyé par le navigateur (champs `rating_<id>`, `choice_<id>`, `text_<id>`). */
export function answersFromForm(form: FormData): FeedbackAnswers {
  const ratings: Record<string, number> = {};
  const choices: Record<string, string> = {};
  const texts: Record<string, string> = {};
  for (const id of RATING_IDS) {
    const v = Number(form.get(`rating_${id}`));
    if (Number.isInteger(v)) ratings[id] = v;
  }
  for (const id of CHOICE_OPTIONS.keys()) {
    const v = form.get(`choice_${id}`);
    if (typeof v === "string") choices[id] = v;
  }
  for (const id of TEXT_IDS) {
    const v = form.get(`text_${id}`);
    if (typeof v === "string") texts[id] = v;
  }
  return parseAnswers({ ratings, choices, texts });
}

export function isEmptyAnswers(a: FeedbackAnswers): boolean {
  return (
    Object.keys(a.ratings).length === 0 &&
    Object.keys(a.choices).length === 0 &&
    Object.keys(a.texts).length === 0
  );
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
  choices: { id: string; label: string; options: { id: string; label: string; count: number }[] }[];
  texts: { id: string; label: string; entries: string[] }[];
}

/** Synthèse de toutes les réponses : moyennes, répartition des choix, textes les plus récents d'abord. */
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
    choices: CHOICE_QUESTIONS.map((q) => ({
      id: q.id,
      label: q.label,
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        count: all.filter((a) => a.choices[q.id] === o.id).length,
      })),
    })),
    texts: TEXT_QUESTIONS.map((q) => ({
      id: q.id,
      label: q.label,
      entries: all.map((a) => a.texts[q.id]).filter((t): t is string => Boolean(t)),
    })),
  };
}

export interface Highlights {
  strengths: string[];
  improvements: string[];
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const fr = (n: number) => String(n).replace(".", ",");

/**
 * Points forts et à améliorer lus dans les CHIFFRES (notes, choix) : règles simples et vérifiables,
 * sans analyse automatique des textes (ceux-ci restent à lire, juste en dessous).
 */
export function highlights(summary: FeedbackSummary): Highlights {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const rated = summary.ratings
    .flatMap((s) => s.items)
    .filter((i): i is RatingSummary & { average: number } => i.average !== null);
  for (const i of [...rated].sort((a, b) => b.average - a.average).slice(0, 2)) {
    if (i.average >= 4) strengths.push(`« ${i.label} » : ${fr(i.average)} / ${RATING_MAX}`);
  }
  for (const i of [...rated].sort((a, b) => a.average - b.average).slice(0, 2)) {
    if (i.average <= 3.5) improvements.push(`« ${i.label} » : ${fr(i.average)} / ${RATING_MAX}`);
  }
  const rec = summary.choices.find((c) => c.id === "recommend");
  if (rec) {
    const total = rec.options.reduce((n, o) => n + o.count, 0);
    const yes = rec.options
      .filter((o) => o.id === "yes" || o.id === "rather_yes")
      .reduce((n, o) => n + o.count, 0);
    if (total > 0) {
      const share = pct(yes, total);
      const line = `${share} % recommanderaient le module (${yes} sur ${total})`;
      if (share >= 70) strengths.push(line);
      else if (share < 50) improvements.push(line);
    }
  }
  const bal = summary.choices.find((c) => c.id === "balance");
  if (bal) {
    const total = bal.options.reduce((n, o) => n + o.count, 0);
    const top = [...bal.options].sort((a, b) => b.count - a.count)[0];
    if (total > 0 && top && top.count / total > 0.5) {
      const line = `${top.label} (${pct(top.count, total)} % des réponses)`;
      if (top.id === "balanced")
        strengths.push(`Équilibre théorie / pratique : ${line.toLowerCase()}`);
      else improvements.push(line);
    }
  }
  return { strengths, improvements };
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
  const signature = input.teacherName.trim() || "Ton enseignante";
  return {
    subject: `Ton avis sur le module « ${input.moduleName} »`,
    text: [
      greeting,
      "",
      `Le module « ${input.moduleName} » se termine. J’aimerais connaître ton avis pour l’améliorer : le questionnaire prend environ 5 minutes.`,
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
