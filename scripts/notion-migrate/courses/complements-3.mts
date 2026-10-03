// Compléments 3 (refonte du 02/10/2026) : conventions de stockage et nouvelles tables.
//  · brief du projet GP en sections (`## Titre`) ; contexte client = organigramme ;
//  · attendus détaillés des grilles GP sous `### Attendus` (liste) ;
//  · imprévus du client (`project_surprise`) tirés des 2 mails SantaConnect ;
//  · livrable de chaque séance GP (`course_plan.deliverable`) ;
//  · appréciations pour Hyperplanning (`appreciation`, limite 250 car., GP et M2) ;
//  · liens de rendu des groupes M2 (`submission_item`).
// Idempotent, ne complète que ce qui est resté tel que l'import l'a posé.
import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { Importer } from "../lib/importer.mts";
import { stripLocalImages, type NotionPage } from "../lib/notion.mts";
import { headingSections } from "../lib/parsers.mts";

import { complete, GP_SESSIONS, select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const GP_COURSE = "29f903c74f1380d6a310f9e4bff4329a";
const M2_COURSE = "204903c74f1380a8a04be38f4fb2ce7c";
const GP_BRIEF = "29f903c74f1380e8bf8ec604ae95d06c";
const GP_MAILS = "29f903c74f1380fc8f32c4c2cb0b9174";
const GP_ORGANIGRAMME = "2a3903c74f13800b8111cdab4bb8dcdc";
const GP_GRIDS = [
  "2ae903c74f13803c97e5e8ee19d9b46a",
  "2ae903c74f1380768d39e198d7847ebd",
  "2ae903c74f138023bbcbfbf092ac25c0",
];
const M2_PROJECT_ASSESSMENT = "205903c74f138057811de45de450d0a8";
/** Limite par défaut d'une appréciation (réglable par école dans `school_setting`). */
const APPRECIATION_MAX = 250;

const bodyOf = (p: NotionPage) => stripLocalImages(p.body).body;
const plain = (s: string) =>
  s
    .replace(/\*\*/g, "")
    .replace(/^[^\p{L}\d]+/u, "")
    .replace(/\s+/g, " ")
    .trim();

// ── Brief en sections ──────────────────────────────────────────────────────

/** Titre Notion du brief → titre de section de l'application. */
const SECTION_TITLES: [RegExp, string][] = [
  [/^contexte/i, "Contexte"],
  [/^demande/i, "Demande"],
  [/^quelques éléments/i, "Contraintes"],
  [/^votre mission/i, "Objectifs"],
  [/^phases du projet/i, "Phases du projet"],
  [/^règles du jeu/i, "Règles du jeu"],
  [/^état d.esprit/i, "État d'esprit attendu"],
  [/^citation/i, "Citation du client"],
];

/** Brief Notion (`## Titre` + `### Sections`) → Markdown en sections `## Titre`. */
export function briefSections(body: string): string {
  const parts = body.split(/^### /m);
  const intro = parts[0]
    .replace(/^## (.+)$/m, "**$1**")
    .replace(/\n---\s*$/, "")
    .trim();
  const seen = new Set<string>();
  const sections = parts.slice(1).map((part) => {
    const [head, ...rest] = part.split("\n");
    let title = plain(head);
    const mapped = SECTION_TITLES.find(([re]) => re.test(title));
    if (mapped) title = mapped[1];
    // « Livrables attendus » figure deux fois : récit puis tableau des formats.
    if (/^livrables/i.test(title))
      title = seen.has("Livrables attendus") ? "Livrables" : "Livrables attendus";
    seen.add(title);
    const text = rest
      .join("\n")
      .replace(/^---\s*$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return `## ${title}\n\n${text}`;
  });
  return [intro, ...sections].filter(Boolean).join("\n\n");
}

async function gpBrief({ imp, page }: CourseContext) {
  const brief = page(GP_BRIEF);
  const projectId = await imp.findRef("notion", `${brief.id}#projet`, "module_project");
  if (!projectId) return null;
  const [row] = await select(imp, "module_project", "id, brief_md, client_context_md", {
    id: projectId,
  });
  if (!row) return projectId;
  const next = briefSections(bodyOf(brief));
  if (row.brief_md === bodyOf(brief) && next !== row.brief_md)
    await complete(
      imp,
      "module_project",
      projectId,
      { brief_md: next },
      `Brief SantaConnect en sections (${next.match(/^## /gm)?.length ?? 0} sections : ${(next.match(/^## (.+)$/gm) ?? []).map((t) => t.slice(3)).join(" · ")})`,
    );

  // Le contexte client contenait la page « Mails client » entière (avec les notes pédagogiques
  // de l'intervenante) : les mails deviennent des imprévus, le contexte devient l'organigramme.
  const mails = page(GP_MAILS);
  const org = page(GP_ORGANIGRAMME);
  if (row.client_context_md === `## ${mails.title}\n\n${bodyOf(mails)}`)
    await complete(
      imp,
      "module_project",
      projectId,
      { client_context_md: `## ${org.title}\n\n${bodyOf(org)}` },
      `Contexte client SantaConnect : « ${mails.title} » remplacé par « ${org.title} » (${bodyOf(org).length} car.)`,
    );
  return projectId;
}

// ── Attendus des grilles GP ────────────────────────────────────────────────

/** Virgules hors parenthèses : « a (b, c), d » → [« a (b, c) », « d »]. */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

export function attendus(description: string): string {
  const lines = description
    .split("\n")
    .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);
  const items =
    lines.length > 1 ? lines : splitTopLevel(lines[0] ?? "").map((i) => i.replace(/\.$/, ""));
  const cap = (s: string) => s.charAt(0).toLocaleUpperCase("fr") + s.slice(1);
  return `### Attendus\n\n${items.map((i) => `- ${cap(i)}`).join("\n")}`;
}

async function gpGrids({ imp, page }: CourseContext) {
  for (const gridPage of GP_GRIDS) {
    const gridId = await imp.findRef("notion", gridPage, "grading_grid");
    if (!gridId) continue;
    const rows = (
      await select(imp, "grid_criterion", "id, label, description, position", {
        grading_grid_id: gridId,
      })
    ).sort((a, b) => Number(a.position) - Number(b.position));
    // Description d'origine = colonne « attendus » du tableau Notion, relue telle quelle.
    const source = page(gridPage).body;
    for (const r of rows) {
      const description = String(r.description ?? "");
      if (!description || description.startsWith("### Attendus")) continue;
      if (!source.includes(description.split("\n")[0].slice(0, 40))) continue; // retouchée : on n'y touche pas
      await complete(
        imp,
        "grid_criterion",
        String(r.id),
        { description: attendus(description) },
        `${String(r.label)} : attendus en liste (${attendus(description).split("\n- ").length - 1} puces)`,
      );
    }
  }
}

// ── Imprévus du client ─────────────────────────────────────────────────────

async function gpSurprises({ imp, page }: CourseContext, projectId: string | null) {
  if (!projectId) return;
  const mails = page(GP_MAILS);
  const parts = bodyOf(mails).split(/^## 💌 Mail #(\d+) – .*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    const block = parts[i + 1];
    const subject = /\*\*Objet :\*\*\s*(.+)/.exec(block)?.[1]?.trim() ?? `Mail #${n}`;
    const title = subject.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
    // Message à copier : la citation du mail ; les notes « Effet pédagogique » restent à l'intervenante.
    const message = block
      .split(/^🎯/m)[0]
      .split("\n")
      .filter((l) => /^>/.test(l))
      .map((l) => l.replace(/^(?:>\s?)+/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const courseId = await imp.findRef("notion", GP_SESSIONS[n - 1], "course");
    await imp.ensure(
      "project_surprise",
      "notion",
      `${mails.id}#imprevu-${n}`,
      { project_id: projectId, course_id: courseId, title: title, body: message },
      `Imprévu #${n} après la séance ${n} : « ${title} » (${message.length} car.)`,
    );
  }
}

// ── Livrable de séance (GP) ────────────────────────────────────────────────

async function gpDeliverables({ imp, page, has }: CourseContext) {
  for (const [i, id] of GP_SESSIONS.entries()) {
    if (!has(id)) continue;
    const raw = (headingSections(page(id).body).get("livrable") ?? "").trim();
    // Un livrable d'une ligne n'a pas besoin de puce ni d'italique.
    const deliverable = raw.includes("\n")
      ? raw
      : raw.replace(/^[-*]\s+/, "").replace(/^\*(.+)\*$/, "$1");
    const courseId = await imp.findRef("notion", id, "course");
    if (!courseId || !deliverable.trim()) continue;
    await imp.ensure(
      "course_plan",
      "notion",
      `${id}#plan`,
      { course_id: courseId, deliverable: deliverable.trim() },
      `Séance ${i + 1} : livrable « ${deliverable.trim().replace(/\s+/g, " ").slice(0, 70)} »`,
    );
  }
}

// ── Appréciations (Hyperplanning) ──────────────────────────────────────────

async function appreciations({ imp, page }: CourseContext, coursePage: string, label: string) {
  const dir = join(page(coursePage).path.replace(/ [0-9a-f]{32}\.md$/, ""), "Étudiant·es");
  let tooLong = 0;
  let count = 0;
  for (const f of readdirSync(dir).filter((x) => /[0-9a-f]{32}\.md$/.test(x))) {
    const p = page(/([0-9a-f]{32})\.md$/.exec(f)![1]);
    const text = (p.properties["Appréciation étudiant.e"] ?? "").replace(/<br>/g, "\n").trim();
    if (!text) continue;
    const studentId = await imp.findRef("notion", p.id, "student");
    if (!studentId) continue;
    // Module : celui du groupe du projet de l'étudiant·e (une seule inscription par cours importé).
    const members = await select(imp, "group_member", "student_group_id", {
      student_id: studentId,
    });
    const [group] = members.length
      ? await select(imp, "student_group", "module_id", { id: members[0].student_group_id })
      : [];
    if (!group) continue;
    if (text.length > APPRECIATION_MAX) {
      tooLong++;
      continue;
    }
    count++;
    await imp.ensure(
      "appreciation",
      "notion",
      `${p.id}#appreciation`,
      { module_id: group.module_id, student_id: studentId, text },
      `${label} › ${p.title.split(" ")[0].charAt(0)}. : ${text.length} car.`,
    );
  }
  if (tooLong)
    imp.warnings.push(
      `${label} : ${tooLong} appréciation(s) de plus de ${APPRECIATION_MAX} caractères non importées (relevez la limite de l'école ou raccourcissez-les).`,
    );
  if (!count) imp.warnings.push(`${label} : aucune appréciation importable.`);
}

// ── Liens de rendu des groupes M2 ──────────────────────────────────────────

async function m2Submissions({ imp, page }: CourseContext) {
  const assessmentId = await imp.findRef("notion", M2_PROJECT_ASSESSMENT, "assessment");
  if (!assessmentId) return;
  const dir = join(
    page(M2_COURSE).path.replace(/ [0-9a-f]{32}\.md$/, ""),
    "Groupes projet fil rouge",
  );
  const KINDS: [string, string][] = [
    ["URL Repo", "Dépôt"],
    ["URL Déployée", "Site déployé"],
    ["URL Kanban", "Kanban"],
    ["URL Maquettes", "Maquettes"],
    ["URL Doc", "Documentation"],
  ];
  for (const f of readdirSync(dir).filter((x) => /[0-9a-f]{32}\.md$/.test(x))) {
    const g = page(/([0-9a-f]{32})\.md$/.exec(f)![1]);
    const groupId = await imp.findRef("notion", g.id, "student_group");
    if (!groupId) continue;
    for (const [key, name] of KINDS) {
      const url = (g.properties[key] ?? "").trim();
      if (!/^https?:\/\//.test(url)) continue;
      await imp.ensure(
        "submission_item",
        "notion",
        `${g.id}#rendu-${key}`,
        {
          assessment_id: assessmentId,
          group_id: groupId,
          kind: "link",
          url,
          label: name,
          added_by: "teacher",
        },
        `${g.title} › ${name}`,
      );
    }
  }
}

// ── Modules terminés (« Terminé » distinct de « Rangé », refonte du 01/11) ────

/** Modules importés, rangés et sans `finished_at` : terminés à leur dernière séance. */
async function finishedModules({ imp }: CourseContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  for (const ref of refs) {
    const [m] = await select(imp, "module", "id, name, year, end_date, archived_at, finished_at", {
      id: ref.target_id,
    });
    if (!m || m.finished_at || !m.archived_at || !m.end_date) continue;
    await complete(
      imp,
      "module",
      String(m.id),
      { finished_at: `${String(m.end_date)}T18:00:00+02:00` },
      `${String(m.name)} (${String(m.year)}) : terminé le ${String(m.end_date)}`,
    );
  }
}

export async function migrate(ctx: CourseContext): Promise<void> {
  await finishedModules(ctx);
  const projectId = await gpBrief(ctx);
  await gpGrids(ctx);
  await gpSurprises(ctx, projectId);
  await gpDeliverables(ctx);
  await appreciations(ctx, GP_COURSE, "Gestion de projet");
  await appreciations(ctx, M2_COURSE, "M2 Accessibilité");
  await m2Submissions(ctx);
  ctx.imp.warnings.push(
    "Non importés faute de source : dates d'envoi / de paiement des factures, « ce que je retiens » des modules, attendus de l'école et attendus ajoutés à la main (origin custom), règles par école.",
    "Imprévus GP : date d'envoi vide (module archivé) ; à renseigner si le rappel « Aujourd'hui » doit s'éteindre.",
  );
}
