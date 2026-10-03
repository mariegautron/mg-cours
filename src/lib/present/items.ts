/**
 * « Avant de commencer » (maquette Affichage) : la liste des éléments du déroulé d'une séance, avec
 * pour chacun ce qu'on peut en faire — le projeter ou le garder « pour moi » — et ce qui ne se
 * projette jamais (corrigés, éléments à construire). Fonctions pures.
 */
import {
  cadreKey,
  gridKey,
  OBJECTIVES_KEY,
  RESUME_KEY,
  resourceKey,
  subjectKey,
} from "@/lib/present/plan";

export interface PrepResource {
  id: string;
  title: string;
  audience: string;
  status: string;
  /** Ressource qui n'est qu'un lien (Kahoot…) : elle s'ouvre dans un nouvel onglet. */
  linkOnly: boolean;
}

export interface PrepSubject {
  title: string;
  hasCadre: boolean;
  hasGrid: boolean;
}

export interface PrepItem {
  key: string;
  label: string;
  /** Précision sous le titre. */
  detail: string | null;
  /** Étiquette d'état (Prête, À construire, Lien…) en mots. */
  badge: { label: string; tone: "ok" | "warn" | "plain" } | null;
  /** `toggle` : projeter ou pour moi ; `locked` : jamais projeté, avec la raison. */
  mode: "toggle" | "locked";
  lockLabel: string | null;
  /** Page qui montre ce que cet élément projette (cadre, grille). */
  previewKey: "cadre" | "grid" | null;
}

export function prepItems(input: {
  hasResume: boolean;
  objectives: number;
  resources: readonly PrepResource[];
  subjects: readonly PrepSubject[];
  /** Évaluations rattachées dont le sujet est « à construire » : jamais projetées. */
  unpreparedSubjects: readonly string[];
}): PrepItem[] {
  const items: PrepItem[] = [];
  const toggle = (
    key: string,
    label: string,
    extra: Partial<Pick<PrepItem, "detail" | "badge" | "previewKey">> = {},
  ) =>
    items.push({
      key,
      label,
      detail: extra.detail ?? null,
      badge: extra.badge ?? null,
      mode: "toggle",
      lockLabel: null,
      previewKey: extra.previewKey ?? null,
    });
  const locked = (
    key: string,
    label: string,
    lockLabel: string,
    extra: Partial<Pick<PrepItem, "detail" | "badge">> = {},
  ) =>
    items.push({
      key,
      label,
      detail: extra.detail ?? null,
      badge: extra.badge ?? null,
      mode: "locked",
      lockLabel,
      previewKey: null,
    });

  if (input.hasResume) {
    toggle(RESUME_KEY, "Ouverture", { detail: "« Pour aujourd’hui, vous deviez… »" });
  }
  if (input.objectives > 0) toggle(OBJECTIVES_KEY, "Objectifs de la séance");

  const studentReady = input.resources.filter(
    (r) => r.audience !== "teacher" && r.status === "ready",
  );
  for (const r of studentReady) {
    toggle(resourceKey(r.id), r.title, {
      badge: r.linkOnly ? { label: "Lien", tone: "plain" } : { label: "Prête", tone: "ok" },
      detail: r.linkOnly
        ? "Garde le lien de la ressource : il s’ouvre dans un nouvel onglet quand tu le décides."
        : null,
    });
  }
  for (const s of input.subjects) {
    toggle(subjectKey(s.title), `Sujet — ${s.title}`);
    if (s.hasCadre) {
      toggle(cadreKey(s.title), `Cadre — ${s.title}`, {
        detail: "Quand, avec qui, ce qu’on rend, comment c’est noté.",
        previewKey: "cadre",
      });
    }
    if (s.hasGrid) {
      toggle(gridKey(s.title), `Grille de correction — ${s.title}`, {
        detail: "Ce qui est noté, les paliers, sans notes ni commentaires.",
        previewKey: "grid",
      });
    }
  }
  for (const title of input.unpreparedSubjects) {
    locked(`unprepared:${title}`, `Sujet — ${title}`, "Non projeté", {
      badge: { label: "À construire", tone: "warn" },
      detail: "Pas encore prêt : jamais projeté.",
    });
  }
  for (const r of input.resources.filter((x) => x.audience !== "teacher" && x.status !== "ready")) {
    locked(resourceKey(r.id), r.title, "Non projeté", {
      badge: { label: "À construire", tone: "warn" },
      detail: "Pas encore prêt : jamais projeté.",
    });
  }
  for (const r of input.resources.filter((x) => x.audience === "teacher")) {
    locked(resourceKey(r.id), r.title, "Jamais projeté", {
      detail: "Enseignante uniquement.",
    });
  }
  return items;
}

/** « 7 éléments projetés » (les éléments « pour moi » et ceux qui ne se projettent pas ne comptent pas). */
export function projectedCount(items: readonly PrepItem[], hidden: ReadonlySet<string>): number {
  return items.filter((i) => i.mode === "toggle" && !hidden.has(i.key)).length;
}
