// Cours 3 — Ynov Mastère 2 « Accessibilité & Qualité Web » (année 2024-25), juin–juillet 2025.
// Cours fait principalement dans Notion (décision PO du 28/09 : pas de sauvegarde Moodle).
// Sources : export Notion (activités, ressources, projet fil rouge, grilles, corrections,
// étudiant·es, groupes), progression envoyée (PDF), résultats du QCM Moodle (CSV), export HTML
// de la banque de questions, facture 25-08-3.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  ALL_ADMIN_DOCS_DONE,
  completeAdminDocs,
  importModuleDocument,
  importResourceImages,
  splitNotionName,
  type ResourceKind,
} from "../lib/helpers.mts";
import type { Importer } from "../lib/importer.mts";
import { xhtmlQuestionBankMarkdown } from "../lib/moodle-questions.mts";
import { cleanInline, linkedIds, stripLocalImages, type NotionPage } from "../lib/notion.mts";
import {
  frenchDateTimeRange,
  parseCsv,
  parsePdfProgression,
  parseRubricTables,
  parseScore,
} from "../lib/parsers.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  csv: (databaseId: string) => string;
  has: (id: string) => boolean;
  outlinePdf: string | null;
  invoicePdf: string | null;
  /** Résultats du QCM Moodle (CSV « Évaluation individuelle – notes »). */
  gradesFile: string | null;
}

const COURSE_PAGE = "204903c74f1380a8a04be38f4fb2ce7c";
const SCHOOL_SIRET = "80442673200033"; // Nantes Ynov Campus
const SUBJECT = "Accessibilité";
/** Export HTML de la banque de questions du QCM (hors dépôt). */
const QUESTIONS_HTML = join(homedir(), "Bureau/exports/moodle/m2-questions.html");
const MOODLE_COURSE = "nantesynovcampus2024devwebmast2m2s2-elective2";

/** Journées (pages « Jour N ») : dates de la facture 25-08-3 (7 h chacune). */
const DAYS = [
  { id: "204903c74f138025871bd1100069c76b", date: "2025-06-11", type: "lecture" },
  { id: "204903c74f1380629f20e21670da0be7", date: "2025-06-30", type: "applied" },
  { id: "204903c74f13809a8b11cda6ad3fcaf5", date: "2025-07-01", type: "workshop" },
  { id: "204903c74f1380f6b89ccfc801e087ed", date: "2025-07-08", type: "assessment" },
];

/**
 * Activités de chaque journée (base Notion consultée le 23/09) : les pages déplacées dans la
 * bibliothèque n'apparaissent plus dans les relations de l'export.
 */
const DAY_ACTIVITIES: Record<number, string[]> = {
  1: [
    "205903c74f13806ab389ee0a21054e25", // Cartes Latitudes
    "20d903c74f1380aa8eccce3fdc8b7856", // Introduction au numérique responsable
    "205903c74f13806e91a8fbb545b11a45", // Théorie de l'accessibilité
    "205903c74f13800cac5be81417b9d428", // RGAA 10 points
    "205903c74f13806d8aa5f66236d030ce", // Outils de tests
    "205903c74f1380e0a64ce85c2c292c5e", // Atelier flashcards
    "205903c74f138052a56cf68aba60635d", // Contrastes
    "205903c74f1380a8a968ea18b62f9463", // Images alt
    "205903c74f1380a8bdd6f917b240d024", // Lancement du projet fil rouge
    "205903c74f13800eb324d0c743fbdbfd", // Sprint 1
  ],
  2: [
    "205903c74f13808cb74fff9f514e126d", // Titres
    "205903c74f13800bb452e59367b36b64", // Structuration
    "205903c74f1380229a85d2d1db3aa7fd", // Skip links
    "205903c74f1380418ec7cd15da7b3f2b", // Focus outline
    "205903c74f13800bb045c92f6abaa289", // Liens
    "205903c74f13805fa1f9cd292cbf3753", // ARIA
    "205903c74f13803e85b6d0ba28ffcd17", // Cache-cache CSS
    "205903c74f138013a363d8d44d866d10", // Onglets
    "205903c74f138016852acf953848f245", // Modale
    "20f903c74f13806bbe2fe6d1ab3370b5", // Focus CI
    "205903c74f1380eca71de1a66b6be17c", // Sprint 2
  ],
  3: [
    "221903c74f1380e2b19ae736df6505c5", // Étiquette, nom visible et nom accessible
    "221903c74f1380d18bb0ec5e4e1c585d", // Groupements
    "221903c74f1380ccb65dd32f1c37f185", // Boutons de soumission
    "221903c74f1380c18b66e806a1c2d9ac", // Contrôle de saisie
    "205903c74f1380c29932d077abd860fd", // Focus composant barre de recherche
    "205903c74f13809db5b5e0d9c0b82049", // Sprint 3
  ],
  4: [
    "205903c74f1380bbba9dcb6cd7e5eb74", // Oral du projet
    "205903c74f1380fb9ea5f206d0645ee6", // QCM final
  ],
};
/** Type des nouvelles ressources issues des activités (les autres sont déjà classées). */
const ACTIVITY_KINDS: Record<string, ResourceKind> = {
  "205903c74f1380e0a64ce85c2c292c5e": "workshop",
};
const MIN_RESOURCE_CHARS = 800;

const RESOURCES_DB = "20c903c74f1380918d8adc86c0dce76b";
const NR_REFERENCES = /shift project|ledger of harms/i;
const BRIEFS = [
  "205903c74f1380db994bef8c73ebe998",
  "205903c74f1380b5baf2ef5e69fcea86",
  "205903c74f13808885bbf5533d6f4d0f",
];

const PROJECT = {
  page: "205903c74f138057811de45de450d0a8",
  grid: "20b903c74f1380ae91e6fef0882cee74",
};
const ORAL = {
  subject: "20b903c74f13808fb1c8c760de9436b7", // consignes de l'oral
  grid: "20b903c74f1380578ec0dafe83f10435", // grille de soutenance /20
};
const QCM = { page: "204903c74f1380229331e64ee2de455a" };

export async function migrate(ctx: CourseContext): Promise<void> {
  const { imp, page } = ctx;
  const imageIssues: string[] = [];
  let droppedImages = 0;

  // ── Module ───────────────────────────────────────────────────────────────
  const { data: school } = await imp.sb
    .from("school")
    .select("id, name")
    .eq("owner_id", imp.ownerId)
    .eq("siret", SCHOOL_SIRET)
    .maybeSingle();
  if (!school) imp.warnings.push("École Nantes Ynov Campus introuvable : module créé sans école.");

  const dayPages = DAYS.map((d) => page(d.id));
  const slidesUrl =
    dayPages.map((p) => p.properties["Slides"]).find((u) => /^https?:/.test(u ?? "")) ?? null;
  const moduleId = await imp.ensure(
    "module",
    "moodle",
    `course:${MOODLE_COURSE}`,
    {
      school_id: school?.id ?? null,
      name: "Accessibilité & Qualité Web",
      level: "Mastère 2 (DEVWEB, DEVLMIOT)",
      year: 2024,
      ycode: null,
      total_hours: 28,
      start_date: DAYS[0].date,
      first_session_date: DAYS[0].date,
      end_date: DAYS[3].date,
      hourly_rate: 60,
      iceberg_state: "paid",
      admin_docs: ALL_ADMIN_DOCS_DONE,
      slides_url: slidesUrl,
      archived_at: new Date().toISOString(),
    },
    `Accessibilité & Qualité Web — M2 — 2024-25 (YCODE inconnu, 28 h, 60 €/h, payé, archivé) — école : ${school?.name ?? "aucune"}${slidesUrl ? " — slides Figma" : ""}`,
  );
  await completeAdminDocs(imp, moduleId, "M2 Accessibilité");
  imp.warnings.push(
    "YCODE du module inconnu (pas de sauvegarde Moodle) : à renseigner dans l'app.",
  );

  // ── Ressources ───────────────────────────────────────────────────────────
  const resourceIds = new Map<string, string>();
  const ensureResource = async (
    sourceId: string,
    row: {
      title: string;
      content?: string | null;
      url?: string | null;
      description?: string | null;
      category: string;
      tags?: string[];
      kind: ResourceKind;
      audience: "students" | "teacher";
    },
    label: string,
    p?: NotionPage,
  ) => {
    const known = resourceIds.get(sourceId);
    if (known) return known;
    const [source, id] = sourceId.startsWith("moodle:")
      ? (["moodle", sourceId.slice(7)] as const)
      : (["notion", sourceId] as const);
    const resourceId = await imp.ensure("resource", source, id, { tags: [], ...row }, label);
    resourceIds.set(sourceId, resourceId);
    if (p) await importResourceImages(imp, resourceId, p, imageIssues);
    return resourceId;
  };

  // ── Séances (progression PDF + déroulé des activités Notion) ─────────────
  const progression = ctx.outlinePdf
    ? parsePdfProgression(
        execFileSync("pdftotext", ["-layout", ctx.outlinePdf, "-"], { encoding: "utf8" }),
      )
    : [];
  if (progression.length !== 4)
    throw new Error(`Progression PDF : 4 journées attendues, ${progression.length} lues`);

  const courseIds = new Map<number, string>();
  const links: { day: number; resourceId: string; label: string }[] = [];
  const activityDay = new Map<string, number>();

  for (const [i, d] of DAYS.entries()) {
    const n = i + 1;
    const prog = progression[i];
    const deroule: { at: string; line: string }[] = [];
    for (const id of DAY_ACTIVITIES[n]) {
      activityDay.set(id, n);
      if (!ctx.has(id)) {
        imp.warnings.push(`Jour ${n} : activité ${id} absente de l'export (ignorée).`);
        continue;
      }
      const p = page(id);
      const when = frenchDateTimeRange(p.properties["Date et heure"]);
      deroule.push({
        at: (when.start ?? "99:99").padStart(5, "0"),
        line: `- ${when.start && when.end ? `${when.start}–${when.end} · ` : ""}${p.title}`,
      });
      if (p.body.length < MIN_RESOURCE_CHARS) continue;
      const resourceId = await ensureResource(
        p.id,
        {
          title: p.title,
          content: p.body,
          category: /numérique responsable/i.test(p.title) ? "Numérique responsable" : SUBJECT,
          kind: ACTIVITY_KINDS[p.id] ?? "course",
          audience: "students",
        },
        `${p.title} (${p.body.length} car.)`,
        p,
      );
      links.push({ day: n, resourceId, label: p.title });
    }
    const animation = [
      prog.animation,
      deroule.length &&
        `**Déroulé**\n${deroule
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((d) => d.line)
          .join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    courseIds.set(
      n,
      await imp.ensure(
        "course",
        "notion",
        d.id,
        {
          module_id: moduleId,
          title: prog.title,
          position: n,
          session_date: d.date,
          type: d.type,
          learning_objectives: prog.objectives,
          animation_notes: animation.slice(0, 4000) || null,
          assessment_notes: prog.assessment || null,
          material: prog.material || null,
          prep_status: "ready",
        },
        `Jour ${n} — ${d.date} (7 h) — ${prog.title} (${prog.objectives.length} objectifs, ${deroule.length} activités)`,
      ),
    );
    if (animation.length > 4000) imp.warnings.push(`Jour ${n} : animation tronquée à 4 000 car.`);
  }

  // Base « Ressources » : références externes (doublons d'URL et paires Chrome / Firefox fusionnés).
  const courseDir = page(COURSE_PAGE).path.replace(/ [0-9a-f]{32}\.md$/, "");
  const pagesIn = (dir: string, pattern = /^(.*) ([0-9a-f]{32})\.md$/) =>
    readdirSync(join(courseDir, dir))
      .map((f) => pattern.exec(f))
      .filter((m) => m !== null)
      .map((m) => page(m[2]));
  const refPageIds = new Map(pagesIn("Ressources").map((p) => [p.title, p.id]));
  const stem = (t: string) =>
    cleanInline(t)
      .replace(/®/g, "")
      .replace(/\s*[-–(]\s*(Chrome|Firefox)\)?\s*$/i, "")
      .trim();
  const merged = new Map<string, Record<string, string>[]>();
  const seenUrls = new Set<string>();
  for (const r of parseCsv(readFileSync(ctx.csv(RESOURCES_DB), "utf8"))) {
    const url = (r["Lien"] ?? "").trim();
    if (url && seenUrls.has(url)) {
      imp.warnings.push(`Référence en double (même lien) ignorée : ${cleanInline(r["Nom"])}`);
      continue;
    }
    if (url) seenUrls.add(url);
    const key = stem(r["Nom"]);
    merged.set(key, [...(merged.get(key) ?? []), r]);
  }
  let unlinkedRefs = 0;
  for (const [title, rows] of merged) {
    const first = rows[0];
    const url = (first["Lien"] ?? "").trim() || null;
    const notionId = refPageIds.get(cleanInline(first["Nom"]));
    // Même lien déjà importé depuis Moodle avec le B2 → ressource réutilisée.
    const b2 = url ? await imp.findRef("moodle", `url:${url}`, "resource") : null;
    const tags = [
      ...new Set(
        [...(first["Types"] ?? "").split(","), first["Catégorie"] ?? ""]
          .map((t) => cleanInline(t).replace(/^📚\s*/, ""))
          .filter(Boolean),
      ),
    ];
    const browsers =
      rows.length > 1
        ? rows
            .map(
              (r) =>
                `- ${/firefox|mozilla/i.test(`${r["Nom"]} ${r["Lien"]}`) ? "Firefox" : "Chrome"} : ${r["Lien"]}`,
            )
            .join("\n")
        : null;
    let resourceId: string;
    if (b2) {
      resourceId = b2;
      imp.report.push({
        table: "resource",
        action: "déjà importé",
        label: `${title} (lien importé avec le B2)`,
      });
    } else
      resourceId = await ensureResource(
        notionId ?? `moodle:url:${url}`,
        {
          title,
          url,
          description: cleanInline(rows.map((r) => r["Description"]).find(Boolean) ?? "") || null,
          content: browsers,
          category: NR_REFERENCES.test(title) ? "Numérique responsable" : SUBJECT,
          tags,
          kind: "reference",
          audience: "students",
        },
        `${title}${rows.length > 1 ? " (Chrome + Firefox)" : ""} → ${url ?? "sans lien"}`,
      );
    const days = new Set(
      rows
        .flatMap((r) => linkedIds(r["🧩 Activités pédagogiques"]))
        .map((id) => activityDay.get(id))
        .filter((n): n is number => n !== undefined),
    );
    if (!days.size) unlinkedRefs++;
    for (const n of days) links.push({ day: n, resourceId, label: title });
  }
  if (unlinkedRefs)
    imp.warnings.push(
      `${unlinkedRefs} référence(s) sans activité liée : bibliothèque seulement (non rattachées à une journée).`,
    );

  // Projet fil rouge : briefs.
  for (const id of BRIEFS) {
    const p = page(id);
    const resourceId = await ensureResource(
      p.id,
      {
        title: `Brief — ${p.title}`,
        content: p.body,
        category: SUBJECT,
        tags: ["projet fil rouge"],
        kind: "project",
        audience: "students",
      },
      `Brief — ${p.title} (${p.body.length} car.)`,
      p,
    );
    links.push({ day: 1, resourceId, label: `Brief — ${p.title}` });
  }

  // Banque de questions du QCM (export HTML, sans bonnes réponses).
  if (existsSync(QUESTIONS_HTML)) {
    const bank = xhtmlQuestionBankMarkdown(
      "QCM final — Accessibilité M2",
      readFileSync(QUESTIONS_HTML, "utf8"),
    );
    const resourceId = await ensureResource(
      `moodle:questions:${MOODLE_COURSE}`,
      {
        title: "QCM — Accessibilité M2 (questions)",
        content: bank.markdown,
        category: SUBJECT,
        tags: ["QCM", "banque de questions"],
        kind: "question_bank",
        audience: "teacher",
      },
      `QCM — Accessibilité M2 (${bank.count} questions, sans bonnes réponses)`,
    );
    links.push({ day: 4, resourceId, label: "QCM — banque de questions" });
  } else imp.warnings.push("Export HTML de la banque de questions absent : QCM non importé.");

  const primaryDone = new Set<number>();
  for (const l of links) {
    const primary = !primaryDone.has(l.day);
    primaryDone.add(l.day);
    await imp.link(
      "course_resource",
      {
        course_id: courseIds.get(l.day),
        resource_id: l.resourceId,
        role: primary ? "primary" : "secondary",
      },
      "course_id,resource_id",
      `Jour ${l.day} ↔ ${l.label}`,
    );
  }

  // ── Groupes ──────────────────────────────────────────────────────────────
  const groupIds = new Map<number, string>();
  const groupPages = new Map<number, NotionPage>();
  const groupNumberById = new Map<string, number>();
  for (const p of pagesIn("Groupes projet fil rouge")) {
    const n = Number(/Groupe (\d+)/.exec(p.title)?.[1]);
    if (!n) continue;
    groupPages.set(n, p);
    groupNumberById.set(p.id, n);
    groupIds.set(
      n,
      await imp.ensure(
        "student_group",
        "notion",
        p.id,
        { module_id: moduleId, name: `Groupe ${n}`, type: "project" },
        `Groupe ${n} (projet)${p.properties["Technos"] ? ` — ${p.properties["Technos"]}` : ""}`,
      ),
    );
  }
  const groupNumbers = [...groupIds.keys()].sort((a, b) => a - b);

  // ── Étudiant·es ──────────────────────────────────────────────────────────
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[\s-]+/g, " ")
      .trim();
  const studentByName = new Map<string, { id: string; label: string }>();
  for (const p of pagesIn("Étudiant·es").sort((a, b) => a.title.localeCompare(b.title, "fr"))) {
    const { first, last } = splitNotionName(p.title);
    const initial = `${last.charAt(0).toLocaleUpperCase("fr")}.`;
    const label = `${first} ${initial}`;
    const group = groupNumberById.get(linkedIds(p.properties["Groupe"])[0] ?? "") ?? null;
    const promo = p.properties["Promo"] ?? "";
    const appreciation = (p.properties["Appréciation étudiant.e"] ?? "").trim();
    const profile = p.properties["Profil technique"] ?? "";
    const notes = [
      appreciation && `Accessibilité & Qualité Web (M2, 2024-25) : ${appreciation}`,
      profile && `Profil technique : ${profile}`,
    ]
      .filter(Boolean)
      .join("\n");
    const id = await imp.ensure(
      "student",
      "notion",
      p.id,
      {
        first_name: first,
        last_name: initial,
        scholar_group: promo ? `M2 ${promo}` : null,
        personal_notes: notes || null,
      },
      `${label} — ${promo || "promo ?"} — ${group ? `Groupe ${group}` : "sans groupe"}${profile ? ` — ${profile}` : ""}`,
    );
    studentByName.set(norm(`${last} ${first}`), { id, label });
    studentByName.set(norm(`${first} ${last}`), { id, label });
    if (group)
      await imp.link(
        "group_member",
        { student_group_id: groupIds.get(group), student_id: id },
        "student_group_id,student_id",
        `Groupe ${group} ← ${label}`,
      );
    else imp.warnings.push(`${label} : aucun groupe dans Notion.`);
  }

  // ── Grilles ──────────────────────────────────────────────────────────────
  const ensureGrid = async (gridPageId: string, name: string, description: string | null) => {
    const gp = page(gridPageId);
    const rows = parseRubricTables(gp.body);
    const total = rows.filter((r) => !r.bonus).reduce((s, r) => s + r.weight, 0);
    const gridId = await imp.ensure(
      "grading_grid",
      "notion",
      gp.id,
      { name, description },
      `${name} — ${rows.length} critères = /${total}${rows.some((r) => r.bonus) ? " + bonus" : ""}`,
    );
    const ids: string[] = [];
    for (const [i, r] of rows.entries())
      ids.push(
        await imp.ensure(
          "grid_criterion",
          "notion",
          `${gp.id}#critere-${i + 1}`,
          {
            grading_grid_id: gridId,
            label: r.label,
            weight: r.weight,
            description: [
              r.section && `*${r.section}*`,
              r.description,
              r.reference && `Référence RGAA : ${r.reference}`,
            ]
              .filter(Boolean)
              .join("\n\n"),
            position: i + 1,
          },
          `${name} › ${r.label} /${r.weight}${r.bonus ? " (bonus)" : ""}`,
        ),
      );
    return { gridId, rows, ids, total };
  };

  const projectGridPage = page(PROJECT.grid);
  const projectGrid = await ensureGrid(
    PROJECT.grid,
    "Grille — Projet fil rouge (M2 accessibilité)",
    /^[^|#\n].+$/m.exec(projectGridPage.body)?.[0]?.trim() ?? null,
  );
  const oralGrid = await ensureGrid(ORAL.grid, "Grille — Soutenance orale finale (M2)", null);

  const ensureAssessment = async (
    sourceId: string,
    row: Record<string, unknown>,
    label: string,
    targets: number[],
  ) => {
    const id = await imp.ensure(
      "assessment",
      "notion",
      sourceId,
      { module_id: moduleId, ...row },
      label,
    );
    for (const n of targets)
      await imp.link(
        "assessment_group",
        { assessment_id: id, student_group_id: groupIds.get(n) },
        "assessment_id,student_group_id",
        `${String(row.title)} → Groupe ${n}`,
      );
    return id;
  };

  const detailFeedback = (
    rows: { label: string; weight: number; score: number | null; comment: string }[],
  ) =>
    `**Détail par critère**\n${rows
      .map(
        (r) =>
          `- **${r.label}** — ${r.score ?? "?"}/${r.weight}${r.comment ? ` : ${cleanInline(r.comment.replace(/\n+/g, " "))}` : ""}`,
      )
      .join("\n")}`;

  // ── Évaluation 1 : projet fil rouge (notes de groupe, détail par critère) ─
  const projectPage = page(PROJECT.page);
  const projectSubject = stripLocalImages(projectPage.body);
  droppedImages += projectSubject.dropped;
  const projectId = await ensureAssessment(
    projectPage.id,
    {
      title: "Projet fil rouge",
      type: "Projet de groupe",
      subject: projectSubject.body,
      is_group_grade: true,
      date: DAYS[3].date,
      grading_grid_id: projectGrid.gridId,
      max_score: 20,
    },
    `Projet fil rouge — sujet ${projectSubject.body.length} car., barème /20, ${groupNumbers.length} groupes`,
    groupNumbers,
  );
  for (const suivi of pagesIn("Suivi corrections")) {
    const n = Number(/^Projet groupe (\d+)$/.exec(suivi.title)?.[1]);
    if (!n) continue;
    const raw30 = parseScore(suivi.properties["Note /30"]);
    const value = parseScore(suivi.properties["Note /20"]);
    if (value === null || !groupIds.get(n)) {
      imp.warnings.push(`${suivi.title} : groupe ou note introuvable (ignoré).`);
      continue;
    }
    const rows = parseRubricTables(suivi.body);
    if (rows.length !== projectGrid.rows.length)
      imp.warnings.push(
        `${suivi.title} : ${rows.length} critères lus pour ${projectGrid.rows.length} dans la grille.`,
      );
    const scores = Object.fromEntries(
      rows.map((r, i) => [projectGrid.ids[i], r.score] as const).filter(([, s]) => s !== null),
    );
    const sum = rows.reduce((s, r) => s + (r.score ?? 0), 0);
    if (raw30 !== null && Math.abs(sum - raw30) > 0.01)
      imp.warnings.push(
        `${suivi.title} : somme des critères ${sum} ≠ note brute ${raw30}/30 (note /20 arrondie conservée).`,
      );
    const g = groupPages.get(n)?.properties ?? {};
    const projectLinks = [
      ["Technos", g["Technos"]],
      ["Dépôt", g["URL Repo"]],
      ["Site déployé", g["URL Déployée"]],
      ["Kanban", g["URL Kanban"]],
      ["Maquettes", g["URL Maquettes"]],
      ["Documentation", g["URL Doc"]],
    ]
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `- ${k} : ${v}`)
      .join("\n");
    const finalComment = stripLocalImages(
      /###\s*✍️?\s*Commentaires finaux\s*\n([\s\S]*)$/.exec(suivi.body)?.[1] ?? "",
    );
    droppedImages += finalComment.dropped;
    const feedback = [
      finalComment.body.replace(/\n\s*BONUS\s*$/, "").trim(),
      g["Appréciation de groupe"] && `**Appréciation du groupe**\n${g["Appréciation de groupe"]}`,
      projectLinks && `**Projet**\n${projectLinks}`,
      detailFeedback(rows),
      raw30 !== null && `Note brute (bonus compris) : ${raw30}/30, ramenée à ${value}/20.`,
    ]
      .filter(Boolean)
      .join("\n\n");
    await imp.ensure(
      "grade",
      "notion",
      suivi.id,
      {
        assessment_id: projectId,
        student_group_id: groupIds.get(n),
        is_group_grade: true,
        value,
        scores,
        feedback,
      },
      `Projet fil rouge › Groupe ${n} : ${value}/20${raw30 !== null ? ` (brute ${raw30}/30)` : ""} (${Object.keys(scores).length} critères)`,
    );
  }

  // ── Évaluation 2 : oral du projet ────────────────────────────────────────
  const oralPage = page(ORAL.subject);
  const oralId = await ensureAssessment(
    oralPage.id,
    {
      title: "Oral du projet",
      type: "Oral de groupe",
      subject: stripLocalImages(oralPage.body).body,
      is_group_grade: true,
      date: DAYS[3].date,
      duration_minutes: 20,
      grading_grid_id: oralGrid.gridId,
    },
    `Oral du projet — 15–20 min, grille /${oralGrid.total}, ${groupNumbers.length} groupes`,
    groupNumbers,
  );
  for (const p of pagesIn(".")) {
    const n = Number(/^Oral groupe (\d+)$/.exec(p.title)?.[1]);
    if (!n || !groupIds.get(n)) continue;
    const rows = parseRubricTables(p.body);
    const total = /\|\s*\*\*TOTAL\*\*\s*\|\s*\**\s*([\d.,]+)\s*\/\s*20/.exec(p.body)?.[1];
    const value = total
      ? Number(total.replace(",", "."))
      : rows.reduce((s, r) => s + (r.score ?? 0), 0);
    const global = stripLocalImages(p.body.split(/^\|\s*\*\*TOTAL\*\*.*$/m)[1] ?? "").body.trim();
    const scores = Object.fromEntries(
      rows.map((r, i) => [oralGrid.ids[i], r.score] as const).filter(([, s]) => s !== null),
    );
    await imp.ensure(
      "grade",
      "notion",
      p.id,
      {
        assessment_id: oralId,
        student_group_id: groupIds.get(n),
        is_group_grade: true,
        value,
        scores,
        feedback: [global, detailFeedback(rows)].filter(Boolean).join("\n\n"),
      },
      `Oral du projet › Groupe ${n} : ${value}/20 (${Object.keys(scores).length} critères${global ? ", commentaire global" : ""})`,
    );
  }

  // ── Évaluation 3 : QCM final individuel (résultats Moodle /100) ──────────
  const qcmId = await ensureAssessment(
    QCM.page,
    {
      title: "QCM final individuel",
      type: "QCM individuel",
      subject:
        "QCM final individuel sur Moodle (questions : ressource « QCM — Accessibilité M2 »).",
      is_group_grade: false,
      date: DAYS[3].date,
      max_score: 100,
    },
    `QCM final individuel — /100, ${groupNumbers.length} groupes`,
    groupNumbers,
  );
  if (ctx.gradesFile) {
    for (const r of parseCsv(readFileSync(ctx.gradesFile, "utf8"))) {
      const full = `${r["Nom de famille"] ?? ""} ${r["Prénom"] ?? ""}`;
      if (!r["Prénom"]) continue;
      const student =
        studentByName.get(norm(full)) ??
        studentByName.get(norm(`${r["Prénom"]} ${r["Nom de famille"]}`));
      const value = parseScore(r["Note/100,00"]);
      if (!student || value === null) {
        imp.warnings.push(
          `QCM : ligne sans étudiant·e correspondant·e ou sans note (${student?.label ?? "inconnu·e"}).`,
        );
        continue;
      }
      await imp.ensure(
        "grade",
        "moodle",
        `grade:${QCM.page}:student:${student.id}`,
        { assessment_id: qcmId, student_id: student.id, is_group_grade: false, value },
        `QCM › ${student.label} : ${value}/100`,
      );
    }
  } else imp.warnings.push("Pas de résultats de QCM (--grades) : notes de QCM non importées.");

  // ── Documents du module ──────────────────────────────────────────────────
  await importModuleDocument(
    imp,
    moduleId,
    "outline_sent",
    ctx.outlinePdf,
    `${COURSE_PAGE}#trame-envoyee`,
    "Progression pédagogique — Accessibilité & Qualité Web (M2).pdf",
  );
  await importModuleDocument(
    imp,
    moduleId,
    "external_invoice",
    ctx.invoicePdf,
    `${COURSE_PAGE}#facture-25-08-3`,
    "Facture 25-08-3 — Nantes Ynov Campus.pdf",
  );

  if (droppedImages)
    imp.warnings.push(`${droppedImages} image(s) retirée(s) des sujets d'évaluation.`);
  for (const issue of imageIssues) imp.warnings.push(`Image non importée — ${issue}`);
  imp.warnings.push(
    "Projet fil rouge : grille annoncée /30, critères = 29 + bonus 0,5 (section CI/CD annoncée 3 points, critères 2) ; notes /20 de Notion (arrondies) conservées.",
  );
}
