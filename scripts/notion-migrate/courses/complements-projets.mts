// Compléments 2 : projet fil rouge en jalons (US-88), thèmes du projet (US-89), sujets liés aux
// séances (US-90). Passe idempotente : ne complète que ce qui est vide.
import type { Importer } from "../lib/importer.mts";
import { stripLocalImages, type NotionPage } from "../lib/notion.mts";

import { complete, GP_SESSIONS, select } from "./complements-fonctions.mts";

export interface ProjectContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  /** Séances du M2 (ids des pages « Jour N »), dans l'ordre. */
  m2Days: string[];
  /** Id de la séance B2 n (source `<PROGRESSION>#seance-n`). */
  b2Session: (n: number) => string;
}

interface AssessmentPlan {
  /** Id de la page Notion du sujet = source_id de l'évaluation. */
  page: string;
  role: "milestone" | "oral" | "individual" | null;
  position: number | null;
  /** Source (`notion`) de la séance de rattachement. */
  course: string;
  label: string;
}

async function plan(
  ctx: ProjectContext,
  project: { pageId: string; title: string; brief: string; client: string } | null,
  assessments: AssessmentPlan[],
) {
  const { imp } = ctx;
  let projectId: string | null = null;
  let moduleId: string | null = null;

  const rows = new Map<string, Record<string, unknown>>();
  for (const a of assessments) {
    const id = await imp.findRef("notion", a.page, "assessment");
    if (!id) {
      imp.warnings.push(`« ${a.label} » : évaluation pas encore importée (ignorée).`);
      continue;
    }
    const [row] = await select(
      imp,
      "assessment",
      "id, module_id, project_id, project_role, project_position, course_id, prep_status",
      { id },
    );
    if (row) {
      rows.set(a.page, row);
      moduleId ??= String(row.module_id);
    }
  }
  if (!moduleId) return { projectId, moduleId };

  if (project)
    projectId = await imp.ensure(
      "module_project",
      "notion",
      `${project.pageId}#projet`,
      {
        module_id: moduleId,
        title: project.title,
        brief_md: project.brief,
        client_context_md: project.client,
      },
      `Projet « ${project.title} » (brief ${project.brief.length} car., contexte client ${project.client.length} car.)`,
    );

  for (const a of assessments) {
    const row = rows.get(a.page);
    if (!row) continue;
    const patch: Record<string, unknown> = {};
    if (project && !row.project_id && projectId && !imp.isDry(projectId)) {
      patch.project_id = projectId;
      patch.project_role = a.role;
      patch.project_position = a.position;
    }
    const courseId = await imp.findRef("notion", a.course, "course");
    if (courseId && !row.course_id) patch.course_id = courseId;
    if (row.prep_status === "to_build") patch.prep_status = "provided";
    const wants = [
      project && !row.project_id ? `projet (${a.role})` : "",
      courseId && !row.course_id ? "séance" : "",
      row.prep_status === "to_build" ? "fourni" : "",
    ].filter(Boolean);
    if (!wants.length) continue;
    if (!Object.keys(patch).length) {
      imp.report.push({
        table: "assessment",
        action: "compléter",
        label: `${a.label} → ${wants.join(", ")}`,
      });
      continue;
    }
    await complete(imp, "assessment", String(row.id), patch, `${a.label} → ${wants.join(", ")}`);
  }
  return { projectId, moduleId };
}

const bodyOf = (p: NotionPage) => stripLocalImages(p.body).body;

export async function runProjectComplements(ctx: ProjectContext) {
  const { imp, page } = ctx;

  // ── B2 : pas de projet fil rouge (TP audit, écrit individuel, oral) ────────
  await plan(ctx, null, [
    {
      page: "2df903c74f138032bae8eb758ec6583d",
      role: null,
      position: null,
      course: ctx.b2Session(2),
      label: "B2 › TP audit",
    },
    {
      page: "2df903c74f1380c0aeaac5cd52d8c354",
      role: null,
      position: null,
      course: ctx.b2Session(4),
      label: "B2 › écrit individuel",
    },
    {
      page: "2df903c74f1380509b9fceed2ba0308d",
      role: null,
      position: null,
      course: ctx.b2Session(4),
      label: "B2 › oral",
    },
  ]);

  // ── Gestion de projet : appel d'offres SantaConnect ────────────────────────
  const brief = page("29f903c74f1380e8bf8ec604ae95d06c");
  const mails = page("29f903c74f1380fc8f32c4c2cb0b9174");
  await plan(
    ctx,
    {
      pageId: brief.id,
      title: "Appel d'offres SantaConnect",
      brief: bodyOf(brief),
      client: `## ${mails.title}\n\n${bodyOf(mails)}`,
    },
    [
      {
        page: "2a0903c74f13807293dedb104fe83b41",
        role: "milestone",
        position: 1,
        course: GP_SESSIONS[2],
        label: "GP › dossier de cadrage",
      },
      {
        page: "2ae903c74f1380359315ccf7a94b28be",
        role: "milestone",
        position: 2,
        course: GP_SESSIONS[4],
        label: "GP › spécifications",
      },
      {
        page: "2a1903c74f13803aaf6fecba8e919869",
        role: "oral",
        position: 3,
        course: GP_SESSIONS[6],
        label: "GP › oral",
      },
      {
        page: "2a1903c74f1380c39171e9102acf370e",
        role: "individual",
        position: 4,
        course: GP_SESSIONS[7],
        label: "GP › QCM",
      },
    ],
  );

  // ── M2 : projet fil rouge, thèmes, affectation des groupes ─────────────────
  const projectPage = page("205903c74f138057811de45de450d0a8");
  const cut = projectPage.body.search(/^## 🧱 Attendus/m);
  const m2Brief = stripLocalImages(
    cut > 0 ? projectPage.body.slice(0, cut) : projectPage.body,
  ).body.trim();
  const { projectId, moduleId } = await plan(
    ctx,
    {
      pageId: projectPage.id,
      title: "Projet fil rouge — site accessible",
      brief: m2Brief,
      client: "",
    },
    [
      {
        page: projectPage.id,
        role: "milestone",
        position: 1,
        course: ctx.m2Days[3],
        label: "M2 › projet fil rouge",
      },
      {
        page: "20b903c74f13808fb1c8c760de9436b7",
        role: "oral",
        position: 2,
        course: ctx.m2Days[3],
        label: "M2 › oral",
      },
      {
        page: "204903c74f1380229331e64ee2de455a",
        role: "individual",
        position: 3,
        course: ctx.m2Days[3],
        label: "M2 › QCM",
      },
    ],
  );

  const THEMES = [
    { id: "205903c74f1380db994bef8c73ebe998", key: "justifacile" },
    { id: "205903c74f1380b5baf2ef5e69fcea86", key: "climactif" },
    { id: "205903c74f13808885bbf5533d6f4d0f", key: "assurlibre" },
  ];
  const themeIds = new Map<string, string>();
  for (const [i, t] of THEMES.entries()) {
    const p = page(t.id);
    if (!projectId) break;
    themeIds.set(
      t.key,
      await imp.ensure(
        "project_theme",
        "notion",
        `${t.id}#theme`,
        { project_id: projectId, title: p.title, description_md: bodyOf(p), position: i },
        `Thème « ${p.title} » (${bodyOf(p).length} car.)`,
      ),
    );
  }

  if (projectId && moduleId) {
    const groups = await select(imp, "student_group", "id, name", { module_id: moduleId });
    const chosen = new Map<string, string>(); // « Groupe 1 » → thème
    for (const g of groups) {
      const n = /(\d+)/.exec(String(g.name))?.[1];
      if (!n) continue;
      const src = await select(imp, "import_ref", "source_id", {
        target_table: "student_group",
        target_id: g.id,
      });
      const gp = src[0] ? page(String(src[0].source_id)) : null;
      const label = (gp?.properties["Briefs projets"] ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");
      const key = THEMES.find((t) => label.includes(t.key))?.key;
      if (!key) {
        imp.warnings.push(`${String(g.name)} : aucun thème dans Notion.`);
        continue;
      }
      chosen.set(String(g.name), key);
      await imp.link(
        "project_theme_assignment",
        {
          project_id: projectId,
          student_group_id: g.id,
          theme_id: themeIds.get(key),
          method: "volunteer",
        },
        "project_id,student_group_id",
        `${String(g.name)} → thème ${key}`,
      );
    }
  }

  imp.warnings.push(
    "Objectif / rendu attendu / « ce qui sera évalué » (US-90) non renseignés : déjà présents dans le texte du sujet, à ne pas dédoubler.",
    "B2 : pas de projet fil rouge (TP audit, écrit individuel, oral) : évaluations liées aux séances seulement.",
    "Ressources « Brief — … » (M2) et brief / mails client (GP) conservées en plus des thèmes / du projet.",
  );
}
