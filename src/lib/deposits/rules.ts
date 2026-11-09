/**
 * Dépôt des rendus (fonctions pures) : date limite à l'heure de Paris, retard (seulement signalé, jamais
 * pénalisé), validation de ce qu'on dépose.
 */
import { validateFile, validateLink } from "@/lib/projects/submission-items";

export type SubmitAccepts = "file" | "link" | "both";
export type SubmitMode = "app" | "elsewhere";

export const MAX_FILES_PER_DEPOSIT = 10;

export function parseAccepts(v: unknown): SubmitAccepts {
  return v === "file" || v === "link" ? v : "both";
}
export function parseMode(v: unknown): SubmitMode {
  return v === "app" ? "app" : "elsewhere";
}

/** Décalage de Paris (en minutes) à un instant donné, heure d'été comprise. */
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** Date limite : `YYYY-MM-DD` + `HH:MM` (23 h 59 sans heure), lues à l'heure de Paris. */
export function deadlineOf(date: string | null, time: string | null): Date | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = time?.match(/^(\d{1,2}):(\d{2})/);
  const hh = m ? Number(m[1]) : 23;
  const mm = m ? Number(m[2]) : 59;
  const [y, mo, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm));
  return new Date(guess.getTime() - parisOffsetMinutes(guess) * 60000);
}

/** Minutes de retard (0 si dans les temps ou sans date limite). */
export function lateMinutes(deadline: Date | null, at: Date): number {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((at.getTime() - deadline.getTime()) / 60000));
}

/** « 35 min », « 2 h », « 1 j 3 h ». */
export function lateLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d} j ${rest} h` : `${d} j`;
}

export interface DepositInput {
  files: { name: string; size: number; mime: string }[];
  link: string | null;
}

/** Ce qu'on dépose doit correspondre à ce que l'évaluation demande. */
export function validateDeposit(
  input: DepositInput,
  accepts: SubmitAccepts,
): { ok: true; link: string | null } | { ok: false; error: string } {
  const link = input.link?.trim() ? input.link.trim() : null;
  if (input.files.length === 0 && !link)
    return { ok: false, error: "Ajoute un fichier ou un lien." };
  if (input.files.length > 0 && accepts === "link") {
    return { ok: false, error: "Cette évaluation demande un lien, pas de fichier." };
  }
  if (link && accepts === "file") {
    return { ok: false, error: "Cette évaluation demande un fichier, pas de lien." };
  }
  if (input.files.length > MAX_FILES_PER_DEPOSIT) {
    return { ok: false, error: `${MAX_FILES_PER_DEPOSIT} fichiers au maximum par dépôt.` };
  }
  for (const f of input.files) {
    const check = validateFile(f);
    if (!check.ok) return { ok: false, error: `${f.name} : ${check.error}` };
  }
  if (link) {
    const check = validateLink(link);
    if (!check.ok) return check;
    return { ok: true, link: check.url };
  }
  return { ok: true, link: null };
}

/** Nom de fichier sûr pour un chemin de stockage. */
export function storageName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(-100);
  return clean || "fichier";
}

/** « 8/11 à 0 h 18 » : jour et heure de Paris, à la française. */
export function parisDayTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")} à ${Number(get("hour"))} h ${get("minute")}`;
}
