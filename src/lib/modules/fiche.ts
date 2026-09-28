/**
 * Lecture au mieux du texte d'une fiche pedagogique (PDF ecole) pour preremplir un module.
 * Ne renvoie que ce qui est trouve avec assez de certitude.
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

/** Resultat de la verification de coherence des heures. */
export interface FicheValidation {
  isValid: boolean;
  calculatedTotal: number | null;
  declaredTotal: number | null;
  discrepancy: number | null;
  error?: string;
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
 * Verifie la coherence des heures : FFP + TDP + TP doit egaler totalHours.
 * Tolere un ecart de 0.5h pour les arrondis.
 * Ne corrige rien, signale seulement.
 */
export function validateFicheHours(data: FicheData): FicheValidation {
  const parts = [data.hoursLecture, data.hoursTd, data.hoursTp].filter(
    (v): v is number => v !== undefined,
  );
  const calculatedTotal = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
  const declaredTotal = data.totalHours ?? null;

  if (calculatedTotal !== null && declaredTotal !== null) {
    const discrepancy = calculatedTotal - declaredTotal;
    if (Math.abs(discrepancy) > 0.5) {
      return {
        isValid: false,
        calculatedTotal,
        declaredTotal,
        discrepancy,
        error: `Incoherence : ${calculatedTotal}h (FFP+TDP+TP) != ${declaredTotal}h (total declare). Ecart : ${discrepancy > 0 ? '+' : ''}${discrepancy}h`,
      };
    }
    return {
      isValid: true,
      calculatedTotal,
      declaredTotal,
      discrepancy,
    };
  }

  if (calculatedTotal !== null) {
    return { isValid: true, calculatedTotal, declaredTotal, discrepancy: null };
  }
  if (declaredTotal !== null) {
    return { isValid: true, calculatedTotal, declaredTotal, discrepancy: null };
  }
  return { isValid: true, calculatedTotal, declaredTotal, discrepancy: null };
}

/**
 * Trouve les modules avec incoherence d'heures.
 * Ne corrige rien sans accord explicite.
 */
export function findInconsistentModules(
  modules: Array<{
    id: string;
    name: string;
    ycode: string | null;
    total_hours: number | null;
    hours_lecture: number | null;
    hours_td: number | null;
    hours_tp: number | null;
  }>,
): Array<{
  moduleId: string;
  moduleName: string;
  ycode: string | null;
  validation: FicheValidation;
}> {
  return modules
    .map((m) => {
      const data: FicheData = {
        totalHours: m.total_hours ?? undefined,
        hoursLecture: m.hours_lecture ?? undefined,
        hoursTd: m.hours_td ?? undefined,
        hoursTp: m.hours_tp ?? undefined,
      };
      const validation = validateFicheHours(data);
      return { moduleId: m.id, moduleName: m.name, ycode: m.ycode, validation };
    })
    .filter((m) => !m.validation.isValid);
}

export function parseFiche(rawText: string, schoolNames: string[] = []): FicheData {
  const text = rawText.replace(/\r\n?/g, "\n").replace(/[  ]/g, " ");
  const out: FicheData = {};

  const ycode = /\b([A-Z]\d{4}_\d{3,5})\b/.exec(text);
  if (ycode) {
    out.ycode = ycode[1];
    const yy = /^[A-Z](\d{2})\d{2}_/.exec(ycode[1]);
    if (yy) out.year = 2000 + Number(yy[1]);
  }
  if (out.year === undefined) {
    const span = /\b(20\d{2})\s*[-/\u2013]\s*(20\d{2})\b/.exec(text);
    if (span) out.year = Number(span[1]);
  }

  const name = firstMatch(text, [
    /(?:intitule\s+du\s+module|intitule|nom\s+du\s+module|module|matiere|unite\s+d[\u0019']enseignement)\s*:\s*([^\n]+)/i,
  ]);
  if (name) {
    const value = clean(name[1]).replace(/\s*\(?\b[A-Z]\d{4}_\d{3,5}\)?\s*$/, "");
    if (value.length >= 3 && value.length <= 200) out.name = value;
  }

  const level =
    /(Mastre?\s*\d|Bachelor\s*\d|Licence\s*\d|\bB[123]\b|\bM[12]\b)([ \t]+(?:en[ \t]+)?[A-Z\u00c0-\u00dd][\w\u00c0-\u00ff&-]+)?/.exec(
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
    /(?:volume\s+horaire|nombre\s+d[\u0019']heures|duree|total)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d)?)\s*(?:h\b|heures)/i,
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
