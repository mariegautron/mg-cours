import { z } from "zod";

import { isValidIsoDate, type ScheduleRow } from "./schedule-parser";

/**
 * Export « Services intervenant » d'Hyperplanning (Index Éducation), fourni chaque année par
 * l'école : un bloc par matière (nom, public « Nantes | CLASSE », durée totale, puis créneaux
 * « durée jour. jj/mm/aaaa hhHmm »). Fonctions pures : lecture du texte du PDF, choix du bloc,
 * fusion des créneaux consécutifs et dates du module.
 */

export interface HyperplanningSlot {
  /** Date ISO `aaaa-mm-jj`. */
  date: string;
  /** Début `HH:MM`. */
  start: string;
  /** Durée en heures. */
  hours: number;
}

export interface HyperplanningService {
  name: string;
  /** Public, ex. « Nantes | DEVFLSTK MAST1 » (sans la durée). */
  audience: string;
  /** Durée totale déclarée en tête de bloc, `null` si absente. */
  totalHours: number | null;
  slots: HyperplanningSlot[];
}

export interface HyperplanningParse {
  services: HyperplanningService[];
  warnings: string[];
}

const DAYS = String.raw`(?:lun|mar|mer|jeu|ven|sam|dim)`;
const SLOT = new RegExp(
  String.raw`(\d{1,2})\s*h\s*(\d{2})\s+${DAYS}\.?\s+(\d{2})/(\d{2})/(\d{4})\s+(\d{1,2})\s*h\s*(\d{2})`,
  "gi",
);
const AUDIENCE = /^([A-Za-zÀ-ÿ' -]+?)\s*\|\s*(.+?)\s+(\d{1,3})\s*h\s*(\d{2})\s*$/;
/** En-têtes et pieds de page répétés sur chaque page : jamais un nom de matière. */
const NOISE =
  /(?:\bYNOV\s+CAMPUS\b|Index\s+[ÉE]ducation|hyperplanning|^\s*page\s*\d+|^\s*\d+\s*\/\s*\d+\s*$|^\s*services?\s+(?:de\s+l['’])?intervenant|^\s*imprim[ée]\s+le\b)/i;

const pad = (n: number | string) => String(n).padStart(2, "0");
const hoursOf = (h: string, m: string) => Number(h) + Number(m) / 60;
const round2 = (n: number) => Math.round(n * 100) / 100;

const cleanLine = (s: string) =>
  s
    .replace(/[  ]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

/**
 * Lit le texte du PDF. Tolère les jours abrégés, les lignes dupliquées, la page répétée avec
 * son en-tête et son pied de page, et plusieurs matières dans le même fichier. Avertit quand
 * les créneaux ne totalisent pas la durée déclarée.
 */
export function parseHyperplanningServices(text: string): HyperplanningParse {
  const services: HyperplanningService[] = [];
  const warnings: string[] = [];
  let current: HyperplanningService | null = null;
  let candidate: string | null = null;

  const lines = text.replace(/\r\n?/g, "\n").split("\n").map(cleanLine).filter(Boolean);

  for (const line of lines) {
    const audience = AUDIENCE.exec(line);
    if (audience) {
      const label = `${cleanLine(audience[1])} | ${cleanLine(audience[2])}`;
      const total = round2(hoursOf(audience[3], audience[4]));
      const name: string = candidate ?? (current as HyperplanningService | null)?.name ?? "";
      // Ligne de public répétée (dupliquée, ou page suivante) : même bloc, rien de nouveau.
      const same: HyperplanningService | undefined = services.find(
        (s) => s.name === name && s.audience === label,
      );
      if (same) {
        current = same;
      } else if (name) {
        current = { name, audience: label, totalHours: total, slots: [] };
        services.push(current);
      }
      candidate = null;
      continue;
    }

    const slots = [...line.matchAll(SLOT)];
    if (slots.length) {
      candidate = null;
      if (!current) continue;
      for (const m of slots) {
        const date = `${m[5]}-${pad(m[4])}-${pad(m[3])}`;
        const hours = round2(hoursOf(m[1], m[2]));
        const start = `${pad(m[6])}:${m[7]}`;
        if (!isValidIsoDate(date) || hours <= 0) continue;
        const duplicate = current.slots.some((s) => s.date === date && s.start === start);
        if (!duplicate) current.slots.push({ date, start, hours });
      }
      continue;
    }

    if (NOISE.test(line)) continue;
    // Un nom de matière : la ligne qui précède le public. Deux lignes de suite → la dernière.
    candidate = line;
  }

  for (const service of services) {
    service.slots.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
    const sum = round2(service.slots.reduce((t, s) => t + s.hours, 0));
    if (service.totalHours !== null && sum !== service.totalHours) {
      warnings.push(
        `« ${service.name} » : les créneaux totalisent ${formatHours(sum)} pour ${formatHours(service.totalHours)} annoncées.`,
      );
    }
  }
  return { services, warnings };
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours + 1e-9);
  const m = Math.round((hours - h) * 60);
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

/** Nom comparable : sans accents ni casse, « & » = « et », ponctuation et espaces neutralisés. */
export function normalizeModuleName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Blocs du fichier qui portent le nom du module. Vide si le nom est vide ou si aucun ne
 * correspond : l'interface propose alors la liste des matières du fichier.
 */
export function matchServices(
  services: HyperplanningService[],
  moduleName: string,
): HyperplanningService[] {
  const wanted = normalizeModuleName(moduleName);
  if (!wanted) return [];
  return services.filter((s) => normalizeModuleName(s.name) === wanted);
}

export type SlotMode = "merge" | "separate";

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * Créneaux → séances. En mode `merge` (défaut), les créneaux CONSÉCUTIFS d'une même journée
 * (le suivant commence quand le précédent finit) forment une seule séance : 08h00 3 h + 11h00 1 h
 * = 08:00-12:00. En mode `separate`, un créneau = une séance.
 */
export function slotsToSessions(
  slots: HyperplanningSlot[],
  mode: SlotMode = "merge",
): ScheduleRow[] {
  const sorted = [...slots].sort((a, b) =>
    `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`),
  );
  const rows: { date: string; from: number; to: number }[] = [];
  for (const slot of sorted) {
    const from = toMinutes(slot.start);
    const to = Math.min(from + Math.round(slot.hours * 60), 23 * 60 + 59);
    const last = rows.at(-1);
    if (mode === "merge" && last && last.date === slot.date && last.to === from) last.to = to;
    else rows.push({ date: slot.date, from, to });
  }
  return rows.map((r) => ({ date: r.date, startTime: toTime(r.from), endTime: toTime(r.to) }));
}

export interface ModuleDates {
  startDate: string | null;
  firstSessionDate: string | null;
  endDate: string | null;
}

/**
 * Dates du module d'après ses séances : début et 1re séance = premier créneau, fin = dernier.
 * La 1re séance fixe l'échéance de la progression (J-15).
 */
export function moduleDatesFromSlots(slots: { date: string }[]): ModuleDates {
  const dates = slots.map((s) => s.date).sort();
  return {
    startDate: dates[0] ?? null,
    firstSessionDate: dates[0] ?? null,
    endDate: dates.at(-1) ?? null,
  };
}

const isoOrNull = z
  .string()
  .nullable()
  .refine((v) => v === null || isValidIsoDate(v));
const moduleDatesSchema = z.object({
  startDate: isoOrNull,
  firstSessionDate: isoOrNull,
  endDate: isoOrNull,
});

/** Lit le champ caché `datesJson` (dates confirmées) ; `undefined` si absent, `null` si invalide. */
export function readModuleDates(json: string | null | undefined): ModuleDates | null | undefined {
  if (!json || !json.trim()) return undefined;
  try {
    const parsed = moduleDatesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const DATE_LABELS: Record<keyof ModuleDates, { label: string; fixed: string }> = {
  startDate: { label: "Le début", fixed: "fixé" },
  firstSessionDate: { label: "La 1re séance", fixed: "fixée" },
  endDate: { label: "La fin", fixed: "fixée" },
};

const frDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * Écarts entre les dates déjà enregistrées et celles proposées, à montrer AVANT d'écrire :
 * « la 1re séance passerait du 05/10/2026 au 12/10/2026 ». Rien pour une date identique.
 */
export function describeDateChanges(current: ModuleDates, proposed: ModuleDates): string[] {
  const out: string[] = [];
  for (const key of Object.keys(DATE_LABELS) as (keyof ModuleDates)[]) {
    const from = current[key];
    const to = proposed[key];
    if (!to || from === to) continue;
    const { label, fixed } = DATE_LABELS[key];
    out.push(
      from
        ? `${label} passerait du ${frDate(from)} au ${frDate(to)}.`
        : `${label} serait ${fixed} au ${frDate(to)}.`,
    );
  }
  return out;
}

/** Résumé court des trois dates proposées : « début 12/10/2026 · fin 03/11/2026 ». */
export function summarizeModuleDates(dates: ModuleDates): string {
  return [
    dates.startDate ? `début ${frDate(dates.startDate)}` : null,
    dates.firstSessionDate ? `1re séance ${frDate(dates.firstSessionDate)}` : null,
    dates.endDate ? `fin ${frDate(dates.endDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
