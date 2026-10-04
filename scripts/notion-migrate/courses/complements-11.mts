// Compléments 11 : données des nouveaux écrans (migrations 20261105 à 20261109).
//  a) slides_url par séance (liens Figma des journées du M2) ;
//  b) déroulé structuré (course_resource) : durée, type, horaire, objectif, état de préparation,
//     tirés des pages « Activités pédagogiques » de Notion ;
//  c) « où rendre » (assessment.where_to_submit) d'après les devoirs et quiz de Moodle ;
//  d) attendus évalués (assessment_expectation) : rattachement relu évaluation par évaluation.
// Simulation par défaut ; ne complète que ce qui est vide.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";
import { frenchDateTimeRange } from "../lib/parsers.mts";

import { complete, select } from "./complements-fonctions.mts";
import { DAYS } from "./m2-accessibilite-2425.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

// ── a) slides par séance ───────────────────────────────────────────────────

async function slides({ imp, page }: CourseContext) {
  for (const [i, d] of DAYS.entries()) {
    const url = (page(d.id).properties["Slides"] ?? "").trim();
    if (!/^https?:\/\//.test(url)) continue;
    const courseId = await imp.findRef("notion", d.id, "course");
    if (!courseId) continue;
    const [c] = await select(imp, "course", "id, slides_url", { id: courseId });
    if (!c || c.slides_url) continue;
    await complete(
      imp,
      "course",
      courseId,
      { slides_url: url },
      `M2 › jour ${i + 1} : slides ${url.slice(0, 70)}…`,
    );
  }
}

// ── b) déroulé structuré ───────────────────────────────────────────────────

/** « 165 min » → 165 ; absent → null. */
export function parseMinutes(value: string | undefined): number | null {
  const m = /(\d{1,3})\s*min/i.exec(value ?? "");
  const n = m ? Number(m[1]) : null;
  return n && n >= 1 && n <= 600 ? n : null;
}

/** État Notion → état de préparation de l'application. */
export function prepStateOf(
  value: string | undefined,
): "not_started" | "in_progress" | "ready" | null {
  const v = (value ?? "").trim().toLocaleLowerCase("fr");
  if (!v) return null;
  if (/^pr[êe]t/.test(v)) return "ready";
  if (/en cours|kaoot|kahoot/.test(v)) return "in_progress";
  return "not_started";
}

/** « 🧠 Comprendre : Assimiler des notions clés » → « Comprendre : Assimiler des notions clés ». */
export function objectiveText(value: string | undefined): string | null {
  const text = (value ?? "")
    .split(/,\s*(?=[^\p{L}\d]*\p{Lu}[^,:]*:)/u)
    .map((p) => p.replace(/^[^\p{L}\d]+/u, "").trim())
    .filter(Boolean)
    .join(" ; ");
  return text || null;
}

async function activities({ imp, page, has }: CourseContext) {
  const refs = await select(imp, "import_ref", "source_id, target_id", {
    target_table: "resource",
    source: "notion",
  });
  for (const ref of refs) {
    const sourceId = String(ref.source_id);
    if (!/^[0-9a-f]{32}$/.test(sourceId) || !has(sourceId)) continue;
    const p = page(sourceId);
    const duration = parseMinutes(p.properties["Durée estimée"]);
    const type = (p.properties["Type"] ?? "").trim() || null;
    const when = frenchDateTimeRange(p.properties["Date et heure"]);
    const objective = objectiveText(p.properties["Objectifs pédagogiques"]);
    const state = prepStateOf(p.properties["État"]);
    if (!duration && !type && !when.start && !objective && !state) continue;
    const rows = await select(
      imp,
      "course_resource",
      "id, course_id, duration_minutes, activity_type, start_time, pedagogical_objective, prep_state",
      { resource_id: ref.target_id },
    );
    for (const row of rows) {
      const patch: Record<string, unknown> = {};
      if (duration && row.duration_minutes == null) patch.duration_minutes = duration;
      if (type && !row.activity_type) patch.activity_type = type;
      if (when.start && !row.start_time) patch.start_time = `${when.start.padStart(5, "0")}:00`;
      if (objective && !row.pedagogical_objective) patch.pedagogical_objective = objective;
      if (state && !row.prep_state) patch.prep_state = state;
      await complete(
        imp,
        "course_resource",
        String(row.id),
        patch,
        `« ${p.title.slice(0, 50)} » : ${Object.entries(patch)
          .map(([k, v]) => `${k} = ${String(v).slice(0, 40)}`)
          .join(", ")}`,
      );
    }
  }
}

// ── c) où rendre ───────────────────────────────────────────────────────────

/** Page Notion de l'évaluation (source_id) → endroit de dépôt sur Moodle. */
const WHERE_TO_SUBMIT: Record<string, string> = {
  "2df903c74f138032bae8eb758ec6583d":
    "Moodle — section « Séance TP », devoir « TP Audit qualité & accessibilité avec Opquast »",
  "2df903c74f1380509b9fceed2ba0308d":
    "Moodle — section « Séance finale », devoir « Corrections ciblées & restitution orale »",
  "2df903c74f1380c0aeaac5cd52d8c354":
    "Moodle — section « Séance finale », devoir « Évaluation individuelle - Correction ciblée »",
  "2a1903c74f1380c39171e9102acf370e":
    "Moodle — section « QCM INDIVIDUEL », quiz « QCM individuel Gestion de projet »",
};

async function whereToSubmit({ imp }: CourseContext) {
  for (const [sourceId, where] of Object.entries(WHERE_TO_SUBMIT)) {
    const id = await imp.findRef("notion", sourceId, "assessment");
    if (!id) continue;
    const [a] = await select(imp, "assessment", "id, title, where_to_submit", { id });
    if (!a || a.where_to_submit) continue;
    await complete(
      imp,
      "assessment",
      id,
      { where_to_submit: where },
      `« ${String(a.title).slice(0, 45)} » → ${where}`,
    );
  }
}

// ── d) attendus évalués ────────────────────────────────────────────────────

/**
 * Évaluation (source_id de sa page) → positions des attendus qu'elle vérifie, relues d'après les
 * critères de chaque grille. GP : 2 cadrage, 3 besoins, 4 acteurs, 5 faisabilité, 6 coûts,
 * 7 pilotage, 8 méthodes. B2 : 1 besoins utilisateurs, 2 parcours accessibles, 3 normes et outils,
 * 6 certification Opquast. M2 : attendus des journées (J2 : 6-10, J3 : 11-14, J4 : 15-18).
 */
const EVALUATED: {
  module: (m: Record<string, unknown>) => boolean;
  items: Record<string, number[]>;
}[] = [
  {
    module: (m) => m.ycode === "A2526_0172",
    items: {
      "2a0903c74f13807293dedb104fe83b41": [2, 3, 4, 5], // dossier de cadrage
      "2ae903c74f1380359315ccf7a94b28be": [7, 8], // spécifications et choix méthodologiques
      "2a1903c74f13803aaf6fecba8e919869": [3, 6, 7], // oral
    },
  },
  {
    module: (m) => m.ycode === "A2526_0121",
    items: {
      "2df903c74f138032bae8eb758ec6583d": [3, 6], // TP audit Opquast
      "2df903c74f1380c0aeaac5cd52d8c354": [1, 2, 3], // écrit individuel
      "2df903c74f1380509b9fceed2ba0308d": [2, 3], // corrections ciblées et oral
    },
  },
  {
    module: (m) => /^Accessibilité & Qualité Web/.test(String(m.name)) && Number(m.year) === 2024,
    items: {
      "205903c74f138057811de45de450d0a8": [6, 7, 8, 9, 10, 11, 12, 13, 14], // projet fil rouge (structure, composants, CI)
      "20b903c74f13808fb1c8c760de9436b7": [15, 16, 17], // oral
      "204903c74f1380229331e64ee2de455a": [18], // QCM final
    },
  },
];

async function evaluated({ imp }: CourseContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  for (const ref of refs) {
    const [mod] = await select(imp, "module", "id, name, year, ycode", { id: ref.target_id });
    const plan = mod && EVALUATED.find((e) => e.module(mod));
    if (!mod || !plan) continue;
    const expectations = await select(imp, "module_expectation", "id, label, position", {
      module_id: mod.id,
    });
    for (const [sourceId, positions] of Object.entries(plan.items)) {
      const assessmentId = await imp.findRef("notion", sourceId, "assessment");
      if (!assessmentId) continue;
      const [a] = await select(imp, "assessment", "id, title", { id: assessmentId });
      const existing = await select(imp, "assessment_expectation", "module_expectation_id", {
        assessment_id: assessmentId,
      });
      for (const pos of positions) {
        const e = expectations.find((x) => Number(x.position) === pos);
        if (!e) {
          imp.warnings.push(
            `${String(mod.name)} : attendu ${pos} introuvable (ignoré pour « ${String(a?.title)} »).`,
          );
          continue;
        }
        if (existing.some((x) => x.module_expectation_id === e.id)) continue;
        await imp.link(
          "assessment_expectation",
          { assessment_id: assessmentId, module_expectation_id: e.id },
          "assessment_id,module_expectation_id",
          `${String(mod.name)} (${String(mod.year)}) › « ${String(a?.title).slice(0, 40)} » évalue l'attendu ${pos} « ${String(e.label).slice(0, 50)} »`,
        );
      }
    }
  }
}

export async function migrate(ctx: CourseContext): Promise<void> {
  await slides(ctx);
  await activities(ctx);
  await whereToSubmit(ctx);
  await evaluated(ctx);
  ctx.imp.warnings.push(
    "Slides : seules les journées du M2 ont un lien Notion (Figma) ; GP : PDF déposés comme documents du module ; B2 : aucun lien. Déroulé : seules les activités devenues ressources portent durée / type / objectif / état (les courtes sont dans le texte de la séance). Où rendre : seulement ce que Moodle documente (B2, QCM GP) ; M2 et projets GP : pas d'information. Attendus évalués : rattachements relus à la main, à valider.",
  );
}
