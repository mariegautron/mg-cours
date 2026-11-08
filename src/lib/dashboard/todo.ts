/**
 * E20 / US-121 : « À faire » du tableau de bord Aujourd'hui. Fonctions pures : on transforme les
 * données déjà chargées en candidats, puis on garde les trois plus urgents.
 */
export const TODO_LIMIT = 3;

export type TodoKind =
  | "outline_overdue"
  | "outline_urgent"
  | "session_prep"
  | "assessment_prep"
  | "appreciations"
  | "outline_soon"
  | "invoice_send"
  | "invoice_ready"
  | "payment";

/** Ordre de départage à urgence égale (le plus pressant d'abord). */
const KIND_ORDER: TodoKind[] = [
  "outline_overdue",
  "outline_urgent",
  "session_prep",
  "assessment_prep",
  "appreciations",
  "outline_soon",
  "invoice_send",
  "invoice_ready",
  "payment",
];

export interface TodoItem {
  key: string;
  kind: TodoKind;
  title: string;
  detail: string;
  href: string;
  /** Jours avant l'échéance (négatif = en retard) ; plus petit = plus urgent. */
  urgency: number;
}

/** Plus urgent d'abord, puis ordre des types, puis titre : le résultat ne dépend pas de l'entrée. */
export function pickTodos(items: TodoItem[], limit = TODO_LIMIT): TodoItem[] {
  return [...items]
    .sort(
      (a, b) =>
        a.urgency - b.urgency ||
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.title.localeCompare(b.title, "fr") ||
        a.key.localeCompare(b.key),
    )
    .slice(0, limit);
}

/** Jours entiers de `from` à `to` (AAAA-MM-JJ). */
export function daysBetween(from: string, to: string): number {
  const ms = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

const inDays = (n: number) => (n === 0 ? "aujourd’hui" : n === 1 ? "demain" : `dans ${n} jours`);

export interface TodoSources {
  today: string;
  /** Progressions à surveiller (trame.ts). */
  outlineAlerts: {
    module: { id: string; name: string };
    level: "overdue" | "urgent" | "warning";
    daysUntilDue: number;
  }[];
  /** Séances datées à venir (aujourd'hui compris), avec leur état de préparation. */
  upcomingCourses: {
    id: string;
    title: string;
    position: number;
    session_date: string | null;
    prep_status: string;
    module: { id: string; name: string };
  }[];
  /** Évaluations à venir qui ont encore un manque (rappel à J-7 et J-1). */
  assessments?: {
    id: string;
    title: string;
    date: string;
    moduleId: string;
    moduleName: string;
    missingCount: number;
  }[];
  billing: { module: { id: string; name: string }; kind: "ready" | "toSend" | "toCollect" }[];
  /** Modules dont toutes les notes sont saisies et qui ont des appréciations à écrire. */
  appreciations?: { module: { id: string; name: string }; remaining: number }[];
  /** Horizon des séances à préparer, en jours. */
  prepHorizonDays?: number;
}

export function buildTodos(src: TodoSources): TodoItem[] {
  const out: TodoItem[] = [];
  for (const a of src.outlineAlerts) {
    const d = a.daysUntilDue;
    out.push({
      key: `outline-${a.module.id}`,
      kind:
        a.level === "overdue"
          ? "outline_overdue"
          : a.level === "urgent"
            ? "outline_urgent"
            : "outline_soon",
      title: `Envoyer la progression de ${a.module.name}`,
      detail: d < 0 ? `en retard de ${Math.abs(d)} j` : `échéance dans ${d} j`,
      href: `/modules/${a.module.id}`,
      urgency: d,
    });
  }
  const horizon = src.prepHorizonDays ?? 7;
  for (const c of src.upcomingCourses) {
    if (!c.session_date || c.prep_status === "ready") continue;
    const d = daysBetween(src.today, c.session_date);
    if (d < 0 || d > horizon) continue;
    out.push({
      key: `prep-${c.id}`,
      kind: "session_prep",
      title: `Préparer la séance ${c.position}`,
      detail: `${c.module.name} · ${c.title} · ${inDays(d)}`,
      href: `/modules/${c.module.id}/courses/${c.id}/edit`,
      urgency: d,
    });
  }
  for (const a of src.assessments ?? []) {
    const d = daysBetween(src.today, a.date.slice(0, 10));
    if (d < 0 || d > 7 || a.missingCount === 0) continue;
    out.push({
      key: `assessment-${a.id}`,
      kind: "assessment_prep",
      title: `Préparer l’évaluation « ${a.title} »`,
      detail: `${a.moduleName} · ${inDays(d)} · ${a.missingCount} point${a.missingCount > 1 ? "s" : ""} à compléter`,
      href: `/modules/${a.moduleId}/assessments`,
      urgency: d <= 1 ? d - 2 : d,
    });
  }
  for (const a of src.appreciations ?? []) {
    out.push({
      key: `appreciations-${a.module.id}`,
      kind: "appreciations",
      title: `Écrire les appréciations (${a.remaining} restante${a.remaining > 1 ? "s" : ""})`,
      detail: a.module.name,
      href: `/modules/${a.module.id}/appreciations`,
      urgency: 7,
    });
  }
  for (const b of src.billing) {
    const base = {
      key: `billing-${b.kind}-${b.module.id}`,
      href: `/modules/${b.module.id}/billing`,
    };
    if (b.kind === "toSend")
      out.push({
        ...base,
        kind: "invoice_send",
        title: `Envoyer la facture de ${b.module.name}`,
        detail: "facture prête",
        urgency: 10,
      });
    else if (b.kind === "ready")
      out.push({
        ...base,
        kind: "invoice_ready",
        title: `Facturer ${b.module.name}`,
        detail: "module prêt à facturer",
        urgency: 12,
      });
    else
      out.push({
        ...base,
        kind: "payment",
        title: `Suivre le paiement de ${b.module.name}`,
        detail: "facture envoyée",
        urgency: 20,
      });
  }
  return out;
}
