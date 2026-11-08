/**
 * Report d'une séance à la suivante (fonctions pures). À la clôture, chaque fiche « à reporter »
 * quitte le déroulé de la séance clôturée et rejoint celui de la suivante, en tête. On garde de
 * quoi défaire : lien d'origine, rang, séance cible. Un élément « pas fait volontairement » n'est
 * ni reporté ni rappelé.
 */

export interface CarriedLink {
  role: "primary" | "secondary";
  activity_type: string | null;
  duration_minutes: number | null;
  pedagogical_objective: string | null;
}

export interface CarriedEntry {
  key: string;
  resourceId: string;
  title: string;
  /** Séance qui a reçu la fiche ; `null` tant qu'il n'y a pas de séance suivante. */
  toCourseId: string | null;
  /** Pas de séance suivante : le report attend, la fiche reste dans la séance clôturée. */
  pending: boolean;
  /** La fiche a été ajoutée à la séance suivante (sinon elle y était déjà : on n'y touche pas). */
  added: boolean;
  link: CarriedLink;
  /** Rang dans le déroulé de la séance clôturée avant le report. */
  orderIndex: number;
}

export interface CarryOver {
  carried: CarriedEntry[];
  skipped: { key: string; title: string }[];
}

export const EMPTY_CARRY: CarryOver = { carried: [], skipped: [] };

const RESOURCE_PREFIX = "resource:";

/** Identifiant de la fiche d'une clé de section « resource:… », sinon `null` (sujet, QCM…). */
export const resourceIdOfKey = (key: string): string | null =>
  key.startsWith(RESOURCE_PREFIX) && key.length > RESOURCE_PREFIX.length
    ? key.slice(RESOURCE_PREFIX.length)
    : null;

const isString = (v: unknown): v is string => typeof v === "string";

/** Relit la colonne `carried_over` ; tout ce qui n'a pas la forme attendue est ignoré. */
export function parseCarryOver(raw: unknown): CarryOver {
  if (typeof raw !== "object" || raw === null) return EMPTY_CARRY;
  const r = raw as Record<string, unknown>;
  const carried: CarriedEntry[] = [];
  for (const e of Array.isArray(r.carried) ? r.carried : []) {
    if (typeof e !== "object" || e === null) continue;
    const c = e as Record<string, unknown>;
    const link = (c.link ?? {}) as Record<string, unknown>;
    if (!isString(c.key) || !isString(c.resourceId) || !isString(c.title)) continue;
    carried.push({
      key: c.key,
      resourceId: c.resourceId,
      title: c.title,
      toCourseId: isString(c.toCourseId) ? c.toCourseId : null,
      pending: c.pending === true,
      added: c.added === true,
      link: {
        role: link.role === "primary" ? "primary" : "secondary",
        activity_type: isString(link.activity_type) ? link.activity_type : null,
        duration_minutes: typeof link.duration_minutes === "number" ? link.duration_minutes : null,
        pedagogical_objective: isString(link.pedagogical_objective)
          ? link.pedagogical_objective
          : null,
      },
      orderIndex: typeof c.orderIndex === "number" && c.orderIndex >= 0 ? c.orderIndex : 0,
    });
  }
  const skipped: CarryOver["skipped"] = [];
  for (const s of Array.isArray(r.skipped) ? r.skipped : []) {
    const o = s as Record<string, unknown>;
    if (o && isString(o.key) && isString(o.title)) skipped.push({ key: o.key, title: o.title });
  }
  return { carried, skipped };
}

/** Liste de clés envoyée par le formulaire de clôture (JSON), bornée. */
export function parseKeyList(raw: FormDataEntryValue | null): string[] {
  try {
    const v = JSON.parse(String(raw ?? "[]")) as unknown;
    return Array.isArray(v)
      ? [...new Set(v.filter(isString).filter((k) => k.length <= 300))].slice(0, 100)
      : [];
  } catch {
    return [];
  }
}

/** Les fiches reportées en tête du déroulé, sans doublon ; le reste garde son ordre. */
export function carriedFirst(order: readonly string[], ids: readonly string[]): string[] {
  const head = [...new Set(ids)];
  return [...head, ...order.filter((id) => !head.includes(id))];
}

export const withoutIds = (order: readonly string[], ids: readonly string[]): string[] =>
  order.filter((id) => !ids.includes(id));

/** Remet une fiche à son rang (borné à la taille de la liste), sans doublon. */
export function restoreAt(order: readonly string[], id: string, index: number): string[] {
  const rest = order.filter((x) => x !== id);
  rest.splice(Math.min(Math.max(0, index), rest.length), 0, id);
  return rest;
}

/** « 2 éléments déplacés vers la séance 4 » pour l'écran de fin de séance. */
export function carryLabel(entries: readonly CarriedEntry[], numberOf: (id: string) => number) {
  return entries.map((e) => ({
    title: e.title,
    pending: e.pending,
    alreadyThere: !e.pending && !e.added,
    toNumber: e.toCourseId ? numberOf(e.toCourseId) : null,
  }));
}
