/**
 * US-136 : statut de clôture d'une séance (pile / en retard / en avance / ordre changé) calculé
 * à partir de l'ordre PRÉVU du déroulé et du journal de projection. Fonctions pures.
 * Données privées : voir privacy.test.ts.
 */

export type ClosingStatus = "none" | "on_time" | "late" | "early" | "reordered";

export interface PlannedSection {
  /** Clé stable : `resource:<id>`, `subject:<titre>` (voir `course-deck.tsx`). */
  key: string;
  title: string;
}

export interface ProjectionEventInput {
  sectionKey: string | null;
  resourceId: string | null;
  kind: "projected" | "private";
  projectedAt: string;
}

export interface ProjectedItem {
  key: string;
  title: string;
  at: string;
}

export interface ProjectionRecap {
  status: ClosingStatus;
  label: string;
  sentence: string;
  /** Sections prévues et projetées, dans l'ordre où elles l'ont été (première projection). */
  projected: ProjectedItem[];
  /** Sections prévues jamais projetées. */
  missing: PlannedSection[];
  /** L'ordre de projection diffère de l'ordre prévu (sur les sections projetées). */
  orderChanged: boolean;
  /** Clés d'événements qui ne correspondent à aucune section prévue (section supprimée…). */
  unknownKeys: string[];
  /** Proposition pour « Points non traités, à reporter » : une ligne par section non projetée. */
  suggestedCarryOver: string;
}

export const STATUS_LABELS: Record<ClosingStatus, string> = {
  none: "Rien d’enregistré",
  on_time: "Pile dans les temps",
  late: "En retard",
  early: "En avance",
  reordered: "Ordre changé",
};

/** Minutes avant l'heure de fin prévue à partir desquelles la séance est « terminée en avance ». */
export const EARLY_SLACK_MINUTES = 10;

/** « 11:40 » ou « 11:40:00 » → minutes depuis minuit ; `null` si illisible. */
export function minutesOf(time: string | null): number | null {
  const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Séance terminée avant son heure de fin prévue (le jour même seulement : l'appelant le garantit). */
export function endedEarly(nowMinutes: number, plannedEnd: string | null): boolean {
  const end = minutesOf(plannedEnd);
  return end !== null && nowMinutes <= end - EARLY_SLACK_MINUTES;
}

export function projectionRecap(input: {
  planned: PlannedSection[];
  events: ProjectionEventInput[];
  /** Ressources de la séance suivante : en avoir projeté une = avoir pris de l'avance. */
  nextSessionResourceIds?: string[];
  /** La séance se termine avant l'heure prévue (voir `endedEarly`). */
  endedEarly?: boolean;
}): ProjectionRecap {
  const planned = input.planned;
  const titleOf = new Map(planned.map((p) => [p.key, p.title]));
  const plannedKeys = new Set(planned.map((p) => p.key));
  const nextIds = new Set(input.nextSessionResourceIds ?? []);

  // Seules les projections à l'écran comptent ; la plus ancienne de chaque section fait foi.
  const projectedEvents = input.events
    .filter((e) => e.kind === "projected")
    .map((e) => ({ ...e, t: Date.parse(e.projectedAt) }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);

  const firstAt = new Map<string, string>();
  const unknown = new Set<string>();
  let nextStarted = false;
  for (const e of projectedEvents) {
    if (e.resourceId && nextIds.has(e.resourceId)) nextStarted = true;
    if (!e.sectionKey) continue;
    if (plannedKeys.has(e.sectionKey)) {
      if (!firstAt.has(e.sectionKey)) firstAt.set(e.sectionKey, e.projectedAt);
    } else {
      unknown.add(e.sectionKey);
    }
  }

  const projected: ProjectedItem[] = [...firstAt.entries()]
    .map(([key, at]) => ({ key, title: titleOf.get(key) ?? key, at }))
    .sort(
      (a, b) =>
        Date.parse(a.at) - Date.parse(b.at) ||
        planned.findIndex((p) => p.key === a.key) - planned.findIndex((p) => p.key === b.key),
    );
  const missing = planned.filter((p) => !firstAt.has(p.key));

  const plannedOrderOfProjected = planned.filter((p) => firstAt.has(p.key)).map((p) => p.key);
  const orderChanged = projectedOrderDiffers(
    plannedOrderOfProjected,
    projected.map((p) => p.key),
  );

  const hasAny = projected.length > 0 || nextStarted;
  let status: ClosingStatus;
  if (planned.length === 0) status = nextStarted ? "early" : "on_time";
  else if (!hasAny) status = "none";
  else if (missing.length > 0) status = "late";
  else if (nextStarted || input.endedEarly) status = "early";
  else if (orderChanged) status = "reordered";
  else status = "on_time";

  const n = missing.length;
  const sentences: Record<ClosingStatus, string> = {
    none: "Rien n’a été projeté depuis la vue présentatrice : indique toi-même ce qui n’a pas été traité.",
    on_time: planned.length
      ? "Tout ce qui était prévu a été projeté, dans l’ordre prévu."
      : "Aucune ressource n’était prévue au déroulé.",
    late: `${n} élément${n > 1 ? "s" : ""} prévu${n > 1 ? "s" : ""} ${n > 1 ? "n’ont" : "n’a"} pas été projeté${n > 1 ? "s" : ""} : tu peux ${n > 1 ? "les" : "le"} reporter à la séance suivante.`,
    early: nextStarted
      ? "Tout est projeté, et tu as déjà entamé une ressource de la séance suivante."
      : "Tout est projeté et la séance se termine avant l’heure prévue.",
    reordered: "Tout est projeté, mais dans un autre ordre que celui prévu.",
  };

  return {
    status,
    label: STATUS_LABELS[status],
    sentence: sentences[status],
    projected,
    missing,
    orderChanged,
    unknownKeys: [...unknown],
    suggestedCarryOver: missing.map((m) => m.title).join("\n"),
  };
}

function projectedOrderDiffers(planned: string[], actual: string[]): boolean {
  return planned.length !== actual.length || planned.some((k, i) => k !== actual[i]);
}
