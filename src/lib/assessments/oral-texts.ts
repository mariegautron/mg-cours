/**
 * Textes d'un oral (lot 2) : propositions par gabarits et règles, sans aucun service externe.
 * Fonctions pures. Les phrases viennent de la grille (phrases des paliers) et des remarques de
 * Marie ; chaque phrase proposée garde sa source. Le bloc-notes n'est jamais repris tel quel.
 */
import { isLetter, levelFor, LETTERS, type OralCriterion } from "@/lib/assessments/oral-space";

// ── Outils de texte ─────────────────────────────────────────────────────────

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Empreinte (FNV-1a 32 bits) du texte validé, sur le texte normalisé (espaces compris). */
export function hashText(s: string): string {
  let h = 0x811c9dc5;
  const t = s.trim().replace(/\s+/g, " ");
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export interface NameHit {
  start: number;
  end: number;
  name: string;
}

/** Prénoms du module trouvés dans un texte (mot entier, sans tenir compte des accents ni de la casse). */
export function findNames(text: string, names: readonly string[]): NameHit[] {
  const hits: NameHit[] = [];
  const folded = norm(text);
  for (const raw of new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))) {
    const needle = norm(raw);
    let from = 0;
    for (;;) {
      const at = folded.indexOf(needle, from);
      if (at === -1) break;
      const before = at === 0 ? " " : folded[at - 1];
      const after = at + needle.length >= folded.length ? " " : folded[at + needle.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after))
        hits.push({ start: at, end: at + needle.length, name: raw });
      from = at + needle.length;
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

const sentenceEnd = (s: string) => {
  const t = s.trim();
  return t === "" ? "" : /[.!?…]$/.test(t) ? t : `${t}.`;
};
const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const VOUS_RULES: [RegExp, string][] = [
  [/\b(le groupe|l[’']équipe|ils|elles) (a|ont)\b/gi, "vous avez"],
  [/\b(le groupe|l[’']équipe|ils|elles) (est|sont)\b/gi, "vous êtes"],
  [/\b(le groupe|l[’']équipe|ils|elles) (doit|doivent)\b/gi, "vous devez"],
  [/\b(le groupe|l[’']équipe|ils|elles) (peut|peuvent)\b/gi, "vous pouvez"],
  [/\b(le groupe|l[’']équipe|ils|elles) (fait|font)\b/gi, "vous faites"],
  [/\btu as\b/gi, "vous avez"],
  [/\btu es\b/gi, "vous êtes"],
  [/\btu dois\b/gi, "vous devez"],
  [/\btu peux\b/gi, "vous pouvez"],
  [/\b(leur|leurs)\b/gi, "votre"],
  [/\bton\b|\bta\b/gi, "votre"],
  [/\btes\b/gi, "vos"],
];

/** Remarque de Marie au vouvoiement (groupe). Reformulation simple : à relire. */
export function toVous(sentence: string): string {
  let t = sentence.trim();
  for (const [re, to] of VOUS_RULES) t = t.replace(re, to);
  return sentenceEnd(upperFirst(t));
}

const TU_VERBS: Record<string, string> = {
  est: "es",
  a: "as",
  doit: "dois",
  peut: "peux",
  fait: "fais",
  va: "vas",
  sait: "sais",
  veut: "veux",
};

/** Remarque sur UNE personne au tutoiement (« Léa est claire » → « Tu es claire »). À relire. */
export function toTu(sentence: string, firstName: string): string {
  let t = sentence.trim();
  const name = norm(firstName);
  const words = t.split(/\s+/);
  if (words.length > 1 && norm(words[0].replace(/[,;:]/g, "")) === name) {
    const verb = words[1];
    const key = norm(verb);
    let v =
      TU_VERBS[key] ??
      (key.endsWith("e") ? `${verb}s` : key.endsWith("t") ? `${verb.slice(0, -1)}s` : verb);
    if (!TU_VERBS[key] && !key.endsWith("e") && !key.endsWith("t")) v = verb;
    t = ["Tu", v, ...words.slice(2)].join(" ");
  } else {
    t = t.replace(new RegExp(`\\b${firstName}\\b`, "gi"), "tu");
  }
  t = t
    .replace(/\b(son|sa)\b/gi, (m) => (m.toLowerCase() === "son" ? "ton" : "ta"))
    .replace(/\bses\b/gi, "tes");
  return sentenceEnd(upperFirst(t));
}

const lines = (s: string) =>
  s
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

// ── Champs de texte ─────────────────────────────────────────────────────────

export type StoredTextState = "proposed" | "to_validate" | "validated" | "to_review";
export type TextState = StoredTextState | "empty";

export const TEXT_STATE_LABELS: Record<TextState, string> = {
  empty: "À écrire",
  proposed: "Proposé",
  to_validate: "À valider",
  to_review: "À revoir",
  validated: "Validé",
};

export interface Segment {
  text: string;
  /** D'où vient cette phrase (visible en un clic). */
  source: string;
}

export interface TextEntry {
  text: string;
  state: StoredTextState;
  /** Empreinte et lettre du texte au moment de la validation. */
  hash: string | null;
  letter: string | null;
  sources: Segment[];
}

export const EMPTY_TEXT: TextEntry = {
  text: "",
  state: "to_validate",
  hash: null,
  letter: null,
  sources: [],
};

/** État affiché : un texte validé repasse « à revoir » si son texte ou la lettre de son critère a changé. */
export function textState(entry: TextEntry | undefined, currentLetter?: string): TextState {
  if (!entry || entry.text.trim() === "") return "empty";
  if (entry.state === "validated") {
    const same = entry.hash === hashText(entry.text);
    const letterOk = currentLetter === undefined || entry.letter === currentLetter;
    return same && letterOk ? "validated" : "to_review";
  }
  return entry.state;
}

export interface TextField {
  id: string;
  label: string;
  kind: "criterion" | "strengths" | "progress" | "global";
  criterionId?: string;
}

/** Les textes d'un groupe (ou d'une personne) : un par critère, points forts, axes de progrès, commentaire global. */
export function textFields(criteria: readonly OralCriterion[]): TextField[] {
  return [
    ...criteria
      .filter((c) => !c.isBonus)
      .map((c) => ({
        id: `crit:${c.id}`,
        label: c.label,
        kind: "criterion" as const,
        criterionId: c.id,
      })),
    { id: "strengths", label: "Points forts", kind: "strengths" as const },
    { id: "progress", label: "Axes de progrès", kind: "progress" as const },
    { id: "global", label: "Commentaire global", kind: "global" as const },
  ];
}

// ── Propositions par gabarits ───────────────────────────────────────────────

export interface ProposalInput {
  criteria: readonly OralCriterion[];
  letters: Readonly<Record<string, string | undefined>>;
  criterionNotes: Readonly<Record<string, string | undefined>>;
  pad: string;
}

export interface Proposal {
  text: string;
  segments: Segment[];
}

function level(c: OralCriterion, letter: string | undefined) {
  return isLetter(letter) ? levelFor(c, letter) : null;
}
/** Palier au-dessus de la lettre donnée (la direction pour progresser). */
function higher(c: OralCriterion, letter: string | undefined) {
  if (!isLetter(letter)) return null;
  const i = LETTERS.indexOf(letter);
  return i > 0 ? levelFor(c, LETTERS[i - 1]) : null;
}

const padSources = (c: OralCriterion, pad: string): Segment[] => {
  const key = norm(c.label)
    .split(/\W+/)
    .filter((w) => w.length >= 5);
  return lines(pad)
    .filter((l) => key.some((w) => norm(l).includes(w)))
    .map((l) => ({ text: l, source: "bloc-notes (jamais repris tel quel)" }));
};

/** Proposition pour un champ, au vouvoiement (texte de groupe). Chaque phrase garde sa source. */
export function proposeText(field: TextField, input: ProposalInput): Proposal {
  const seg: Segment[] = [];
  const add = (text: string, source: string) => {
    if (text.trim() !== "") seg.push({ text: sentenceEnd(text), source });
  };
  const byLetter = (wanted: string[]) =>
    input.criteria.filter((c) => !c.isBonus && wanted.includes(input.letters[c.id] ?? ""));

  if (field.kind === "criterion") {
    const c = input.criteria.find((x) => x.id === field.criterionId);
    const letter = c ? input.letters[c.id] : undefined;
    if (!c || !isLetter(letter)) return { text: "", segments: [] };
    const here = level(c, letter);
    const up = higher(c, letter);
    const opening: Record<string, string> = {
      A: `Excellent travail sur « ${c.label} »`,
      B: `Bon travail sur « ${c.label} »`,
      C: `« ${c.label} » est en cours d’acquisition`,
      D: `« ${c.label} » demande à être retravaillé`,
    };
    if (here)
      add(`${opening[letter]} : ${here.description}`, `palier ${letter} du critère « ${c.label} »`);
    else add(opening[letter], `lettre ${letter}`);
    if (up)
      add(
        `Pour progresser : ${up.description}`,
        `palier ${LETTERS[LETTERS.indexOf(letter) - 1]} du critère`,
      );
    // Les notes privées (critère, bloc-notes, personne) ne sont JAMAIS recopiées dans un texte
    // destiné aux étudiant·es : elles restent des sources affichées à Marie, pas du texte.
    for (const l of lines(input.criterionNotes[c.id] ?? ""))
      seg.push({ text: "", source: `tes notes du critère « ${c.label} » : « ${l} »` });
    for (const p of padSources(c, input.pad))
      seg.push({ text: "", source: `${p.source} : « ${p.text} »` });
  } else if (field.kind === "strengths") {
    const good = byLetter(["A", "B"]);
    if (good.length === 0) return { text: "", segments: [] };
    for (const c of good) {
      const l = level(c, input.letters[c.id]);
      add(
        `${c.label} : ${l?.description ?? "bien maîtrisé"}`,
        `palier ${input.letters[c.id]} du critère « ${c.label} »`,
      );
    }
  } else if (field.kind === "progress") {
    const weak = byLetter(["D", "C"]).sort((a, b) =>
      (input.letters[b.id] ?? "").localeCompare(input.letters[a.id] ?? ""),
    );
    if (weak.length === 0) return { text: "", segments: [] };
    for (const c of weak) {
      const up = higher(c, input.letters[c.id]);
      add(
        `${c.label}${up ? ` : viser « ${up.description} »` : ""}`,
        `palier au-dessus de ${input.letters[c.id]} pour « ${c.label} »`,
      );
    }
  } else {
    const good = byLetter(["A", "B"]);
    const weak = byLetter(["D", "C"]).sort((a, b) =>
      (input.letters[b.id] ?? "").localeCompare(input.letters[a.id] ?? ""),
    );
    if (good.length > 0)
      add(
        `Votre oral a de vrais points forts : ${good.map((c) => `« ${c.label} »`).join(", ")}`,
        "critères en A ou B",
      );
    if (weak.length > 0) {
      const c = weak[0];
      const up = higher(c, input.letters[c.id]);
      add(
        `Pour la suite, concentrez-vous sur « ${c.label} »${up ? ` : ${up.description}` : ""}`,
        `critère le moins maîtrisé : « ${c.label} »`,
      );
    }
    if (good.length === 0 && weak.length === 0) return { text: "", segments: [] };
  }
  const written = seg.filter((s) => s.text !== "");
  return { text: written.map((s) => s.text).join(" "), segments: seg };
}

// ── Répartir mes notes ──────────────────────────────────────────────────────

export type RouteDest = "criterion" | "person" | "notebook" | "nowhere";

export const ROUTE_LABELS: Record<RouteDest, string> = {
  criterion: "Commentaire d’un critère",
  person: "Commentaire perso d’une personne",
  notebook: "Carnet privé",
  nowhere: "Nulle part",
};

export interface NoteLine {
  /** Clé stable (source + empreinte) : sert à marquer la note « répartie ». */
  key: string;
  origin: { kind: "pad" | "criterion" | "person"; id?: string };
  text: string;
  dest: RouteDest;
  /** Critère ou personne visé(e). */
  target?: string;
  /** Reformulation proposée (vouvoiement pour un critère, tutoiement pour une personne). */
  rewritten: string;
}

export interface RouteInput {
  criteria: readonly OralCriterion[];
  criterionNotes: Readonly<Record<string, string | undefined>>;
  personNotes: Readonly<Record<string, string | undefined>>;
  pad: string;
  members: readonly { id: string; firstName: string; name: string }[];
}

const STOP = new Set([
  "alors",
  "aussi",
  "comme",
  "cette",
  "leurs",
  "dans",
  "pour",
  "avec",
  "mais",
  "plus",
  "tres",
  "bien",
]);
const CARNET =
  /(relancer|rappeler|penser|suivi|prochain|mail|voir avec|plus tard|séance|seance|cours|retard|absent)/i;

/**
 * Propose une destination pour chaque note. Règles : une remarque sur une personne ne va jamais
 * vers un texte de groupe ; une note trop courte n'est rangée nulle part ; en cas de doute, carnet privé.
 * Rien n'est déplacé ici : Marie coche, puis valide.
 */
export function routeNotes(
  input: RouteInput,
  already: Readonly<Record<string, unknown>> = {},
): NoteLine[] {
  const out: NoteLine[] = [];
  const nameOf = (text: string) => {
    const hits = findNames(
      text,
      input.members.map((m) => m.firstName),
    );
    const first = hits[0]?.name;
    return first ? input.members.find((m) => norm(m.firstName) === norm(first)) : undefined;
  };
  const push = (origin: NoteLine["origin"], text: string) => {
    const key = `${origin.kind}:${origin.id ?? ""}:${hashText(text)}`;
    if (key in already) return;
    const person =
      origin.kind === "person" ? input.members.find((m) => m.id === origin.id) : nameOf(text);
    const words = text.split(/\s+/).filter(Boolean);
    let dest: RouteDest;
    let target: string | undefined;
    if (words.length < 3) dest = "nowhere";
    else if (person) {
      dest = CARNET.test(text) && origin.kind !== "person" ? "notebook" : "person";
      target = person.id;
    } else if (origin.kind === "criterion") {
      dest = "criterion";
      target = origin.id;
    } else {
      const tokens = new Set(
        norm(text)
          .split(/\W+/)
          .filter((w) => w.length >= 5 && !STOP.has(w)),
      );
      const match = input.criteria.find((c) => {
        const words = norm(`${c.label} ${c.levels.map((l) => l.description).join(" ")}`)
          .split(/\W+/)
          .filter((w) => w.length >= 5 && !STOP.has(w));
        return words.some((w) => tokens.has(w));
      });
      if (CARNET.test(text)) dest = "notebook";
      else if (match) {
        dest = "criterion";
        target = match.id;
      } else dest = "notebook";
    }
    const rewritten =
      dest === "criterion"
        ? toVous(text)
        : dest === "person" && person
          ? toTu(text, person.firstName)
          : text;
    out.push({ key, origin, text, dest, target, rewritten });
  };
  for (const l of lines(input.pad)) push({ kind: "pad" }, l);
  for (const c of input.criteria)
    for (const l of lines(input.criterionNotes[c.id] ?? ""))
      push({ kind: "criterion", id: c.id }, l);
  for (const m of input.members)
    for (const l of lines(input.personNotes[m.id] ?? "")) push({ kind: "person", id: m.id }, l);
  return out;
}
