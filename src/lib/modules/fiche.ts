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
    /(?:intitul[ée]\s+du\s+module|intitul[ée]|nom\s+du\s+module|module|mati[èe]re|unit[ée]\s+d[’']enseignement)\s*:\s*([^\n]+)/i,
  ]);
  if (name) {
    const value = clean(name[1]).replace(/\s*\(?\b[A-Z]\d{4}_\d{3,5}\)?\s*$/, "");
    if (value.length >= 3 && value.length <= 200) out.name = value;
  }

  const level =
    /(Mast[eè]re?\s*\d|Bachelor\s*\d|Licence\s*\d|\bB[123]\b|\bM[12]\b)([ \t]+(?:en[ \t]+)?[A-ZÀ-Ý][\wÀ-ÿ&-]+)?/.exec(
      text,
    );
  if (level) out.level = clean(level[0]);

  const lecture = /\b(?:FFP|CM)\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(text);
  const td = /\b(?:TDP|TD)\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(text);
  const tp = /\bTP\b[^\d\n]{0,25}(\d{1,3}(?:[.,]\d)?)/.exec(text);
  out.hoursLecture = num(lecture?.[1]);
  out.hoursTd = num(td?.[1]);
  out.hoursTp = num(tp?.[1]);

  const total = firstMatch(text, [
    /(?:volume\s+horaire|nombre\s+d[’']heures|dur[ée]e|total)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures)/i,
    /\b(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures)\s*(?:au\s+total|de\s+cours)/i,
  ]);
  const parts = [out.hoursLecture, out.hoursTd, out.hoursTp].filter(
    (v): v is number => v !== undefined,
  );
  if (total) out.totalHours = num(total[1]);
  else if (parts.length) out.totalHours = parts.reduce((a, b) => a + b, 0);

  const lower = text.toLowerCase();
  const school = schoolNames.find((n) => n && lower.includes(n.toLowerCase()));
  if (school) out.schoolName = school;

  for (const key of Object.keys(out) as (keyof FicheData)[]) {
    if (out[key] === undefined || Number.isNaN(out[key])) delete out[key];
  }
  return out;
}
