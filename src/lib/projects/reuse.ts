/**
 * US-129 : partir d'un projet existant (autre module, autre thème). Fonctions pures : ce qui se copie
 * (le cadre : titre, brief en sections, évaluations du projet avec leur grille, thèmes au choix) et ce
 * qui ne se copie JAMAIS (notes, groupes, rendus, dates, affectations de thèmes, séances, résultats).
 */
import { planAssessmentCopy } from "@/lib/modules/duplicate-evaluations";
import type { Tables, TablesInsert } from "@/types/db";

export interface ReuseSource {
  title: string;
  brief_md: string;
  assessments: Tables<"assessment">[];
  themes: Pick<Tables<"project_theme">, "title" | "description_md">[];
}

export interface ReusePlan {
  project: { title: string; brief_md: string; client_context_md: string };
  assessments: TablesInsert<"assessment">[];
  themes: { title: string; description_md: string }[];
  /** Ce que Marie doit réécrire. */
  toRewrite: string[];
}

export const COPIED_LABELS = [
  "Le titre et le brief en sections (phases comprises)",
  "Les évaluations du projet, avec leur grille de correction et leur coefficient",
  "Les thèmes au choix (si tu le demandes)",
] as const;

/** Lignes « Ce qu'on garde » de l'écran de reprise : ce qui reste, et ce qui est à réécrire. */
export const KEEP_ROWS = [
  {
    key: "phases",
    title: "Les phases et leurs livrables",
    hint: "Le brief en sections, phases comprises",
    kept: true,
  },
  {
    key: "assessments",
    title: "Les évaluations du projet",
    hint: "Jalons, oral, évaluation individuelle, avec leur coefficient",
    kept: true,
  },
  { key: "grids", title: "Les grilles", hint: "Les critères de chaque évaluation", kept: true },
  {
    key: "context",
    title: "Le client et le contexte",
    hint: "Propres au projet d'origine : à réécrire",
    kept: false,
  },
] as const;

export const NOT_COPIED_LABELS = [
  "Les notes et appréciations",
  "Les groupes et l’affectation des thèmes",
  "Les rendus et les résultats publiés",
  "Les dates et les séances",
  "Le contexte client (à réécrire)",
] as const;

export function planProjectReuse(
  source: ReuseSource,
  ctx: { moduleId: string; projectId: string; keepThemes: boolean },
): ReusePlan {
  const assessments = source.assessments
    .filter((a) => !!a.project_role && !a.makeup_of_id)
    .sort((a, b) => (a.project_position ?? 0) - (b.project_position ?? 0))
    .map((a) =>
      planAssessmentCopy(a, {
        moduleId: ctx.moduleId,
        courseIds: new Map(),
        projectId: ctx.projectId,
      }),
    )
    // Un sujet est à refaire pour le nouveau thème : il n'est pas « déjà fourni ».
    .map((a) => ({ ...a, prep_status: a.prep_status === "ready" ? "to_build" : a.prep_status }));
  return {
    project: { title: source.title, brief_md: source.brief_md, client_context_md: "" },
    assessments,
    themes: ctx.keepThemes
      ? source.themes.map((t) => ({ title: t.title, description_md: t.description_md }))
      : [],
    toRewrite: ["Contexte client"],
  };
}

/** « Agile (2025) : Refonte accessible » pour la liste de choix. */
export function reusableLabel(p: { moduleName: string; year: number; title: string }): string {
  return `${p.moduleName} (${p.year}) : ${p.title}`;
}
