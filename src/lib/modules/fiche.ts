/**
 * Lecture « au mieux » du texte d'une fiche pédagogique (PDF d'école) pour préremplir un module.
 * Ne renvoie que ce qui est trouvé avec assez de certitude ; l'utilisatrice vérifie toujours avant d'enregistrer.
 */

export interface FicheData {
  name?: string;
  ycode?: string;
  level?: string;
  year?: number;
  totalHours?: number;
  hoursLecture?: number;
  hoursTd?: number;
  hoursTp?: number;
  schoolName?: string;
  /** Description du cours, telle que l'école la rédige. */
  description?: string;
  /** Objectifs pédagogiques, un par élément (puces retirées). */
  objectives?: string[];
  prerequisites?: string[];
}

const clean = (s: string) =>
  s
    .replace(/[  ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const num = (s: string | undefined) => (s ? Number(s.replace(",", ".")) : undefined);

function firstMatch(text: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) return m;
  }
  return null;
}

/**
 * Partie du texte qui précède le tableau des unités pédagogiques : les heures FFP/TDP de ce
 * tableau sont des repères par unité, jamais le volume du module.
 */
function beforeUnitsTable(text: string): string {
  const heading = /unit[ée]s?\s+p[ée]dagogiques?/i.exec(text);
  const head = heading ? text.slice(0, heading.index) : text;
  return head.replace(/^[ \t]*\d{1,2}[ \t]+(?:FFP|TDP|CM|TD|TP)\b.*$/gim, "");
}

const HOURS_LABEL =
  /(?:volume\s+(?:horaire|heures?)|nombre\s+d[’']heures|dur[ée]es?)(?:\s+totale?s?)?/i;
const HOURS_VALUE = /(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures?\b)/gi;
const KIND_WORD = /\b(FFP|TDP|CM|TD|TP)\b/gi;

type HoursKey = "hoursLecture" | "hoursTd" | "hoursTp";
const HOURS_KEY: Record<string, HoursKey> = {
  FFP: "hoursLecture",
  CM: "hoursLecture",
  TDP: "hoursTd",
  TD: "hoursTd",
  TP: "hoursTp",
};

/**
 * Volumes horaires du module. Le total est le premier volume qui suit « Volume heures totales »
 * (ou « Durée », « Nombre d'heures »…) ; les colonnes FFP / TDP annoncées avant les valeurs
 * (« FFP TDP / 28h 10h 18h ») sont facultatives et lues seulement si elles correspondent aux valeurs.
 */
function readHours(head: string): Partial<FicheData> {
  const out: Partial<FicheData> = {};
  const label = HOURS_LABEL.exec(head);
  let columns = 0;

  if (label) {
    const after = head.slice(label.index + label[0].length, label.index + label[0].length + 200);
    const values = [...after.matchAll(HOURS_VALUE)];
    if (values.length) {
      out.totalHours = num(values[0][1]);
      const kinds = [...after.slice(0, values[0].index).matchAll(KIND_WORD)].map((m) =>
        m[1].toUpperCase(),
      );
      columns = kinds.length;
      const rest = values.slice(1, 1 + kinds.length);
      if (kinds.length && rest.length === kinds.length) {
        kinds.forEach((kind, i) => {
          out[HOURS_KEY[kind]] ??= num(rest[i][1]);
        });
      }
    }
  }

  if (columns === 0) {
    const lecture = /\b(?:FFP|CM)\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(head);
    const td = /\b(?:TDP|TD)\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(head);
    const tp = /\bTP\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(head);
    out.hoursLecture = num(lecture?.[1]);
    out.hoursTd = num(td?.[1]);
    out.hoursTp = num(tp?.[1]);
  }

  if (out.totalHours === undefined) {
    const total = firstMatch(head, [
      /(?:volume\s+horaire|nombre\s+d[’']heures|dur[ée]e|total)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures)/i,
      /\b(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures)\s*(?:au\s+total|de\s+cours)/i,
    ]);
    const parts = [out.hoursLecture, out.hoursTd, out.hoursTp].filter(
      (v): v is number => v !== undefined,
    );
    if (total) out.totalHours = num(total[1]);
    else if (parts.length) out.totalHours = parts.reduce((a, b) => a + b, 0);
  }
  return out;
}

const LEVEL_START =
  /^(?:Mast[eè]re?|Master|Bachelor|Licence|Bac\s*\+?\s*\d|B[123]\b|M[12]\b|MBA|Ing[ée]nieur|BTS)/i;
const NEXT_LABEL = String.raw`(?=\s+(?:Nom|Niveau|Code|Volume|Dur[ée]es?|Ann[ée]e|YCODE|FFP|TDP|Intitul[ée]|Unit[ée]s?)\b|\n|$)`;

/** Libellés de rubrique qui ferment la rubrique en cours, même sur un texte sans retour à la ligne. */
const SECTION_STOP = String.raw`(?:Description\s+du\s+cours|Objectifs?\s+p[ée]dagogiques?|Pr[ée][-\s]?requis|Comp[ée]tences?\s+vis[ée]es?|Contenus?\s+(?:du\s+cours|p[ée]dagogiques?)|Modalit[ée]s?\s+(?:d[’']?[ée]valuation|p[ée]dagogiques?)|Unit[ée]s?\s+p[ée]dagogiques?|Volume\s+(?:horaire|heures)|Nom\s+long|Bibliographie|Code\s+module|Intitul[ée]\s+du\s+module)`;

const BULLET = /[•●▪◦]/;

/** Texte d'une rubrique : du libellé jusqu'au libellé de rubrique suivant, ou la fin. */
function sectionText(text: string, heading: RegExp): string | null {
  const start = heading.exec(text);
  if (!start) return null;
  const rest = text.slice(start.index + start[0].length).replace(/^\s*:?\s*/, "");
  const stop = new RegExp(String.raw`(?:^|\s)${SECTION_STOP}(?![\wÀ-ÿ])`, "i").exec(rest);
  return (stop ? rest.slice(0, stop.index) : rest).trim();
}

/** Éléments d'une liste : une puce ou une ligne par élément, lignes de suite rattachées à leur puce. */
function listItems(block: string, max: number): string[] {
  const lines = block
    .replace(new RegExp(String.raw`\s*(${BULLET.source})\s*`, "g"), "\n$1 ")
    .split("\n")
    .map(clean)
    .filter(Boolean);
  const bulleted = lines.some((l) => BULLET.test(l[0]));
  const items: string[] = [];
  for (const line of lines) {
    const isBullet = BULLET.test(line[0]);
    const text = isBullet ? clean(line.slice(1)) : line;
    if (!text) continue;
    if (bulleted && !isBullet && items.length) items[items.length - 1] += ` ${text}`;
    else items.push(text);
  }
  return items.filter((i) => i.length <= 400).slice(0, max);
}

export function parseFiche(rawText: string, schoolNames: string[] = []): FicheData {
  const text = rawText.replace(/\r\n?/g, "\n").replace(/[  ]/g, " ");
  const out: FicheData = {};

  const ycode = /\b([A-Z]\d{4}_\d{3,5})\b/.exec(text);
  if (ycode) {
    out.ycode = ycode[1];
    // « A2627_… » = année scolaire 2026-2027 → année de début.
    const yy = /^[A-Z](\d{2})\d{2}_/.exec(ycode[1]);
    if (yy) out.year = 2000 + Number(yy[1]);
  }
  if (out.year === undefined) {
    const span = /\b(20\d{2})\s*[-/–]\s*(20\d{2})\b/.exec(text);
    if (span) out.year = Number(span[1]);
  }

  const name = firstMatch(text, [
    new RegExp(String.raw`nom\s+long\s*:?\s*(.+?)${NEXT_LABEL}`, "i"),
    /(?:intitul[ée]\s+du\s+module|intitul[ée]|nom\s+du\s+module|module|mati[èe]re|unit[ée]\s+d[’']enseignement)\s*:\s*([^\n]+)/i,
  ]);
  if (name) {
    const value = clean(name[1]).replace(/\s*\(?\b[A-Z]\d{4}_\d{3,5}\)?\s*$/, "");
    if (value.length >= 3 && value.length <= 200) out.name = value;
  }

  const labelled = new RegExp(String.raw`\bniveau\s*:?\s*(.+?)${NEXT_LABEL}`, "i").exec(text);
  const labelledLevel = labelled ? clean(labelled[1]) : "";
  if (labelledLevel && labelledLevel.length <= 60 && LEVEL_START.test(labelledLevel)) {
    out.level = labelledLevel;
  } else {
    const level =
      /(Mast[eè]re?\s*\d|Bachelor\s*\d|Licence\s*\d|\bB[123]\b|\bM[12]\b)([ \t]+(?:en[ \t]+)?[A-ZÀ-Ý][\wÀ-ÿ&-]+)?/.exec(
        text,
      );
    if (level) out.level = clean(level[0]);
  }

  Object.assign(out, readHours(beforeUnitsTable(text)));

  const description = sectionText(text, /Description\s+du\s+cours/i);
  if (description) {
    const value = clean(description.replace(/\n+/g, " "));
    if (value.length >= 10) out.description = value.slice(0, 1500);
  }
  const objectives = sectionText(text, /Objectifs?\s+p[ée]dagogiques?/i);
  if (objectives) {
    const items = listItems(objectives, 20);
    if (items.length) out.objectives = items;
  }
  const prerequisites = sectionText(text, /Pr[ée][-\s]?requis/i);
  if (prerequisites) {
    const items = listItems(prerequisites, 10);
    if (items.length) out.prerequisites = items;
  }

  const lower = text.toLowerCase();
  const school = schoolNames.find((n) => n && lower.includes(n.toLowerCase()));
  if (school) out.schoolName = school;

  for (const key of Object.keys(out) as (keyof FicheData)[]) {
    if (out[key] === undefined || Number.isNaN(out[key])) delete out[key];
  }
  return out;
}
