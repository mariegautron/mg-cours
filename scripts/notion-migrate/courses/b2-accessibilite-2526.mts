// Cours 1 — Ynov B2 « Accessibilité & Qualité Web » (année 2025-26), validé par la PO le 26/09.
// Sources : export Notion (progression, évaluations, grilles, bibliothèque), sauvegarde Moodle
// sans utilisateurs (liens, groupes), liste des participants Moodle, PDF de la trame envoyée
// et de la facture 26-03-6 (émise hors application).
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

import { MIME_BY_EXT, safeName } from "../../../src/lib/storage/files.ts";

import type { Importer } from "../lib/importer.mts";
import { sectionActivities, type MoodleCourse } from "../lib/moodle.mts";
import { stripLocalImages, type NotionPage } from "../lib/notion.mts";
import { parseCsv, parseGrid, parseProgression } from "../lib/parsers.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  moodle: MoodleCourse;
  participantsCsv: string | null;
  outlinePdf: string | null;
  invoicePdf: string | null;
}

const PROGRESSION = "2df903c74f13805c8a20f402589c8c9a";
const CORRIGE_EVAL_INDIVIDUELLE = "2df903c74f13809d8f5ac4cc183b8a31";
const SCHOOL_SIRET = "80442673200033"; // Nantes Ynov Campus

/** Pages de la bibliothèque diffusées sur Moodle, par section du cours Moodle. */
const LIBRARY: Record<string, { id: string; category: string }[]> = {
  "Séance Cours 1": [
    { id: "20d903c74f1380aa8eccce3fdc8b7856", category: "Numérique responsable" },
    { id: "205903c74f13806ab389ee0a21054e25", category: "Accessibilité" }, // Cartes Latitudes
    { id: "205903c74f13806e91a8fbb545b11a45", category: "Accessibilité" },
    { id: "205903c74f13806d8aa5f66236d030ce", category: "Accessibilité" },
    { id: "205903c74f13800cac5be81417b9d428", category: "Accessibilité" },
    { id: "20d903c74f1380709df7df7ce5434638", category: "Numérique responsable" },
  ],
  "Séance Cours 2": [
    { id: "205903c74f138052a56cf68aba60635d", category: "Accessibilité" },
    { id: "205903c74f1380a8a968ea18b62f9463", category: "Accessibilité" },
    { id: "205903c74f13808cb74fff9f514e126d", category: "Accessibilité" },
    { id: "205903c74f13800bb452e59367b36b64", category: "Accessibilité" },
    { id: "205903c74f1380418ec7cd15da7b3f2b", category: "Accessibilité" },
    { id: "205903c74f13803e85b6d0ba28ffcd17", category: "Accessibilité" },
    { id: "205903c74f1380229a85d2d1db3aa7fd", category: "Accessibilité" },
    { id: "205903c74f13800bb045c92f6abaa289", category: "Accessibilité" },
    { id: "205903c74f138095b033cbcf52ec95d8", category: "Accessibilité" },
    { id: "205903c74f13805fa1f9cd292cbf3753", category: "Accessibilité" },
  ],
};

/** Séances MG COURS (numéros de la progression) servies par chaque section Moodle. */
const SECTION_TO_SESSIONS: Record<string, number[]> = {
  "Séance Cours 1": [1, 2],
  "Séance TP": [2, 3],
  "Séance Cours 2": [4],
};

const SESSION_TYPES: Record<number, string> = {
  1: "lecture",
  2: "workshop",
  3: "workshop",
  4: "applied",
  5: "assessment",
};

const ASSESSMENTS = [
  {
    page: "2df903c74f138032bae8eb758ec6583d",
    grid: "2df903c74f1380d0a9c4d1468af3b223",
    type: "Projet — écrit de groupe",
    isGroupGrade: true,
    date: "2026-01-22",
    duration: 240,
  },
  {
    page: "2df903c74f1380c0aeaac5cd52d8c354",
    grid: "2df903c74f138048849ded517ce97771",
    type: "Écrit individuel",
    isGroupGrade: false,
    date: "2026-02-05",
    duration: 45,
  },
  {
    page: "2df903c74f1380509b9fceed2ba0308d",
    grid: "2df903c74f13804889d6d417c96d4db7",
    type: "Oral de groupe",
    isGroupGrade: true,
    date: "2026-02-05",
    duration: 10,
  },
];

/** Étudiant·es présent·es dans le cours Moodle mais sans groupe (décision PO du 26/09). */
const FALLBACK_GROUP = "Groupe 3 – CYBER";

const normalizeGroup = (g: string) => {
  const m = /groupe\s*(\d+)\s*-\s*(\w+)/i.exec(g);
  return m ? `Groupe ${m[1]} – ${m[2].toUpperCase()}` : null;
};

export async function migrate(ctx: CourseContext): Promise<void> {
  const { imp, page, moodle } = ctx;

  // ── Module ───────────────────────────────────────────────────────────────
  const { data: school } = await imp.sb
    .from("school")
    .select("id, name")
    .eq("owner_id", imp.ownerId)
    .eq("siret", SCHOOL_SIRET)
    .maybeSingle();
  if (!school) imp.warnings.push("École Nantes Ynov Campus introuvable : module créé sans école.");

  const progressionPage = page(PROGRESSION);
  const sessions = parseProgression(progressionPage.body);
  if (sessions.length !== 5)
    throw new Error(`Progression : 5 séances attendues, ${sessions.length} lues`);

  const moduleId = await imp.ensure(
    "module",
    "moodle",
    `course:${moodle.shortname}`,
    {
      school_id: school?.id ?? null,
      name: "Accessibilité & Qualité Web",
      level: "Bachelor 2 INFO & CYBER",
      year: 2025,
      ycode: "A2526_0121",
      total_hours: 20,
      start_date: sessions[0].date,
      first_session_date: sessions[0].date,
      end_date: sessions[4].date,
      hourly_rate: 50,
      iceberg_state: "paid",
      archived_at: new Date().toISOString(),
    },
    `Accessibilité & Qualité Web — B2 — 2025-26 (A2526_0121, 20 h, payé, archivé) — école : ${school?.name ?? "aucune"}`,
  );

  // ── Séances ──────────────────────────────────────────────────────────────
  const courseIds = new Map<number, string>();
  for (const s of sessions) {
    const id = await imp.ensure(
      "course",
      "notion",
      `${PROGRESSION}#seance-${s.number}`,
      {
        module_id: moduleId,
        title: s.title,
        position: s.number,
        session_date: s.date,
        type: SESSION_TYPES[s.number],
        learning_objectives: s.objectives,
        animation_notes: s.animation || null,
        assessment_notes: s.assessment || null,
        material: s.material || null,
        prep_status: "ready",
      },
      `Séance ${s.number} — ${s.date} — ${s.title} (${s.objectives.length} objectifs)`,
    );
    courseIds.set(s.number, id);
  }

  // ── Ressources (bibliothèque Notion + liens Moodle) ─────────────────────
  let droppedImages = 0;
  const imageIssues: string[] = [];

  /** Images locales d'une page → bucket `resource-files` + `resource.files` (citées par leur nom). */
  const importImages = async (resourceId: string, p: NotionPage) => {
    if (!p.images.length) return;
    const { data } = imp.isDry(resourceId)
      ? { data: null }
      : await imp.sb.from("resource").select("files").eq("id", resourceId).single();
    const existing = (Array.isArray(data?.files) ? data.files : []) as { name: string }[];
    const files: Record<string, unknown>[] = [...existing];
    for (const img of p.images) {
      const name = basename(img.file);
      const mime = MIME_BY_EXT[extname(name).slice(1).toLowerCase()];
      if (!mime?.startsWith("image/")) {
        imageIssues.push(`${p.title} › ${name} : format non accepté`);
        continue;
      }
      if (!existsSync(img.file)) {
        imageIssues.push(`${p.title} › ${name} : fichier absent de l'export`);
        continue;
      }
      if (files.some((f) => f.name === name)) continue;
      const body = readFileSync(img.file);
      const path = `${imp.ownerId}/${resourceId}/${randomUUID()}-${safeName(name)}`;
      imp.report.push({
        table: "resource-files (images)",
        action: "envoyer",
        label: `${p.title} › ${name} (${Math.max(1, Math.round(body.length / 1024))} Ko)`,
      });
      await imp.upload("resource-files", path, body, mime);
      files.push({ path, name, size: body.length, mime });
    }
    if (files.length !== existing.length)
      await imp.update("resource", resourceId, { files }, p.title);
  };

  const linkResource = async (
    sessionNumbers: number[],
    resourceId: string,
    label: string,
    primary: boolean,
  ) => {
    for (const n of sessionNumbers) {
      await imp.link(
        "course_resource",
        {
          course_id: courseIds.get(n),
          resource_id: resourceId,
          role: primary ? "primary" : "secondary",
        },
        "course_id,resource_id",
        `Séance ${n} ↔ ${label}`,
      );
    }
  };

  for (const [section, entries] of Object.entries(LIBRARY)) {
    let first = true;
    for (const { id, category } of entries) {
      const p = page(id);
      const resourceId = await imp.ensure(
        "resource",
        "notion",
        p.id,
        { title: p.title, content: p.body, category, tags: [] },
        `${p.title} (${category}, ${p.body.length} car.)`,
      );
      await importImages(resourceId, p);
      await linkResource(SECTION_TO_SESSIONS[section], resourceId, p.title, first);
      first = false;
    }
  }

  for (const section of ["Séance Cours 1", "Séance TP"]) {
    for (const a of sectionActivities(moodle, section).filter(
      (x) => x.module === "url" && x.externalUrl,
    )) {
      const title = a.name
        .replace(/^\[[^\]]+\]\s*/, "")
        .replace(/^(Lien vu en cours|Activité)\s*:\s*/i, "");
      const resourceId = await imp.ensure(
        "resource",
        "moodle",
        `url:${a.externalUrl}`,
        { title, url: a.externalUrl, category: "Lien", tags: [] },
        `${title} → ${a.externalUrl}`,
      );
      await linkResource(SECTION_TO_SESSIONS[section], resourceId, title, false);
    }
  }

  const corrige = page(CORRIGE_EVAL_INDIVIDUELLE);
  const corrigeId = await imp.ensure(
    "resource",
    "notion",
    corrige.id,
    {
      title: "Corrigé — Évaluation individuelle (correction ciblée)",
      content: corrige.body,
      category: "Évaluation",
      tags: ["corrigé"],
    },
    "Corrigé — Évaluation individuelle (correction ciblée)",
  );
  await importImages(corrigeId, corrige);
  await linkResource([5], corrigeId, "Corrigé", false);

  // ── Groupes + étudiant·es ────────────────────────────────────────────────
  const groupIds = new Map<string, string>();
  const groupNames = [
    ...new Set(
      moodle.groups
        .map(normalizeGroup)
        .filter((g): g is string => g !== null && g !== "Groupe 4 – CYBER"),
    ),
  ].sort();
  for (const name of groupNames) {
    groupIds.set(
      name,
      await imp.ensure(
        "student_group",
        "moodle",
        `course:${moodle.shortname}#group:${name}`,
        { module_id: moduleId, name, type: "project" },
        `${name} (projet)`,
      ),
    );
  }

  if (ctx.participantsCsv) {
    const rows = parseCsv(readFileSync(ctx.participantsCsv, "utf8")).filter(
      (r) => !/gautron/i.test(`${r["Nom de famille"]} ${r["Adresse de courriel"]}`),
    );
    for (const r of rows) {
      const group = normalizeGroup(r["Groupes"] ?? "") ?? FALLBACK_GROUP;
      const promo = group.split("– ")[1];
      const initial = `${(r["Nom de famille"] ?? "").trim().charAt(0).toUpperCase()}.`;
      // Clé d'idempotence pseudonyme : empreinte de l'e-mail, jamais l'e-mail lui-même.
      const key = createHash("sha256")
        .update((r["Adresse de courriel"] ?? "").toLowerCase())
        .digest("hex")
        .slice(0, 16);
      const studentId = await imp.ensure(
        "student",
        "moodle",
        `participant:${key}`,
        { first_name: r["Prénom"], last_name: initial, scholar_group: `B2 ${promo}` },
        `${r["Prénom"]} ${initial} — ${group}${r["Groupes"] ? "" : " (sans groupe Moodle → groupe par défaut)"}`,
      );
      await imp.link(
        "group_member",
        { student_group_id: groupIds.get(group), student_id: studentId },
        "student_group_id,student_id",
        `${group} ← ${r["Prénom"]} ${initial}`,
      );
    }
  } else imp.warnings.push("Pas de liste de participants : aucun·e étudiant·e importé·e.");

  // ── Grilles + évaluations ────────────────────────────────────────────────
  for (const a of ASSESSMENTS) {
    const gridPage = page(a.grid);
    const grid = parseGrid(gridPage.body);
    const total = grid.criteria.reduce((s, c) => s + c.weight, 0);
    const gridId = await imp.ensure(
      "grading_grid",
      "notion",
      gridPage.id,
      { name: gridPage.title, description: grid.notes || null },
      `${gridPage.title} — ${grid.criteria.map((c) => `${c.label} /${c.weight}`).join(" · ")} = /${total}`,
    );
    for (const [i, c] of grid.criteria.entries()) {
      await imp.ensure(
        "grid_criterion",
        "notion",
        `${gridPage.id}#critere-${i + 1}`,
        {
          grading_grid_id: gridId,
          label: c.label,
          weight: c.weight,
          description: c.description,
          position: i + 1,
        },
        `${gridPage.title} › ${c.label} /${c.weight}`,
      );
    }

    const subjectPage = page(a.page);
    // Pas de stockage de fichiers sur une évaluation : images locales retirées du sujet.
    const subject = stripLocalImages(subjectPage.body);
    droppedImages += subject.dropped;
    if (subject.body.length > 20000)
      imp.warnings.push(
        `Sujet « ${subjectPage.title} » : ${subject.body.length} car. (> 20 000, limite du formulaire).`,
      );

    const assessmentId = await imp.ensure(
      "assessment",
      "notion",
      subjectPage.id,
      {
        module_id: moduleId,
        grading_grid_id: gridId,
        title: subjectPage.title,
        type: a.type,
        subject: subject.body,
        is_group_grade: a.isGroupGrade,
        date: a.date,
        duration_minutes: a.duration,
      },
      `${subjectPage.title} — sujet ${subject.body.length} car., ${a.type}, ${a.date}, ${a.duration} min, grille /${total}, ${groupNames.length} groupes`,
    );
    for (const g of groupNames) {
      await imp.link(
        "assessment_group",
        { assessment_id: assessmentId, student_group_id: groupIds.get(g) },
        "assessment_id,student_group_id",
        `${subjectPage.title} → ${g}`,
      );
    }
  }

  // ── Documents du module : trame envoyée, facture émise hors application ────
  const moduleDocument = async (
    kind: "outline_sent" | "external_invoice",
    file: string | null,
    sourceId: string,
    name: string,
  ) => {
    if (!file) {
      imp.warnings.push(`Pas de PDF fourni pour « ${name} ».`);
      return;
    }
    const size = statSync(file).size;
    const path = `${imp.ownerId}/${moduleId}/${safeName(basename(file))}`;
    if (!(await imp.findRef("notion", sourceId, "module_document")))
      await imp.upload("module-documents", path, readFileSync(file), "application/pdf");
    await imp.ensure(
      "module_document",
      "notion",
      sourceId,
      { module_id: moduleId, kind, name, path, size_bytes: size, mime: "application/pdf" },
      `${name} (${Math.round(size / 1024)} Ko)`,
    );
  };
  await moduleDocument(
    "outline_sent",
    ctx.outlinePdf,
    `${PROGRESSION}#trame-envoyee`,
    "Progression pédagogique — B2 Accessibilité & Qualité Web.pdf",
  );
  await moduleDocument(
    "external_invoice",
    ctx.invoicePdf,
    `${PROGRESSION}#facture-26-03-6`,
    "Facture 26-03-6 — Nantes Ynov Campus.pdf",
  );

  // ── Points d'attention propres au cours ──────────────────────────────────
  if (droppedImages)
    imp.warnings.push(
      `${droppedImages} image(s) retirée(s) des sujets d'évaluation (pas de stockage de fichiers sur une évaluation).`,
    );
  for (const issue of imageIssues) imp.warnings.push(`Image non importée — ${issue}`);
  imp.warnings.push(
    "Oral : Moodle notait sur 24, la grille Notion totalise 20 → barème de l'évaluation = 20 (total de la grille), modifiable dans l'app.",
  );
  imp.warnings.push(
    "Non importés pour l'instant : PDF des supports (slides / cours), site support (zip).",
  );
}
