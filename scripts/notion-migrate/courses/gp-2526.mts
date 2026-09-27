// Cours 2 — Ynov Mastère 1 « Gestion d'un projet IT » (année 2025-26), validé par la PO le 27/09.
// Sources : export Notion (séances, activités, évaluations, grilles, corrections, étudiant·es,
// notes de préparation), sauvegarde Moodle sans utilisateurs (YCODE, banque de questions du
// QCM), PDF de la progression envoyée et de la facture 26-01-5.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ALL_ADMIN_DOCS_DONE,
  anonymize,
  completeAdminDocs,
  attachResourceFile,
  importModuleDocument,
  importResourceImages,
  splitNotionName,
} from "../lib/helpers.mts";
import type { Importer } from "../lib/importer.mts";
import type { MoodleCourse } from "../lib/moodle.mts";
import { parseQuestionBank, questionBankMarkdown } from "../lib/moodle-questions.mts";
import { cleanInline, linkedIds, stripLocalImages, type NotionPage } from "../lib/notion.mts";
import {
  frenchDateTimeRange,
  headingSections,
  parseCorrectionTable,
  parseCsv,
  parseScore,
  parseTableGrid,
} from "../lib/parsers.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  /** Chemin d'un CSV de base Notion (`<Nom> <id>_all.csv`). */
  csv: (databaseId: string) => string;
  /** Pages présentes dans l'export. */
  has: (id: string) => boolean;
  moodle: MoodleCourse;
  outlinePdf: string | null;
  invoicePdf: string | null;
}

const COURSE_PAGE = "29f903c74f1380d6a310f9e4bff4329a";
const SCHOOL_SIRET = "80442673200033"; // Nantes Ynov Campus

/** Séances Notion (datées) : titre court choisi d'après leurs objectifs, type MG COURS. */
const SESSIONS = [
  {
    id: "29f903c74f13816e84d0d4001606cf2c",
    title: "Lancement du projet & cartographie des acteurs",
    type: "lecture",
  },
  {
    id: "29f903c74f13817a9d5fc1d3ebda6f38",
    title: "Analyse du besoin, audit de l'existant & faisabilité",
    type: "workshop",
  },
  { id: "29f903c74f1381be9b90ec157d82c5e3", title: "Dossier de cadrage", type: "workshop" },
  {
    id: "29f903c74f13813a89d7c9a46400690f",
    title: "Méthodes, planification & rôles (RACI)",
    type: "lecture",
  },
  {
    id: "29f903c74f138021ae34c63419ce5a5c",
    title: "Spécifications & pilotage (écarts, risques)",
    type: "workshop",
  },
  {
    id: "29f903c74f13800f9896da827bd7aab1",
    title: "Management d'équipe, risques & communication",
    type: "workshop",
  },
  {
    id: "29f903c74f13806fb669f054c61deb5b",
    title: "Soutenances « Appel d'offres SantaConnect »",
    type: "assessment",
  },
  {
    id: "29f903c74f138003a23efb5681b6f0cc",
    title: "Rétrospective & QCM individuel",
    type: "assessment",
  },
];

/**
 * Pages de la bibliothèque reliées aux séances dans Notion, mais dont la relation n'apparaît
 * plus dans l'export (pages déplacées hors de la base « Activités ») : reprises à la main
 * d'après la base Notion consultée le 23/09.
 */
const LIBRARY_LINKS: Record<number, string[]> = {
  4: ["29f903c74f13808ea8d4cea966f82bcd", "2a3903c74f1380f581b7fccb0c4a9db7"], // méthodes, Scrum
  6: ["2a3903c74f1380718389cfd6716692ae"], // estimation des tâches
};

/** Une activité en dessous de ce volume de texte n'est qu'une ligne du déroulé. */
const MIN_RESOURCE_CHARS = 800;

/** Noms d'équipe (pages « Résumé des groupes »). */
const TEAM_NAMES: Record<number, string> = {
  1: "LudYTech",
  2: "ESN Altisys",
  3: "E.V.A",
  4: "SRM Corp",
  5: "NorthCode",
  6: "Ytech",
};

const GROUPS_DB = "29f903c74f138166b9defb09e4dfce0b";

/** Notes de préparation : matériel du jeu client SantaConnect et corrigés. */
const BRIEF = "29f903c74f1380e8bf8ec604ae95d06c";
const CLIENT_MATERIAL = [
  { id: "29f903c74f1380fc8f32c4c2cb0b9174", title: "SantaConnect — Mails client", sessions: [1] },
  {
    id: "2a3903c74f13800b8111cdab4bb8dcdc",
    title: "SantaConnect — Organigramme du Pôle Nord",
    sessions: [2],
  },
];
const CLIENT_ANSWERS = {
  sourceId: "29e903c74f13806197c8da904892ab33#reponses-client",
  title: "SantaConnect — Réponses du client",
  pages: [
    { id: "2a0903c74f13802896bbd2f1165703a9", heading: "Lecture du brief" },
    { id: "2a0903c74f1380fba4e9dd58e84ea79a", heading: "Analyse du besoin" },
    { id: "2a0903c74f138066ab7de73e12b35887", heading: "Audit de l'existant & SWOT" },
    { id: "2a0903c74f13806d9613d1d5d5305380", heading: "Faisabilité technique et fonctionnelle" },
  ],
  database: "2a3903c74f13803ba224fee09a7483da",
  sessions: [1, 2],
};
const CORRIGES = [
  {
    id: "29f903c74f1380c587ffc9e4fba09522",
    title: "Corrigé — Cartographie des parties prenantes",
    sessions: [1],
  },
  {
    id: "2a0903c74f1380b4a70ff1f120d750d3",
    title: "Corrigé — Lecture du brief client SantaConnect",
    sessions: [1],
  },
  {
    id: "2a1903c74f1380bda33cd4a3da16120f",
    title: "Corrigé — Dossier de cadrage (modèle)",
    sessions: [3],
  },
];
const CADRAGE_NOTES = "2ae903c74f1380daa710d97b5647765f"; // commentaire global par groupe

// ── 2e passe (décision PO du 27/09) ──────────────────────────────────────────
const NOTES_PREP = "29e903c74f13806197c8da904892ab33";
/** Gabarit vide du dossier de cadrage donné aux équipes. */
const CADRAGE_TEMPLATE = "2a2903c74f1380d89e79e38d550cf7ef";
/** « Résumé des groupes » (sans le classement), anonymisés. */
const TEAM_SUMMARIES = [
  "2cc903c74f13803fa55cdbd0635fd597",
  "2cc903c74f138017acefc0bd00693eb7",
  "2cc903c74f1380f1a142c898014bdaf5",
  "2cc903c74f1380789c28f8abdc52456c",
  "2cc903c74f13806c9b0cee734b03be2c",
  "2cc903c74f138004b77ff50059520ff3",
];
const RISK_ACTIVITY = "29f903c74f1380128632f2839544d6f7";
/** PDF joints dans Notion : page, fichier, destination. */
const PDFS = [
  {
    page: "29f903c74f13816e84d0d4001606cf2c",
    file: "Gestion_de_projet_-_sance_1.pdf",
    to: "module",
    name: "Slides — Séance 1 (lancement du projet).pdf",
  },
  {
    page: "29f903c74f13801c92a8f95c0e39ddff",
    file: "Gestion_de_projet-14-17.pdf",
    to: "module",
    name: "Slides — Communication & conduite du changement.pdf",
  },
  {
    page: RISK_ACTIVITY,
    file: "Gestion_des_risques.pdf",
    to: "resource",
    name: "Gestion_des_risques.pdf",
  },
] as const;

/** Remarques récurrentes des corrections 2025-26, reformulées en commentaires prédéfinis. */
const PREDEFINED_COMMENTS: {
  text: string;
  category: "positive" | "negative" | "advice";
  tags: string[];
}[] = [
  {
    text: "Objectifs SMART très ambitieux (ex. 100 %) fixés sans validation du client : à discuter et ajuster avec lui.",
    category: "negative",
    tags: ["cadrage", "objectifs"],
  },
  {
    text: "Contexte trop générique : reprenez les éléments concrets du brief (contraintes, volumétrie, enjeux).",
    category: "negative",
    tags: ["cadrage", "contexte"],
  },
  {
    text: "Cartographie des parties prenantes incomplète : il manque des acteurs clés du brief (décideurs, utilisateurs, financeurs).",
    category: "negative",
    tags: ["cadrage", "acteurs"],
  },
  {
    text: "Précisez pour chaque acteur son rôle, son influence et ses attentes : c'est ce qui permet de piloter les arbitrages.",
    category: "advice",
    tags: ["cadrage", "acteurs"],
  },
  {
    text: "Le « besoin réel » décrit déjà une solution : reformulez-le en besoins implicites et en hypothèses à valider avec le client.",
    category: "negative",
    tags: ["cadrage", "besoin"],
  },
  {
    text: "Catégorisez les contraintes (techniques, fonctionnelles, légales, budget, délais) et chiffrez-les quand c'est possible.",
    category: "advice",
    tags: ["cadrage", "contraintes"],
  },
  {
    text: "Les forces du SWOT portent sur votre équipe plutôt que sur le projet du client : recentrez l'analyse sur sa situation.",
    category: "negative",
    tags: ["cadrage", "SWOT"],
  },
  {
    text: "Interprétez la SWOT : quelles opportunités exploiter, quels risques surveiller en priorité ?",
    category: "advice",
    tags: ["cadrage", "SWOT"],
  },
  {
    text: "Un élément « non faisable » relève souvent du « à risque » : précisez les conditions ou arbitrages qui le rendraient faisable.",
    category: "advice",
    tags: ["cadrage", "faisabilité"],
  },
  {
    text: "Distinguez clairement ce qui relève du MVP (V1) et de la V2 pour montrer vos arbitrages.",
    category: "advice",
    tags: ["cadrage", "MVP"],
  },
  {
    text: "Plans d'action trop génériques : précisez qui fait quoi et comment le risque est concrètement réduit.",
    category: "negative",
    tags: ["risques"],
  },
  {
    text: "Hypothèses explicitement signalées : le raisonnement est facile à suivre, c'est un réflexe professionnel.",
    category: "positive",
    tags: ["cadrage", "rédaction"],
  },
  {
    text: "Justifiez le choix méthodologique par les contraintes du projet (délai, incertitudes, disponibilité du client) et comparez-le aux alternatives.",
    category: "advice",
    tags: ["specs", "méthodologie"],
  },
  {
    text: "Architecture surdimensionnée pour une V1 au regard du délai et du budget : simplifiez et justifiez vos arbitrages.",
    category: "negative",
    tags: ["specs", "architecture"],
  },
  {
    text: "Modèle de données à formaliser : entités, relations, volumétrie, archivage et règles RGPD.",
    category: "advice",
    tags: ["specs", "données"],
  },
  {
    text: "Sécurité : détaillez les rôles, les niveaux d'accès et la protection des données sensibles.",
    category: "advice",
    tags: ["specs", "sécurité"],
  },
  {
    text: "Soyez explicite sur le périmètre du MVP : le client doit savoir exactement ce qu'il aura, et quand.",
    category: "advice",
    tags: ["oral", "MVP"],
  },
  {
    text: "Planning et budget peu cohérents avec le staffing annoncé : alignez périmètre, charge, délai et ressources.",
    category: "negative",
    tags: ["oral", "planning"],
  },
  {
    text: "Posture professionnelle et discours orienté client, clairs et convaincants.",
    category: "positive",
    tags: ["oral", "posture"],
  },
  {
    text: "Ne relisez pas vos documents : synthétisez et racontez, les slides soutiennent le discours.",
    category: "advice",
    tags: ["oral", "présentation"],
  },
];

const ASSESSMENTS = [
  {
    page: "2a0903c74f13807293dedb104fe83b41",
    grid: "2ae903c74f13803c97e5e8ee19d9b46a",
    matrix: "2b4903c74f138009943ac33e347eab52",
    type: "Projet — dossier écrit de groupe",
    session: 3,
  },
  {
    page: "2ae903c74f1380359315ccf7a94b28be",
    grid: "2ae903c74f1380768d39e198d7847ebd",
    matrix: "2d1903c74f13804e8ef1f0020bf01c19",
    type: "Projet — spécifications de groupe",
    session: 5,
  },
  {
    page: "2a1903c74f13803aaf6fecba8e919869",
    grid: "2ae903c74f138023bbcbfbf092ac25c0",
    matrix: null,
    type: "Oral de groupe",
    session: 7,
  },
] as const;

const QCM = {
  page: "2a1903c74f1380c39171e9102acf370e",
  type: "QCM individuel",
  session: 8,
  duration: 60,
  subject:
    "QCM individuel (1 h, Moodle) : théorie et cas courts — cadrage, besoin, faisabilité, méthodes, Scrum, estimation, pilotage, risques, écarts, tests / recette, maintenance.",
};

export async function migrate(ctx: CourseContext): Promise<void> {
  const { imp, page, moodle } = ctx;
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

  const sessions = SESSIONS.map((s, i) => {
    const p = page(s.id);
    const when = frenchDateTimeRange(p.properties["Date"]);
    return { ...s, number: i + 1, page: p, when };
  });
  const totalHours = sessions.reduce((sum, s) => sum + (s.when.hours ?? 0), 0);
  if (totalHours !== 28) imp.warnings.push(`Total des séances : ${totalHours} h (28 h facturées).`);

  const ycode = /a2526_\d+/i.exec(moodle.shortname)?.[0].toUpperCase() ?? null;
  const moduleId = await imp.ensure(
    "module",
    "moodle",
    `course:${moodle.shortname}`,
    {
      school_id: school?.id ?? null,
      name: "Gestion d'un projet IT",
      level: "Mastère 1 (DEVWEB, DEVLMIOT, DATA)",
      year: 2025,
      ycode,
      total_hours: 28,
      start_date: sessions[0].when.date,
      first_session_date: sessions[0].when.date,
      end_date: sessions[sessions.length - 1].when.date,
      hourly_rate: 60,
      iceberg_state: "paid",
      admin_docs: ALL_ADMIN_DOCS_DONE,
      archived_at: new Date().toISOString(),
    },
    `Gestion d'un projet IT — M1 — 2025-26 (${ycode}, 28 h, 60 €/h, payé, archivé) — école : ${school?.name ?? "aucune"}`,
  );
  await completeAdminDocs(imp, moduleId, "Gestion d'un projet IT");

  // ── Ressources (activités, bibliothèque, matériel client, corrigés) ─────
  const resourceIds = new Map<string, string>();
  const courseIds = new Map<number, string>();
  const pendingLinks: { session: number; resourceId: string; label: string }[] = [];

  const ensureResource = async (
    sourceId: string,
    row: {
      title: string;
      content?: string | null;
      url?: string | null;
      category: string;
      tags?: string[];
    },
    label: string,
    p?: NotionPage,
  ) => {
    const known = resourceIds.get(sourceId);
    if (known) return known;
    const id = await imp.ensure(
      "resource",
      sourceId.startsWith("moodle:") ? "moodle" : "notion",
      sourceId.replace(/^moodle:/, ""),
      { tags: [], ...row },
      label,
    );
    resourceIds.set(sourceId, id);
    if (p) await importResourceImages(imp, id, p, imageIssues);
    return id;
  };

  // ── Séances ──────────────────────────────────────────────────────────────
  for (const s of sessions) {
    const sections = headingSections(s.page.body);
    const get = (prefix: string) =>
      [...sections.entries()].find(([k]) => k.startsWith(prefix))?.[1] ?? "";
    const objectives = get("objectifs")
      .split("\n")
      .filter((l) => /^\s*- /.test(l))
      .map((l) => cleanInline(l.replace(/^\s*- /, "")));

    // Activités reliées : ressource si elles ont un vrai contenu, sinon ligne du déroulé.
    const activities = [
      ...linkedIds(s.page.properties["🧩 Activités pédagogiques"]),
      ...(LIBRARY_LINKS[s.number] ?? []),
    ]
      .map((id) => {
        if (!ctx.has(id)) {
          imp.warnings.push(`Séance ${s.number} : activité ${id} absente de l'export (ignorée).`);
          return null;
        }
        const p = page(id);
        return { p, when: frenchDateTimeRange(p.properties["Date et heure"]) };
      })
      .filter((a) => a !== null)
      .sort((a, b) => (a.when.start ?? "99").localeCompare(b.when.start ?? "99"));

    const deroule: string[] = [];
    for (const { p, when } of activities) {
      const slot = when.start && when.end ? `${when.start}–${when.end} · ` : "";
      deroule.push(`- ${slot}${p.title}`);
      if (p.body.length < MIN_RESOURCE_CHARS) continue;
      const tags = (p.properties["Outils/Notions"] ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const url = /^https?:/.test(p.properties["URL"] ?? "") ? p.properties["URL"] : null;
      const resourceId = await ensureResource(
        p.id,
        { title: p.title, content: p.body, url, category: "Gestion de projet", tags },
        `${p.title} (${p.body.length} car.${p.images.length ? `, ${p.images.length} image(s)` : ""})`,
        p,
      );
      pendingLinks.push({ session: s.number, resourceId, label: p.title });
    }

    const animation = [
      get("contenus") && `**Contenus**\n${get("contenus")}`,
      get("activité") && `**Activité**\n${get("activité")}`,
      deroule.length && `**Déroulé**\n${deroule.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const assessmentNotes = [
      get("livrable") && `**Livrable**\n${get("livrable")}`,
      get("évaluation") && `**Évaluation**\n${get("évaluation")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const courseId = await imp.ensure(
      "course",
      "notion",
      s.id,
      {
        module_id: moduleId,
        title: s.title,
        position: s.number,
        session_date: s.when.date,
        type: s.type,
        learning_objectives: objectives,
        animation_notes: animation.slice(0, 4000) || null,
        assessment_notes: assessmentNotes.slice(0, 4000) || null,
        prep_status: "ready",
      },
      `Séance ${s.number} — ${s.when.date} ${s.when.start}–${s.when.end} (${s.when.hours} h) — ${s.title} (${objectives.length} objectifs, ${activities.length} activités)`,
    );
    if (animation.length > 4000)
      imp.warnings.push(`Séance ${s.number} : animation tronquée à 4 000 car.`);
    courseIds.set(s.number, courseId);
  }

  // Brief, matériel client, réponses du client, corrigés.
  const brief = page(BRIEF);
  pendingLinks.push({
    session: 1,
    resourceId: await ensureResource(
      brief.id,
      {
        title: brief.title,
        content: brief.body,
        category: "Gestion de projet",
        tags: ["SantaConnect"],
      },
      `${brief.title} (${brief.body.length} car.)`,
      brief,
    ),
    label: brief.title,
  });
  for (const m of [...CLIENT_MATERIAL, ...CORRIGES]) {
    const p = page(m.id);
    const corrige = m.title.startsWith("Corrigé");
    const id = await ensureResource(
      p.id,
      {
        title: m.title,
        content: p.body,
        category: corrige ? "Évaluation" : "Gestion de projet",
        tags: corrige ? ["corrigé", "SantaConnect"] : ["SantaConnect"],
      },
      `${m.title} (${p.body.length} car.)`,
      p,
    );
    for (const n of m.sessions) pendingLinks.push({ session: n, resourceId: id, label: m.title });
  }

  const answerRows = parseCsv(readFileSync(ctx.csv(CLIENT_ANSWERS.database), "utf8"));
  const answersContent = [
    "Réponses données par le « client » (Pôle Nord) aux questions des équipes, séance par séance.",
    ...CLIENT_ANSWERS.pages.map(({ id, heading }) => `## ${heading}\n\n${page(id).body}`),
    `## Questions posées par les équipes\n\n${answerRows
      .map((r) => {
        const group = cleanInline((r["👥 Groupes projet fil rouge"] ?? "").replace(/\s*\(.*$/, ""));
        return `### ${r["Nom"]}${group ? ` (${group})` : ""}\n\n${r["Texte"]}`;
      })
      .join("\n\n")}`,
  ].join("\n\n");
  const answersId = await ensureResource(
    CLIENT_ANSWERS.sourceId,
    {
      title: CLIENT_ANSWERS.title,
      content: answersContent,
      category: "Gestion de projet",
      tags: ["SantaConnect"],
    },
    `${CLIENT_ANSWERS.title} (4 pages + ${answerRows.length} réponses, ${answersContent.length} car.)`,
  );
  for (const n of CLIENT_ANSWERS.sessions)
    pendingLinks.push({ session: n, resourceId: answersId, label: CLIENT_ANSWERS.title });

  // Banque de questions du QCM (Moodle), en attendant la fonctionnalité dédiée.
  const questions = parseQuestionBank(moodle.questionsXml);
  if (questions.length) {
    const id = await ensureResource(
      `moodle:questions:${moodle.shortname}`,
      {
        title: "QCM — Gestion de projet (questions et réponses)",
        content: questionBankMarkdown(moodle.fullname, questions),
        category: "Évaluation",
        tags: ["QCM", "banque de questions"],
      },
      `QCM — Gestion de projet (${questions.length} questions, ${new Set(questions.map((q) => q.category)).size} thèmes)`,
    );
    pendingLinks.push({ session: QCM.session, resourceId: id, label: "QCM — banque de questions" });
  } else imp.warnings.push("Banque de questions Moodle vide ou absente.");

  const primaryDone = new Set<number>();
  for (const l of pendingLinks) {
    const primary = !primaryDone.has(l.session);
    primaryDone.add(l.session);
    await imp.link(
      "course_resource",
      {
        course_id: courseIds.get(l.session),
        resource_id: l.resourceId,
        role: primary ? "primary" : "secondary",
      },
      "course_id,resource_id",
      `Séance ${l.session} ↔ ${l.label}`,
    );
  }

  // ── Groupes ──────────────────────────────────────────────────────────────
  const groupRows = parseCsv(readFileSync(ctx.csv(GROUPS_DB), "utf8"));
  const groupIds = new Map<number, string>();
  for (const r of groupRows) {
    const n = Number(/(\d+)/.exec(r["Nom"] ?? "")?.[1]);
    if (!n) continue;
    const name = `Groupe ${n} – ${TEAM_NAMES[n] ?? ""}`.replace(/ – $/, "");
    groupIds.set(
      n,
      await imp.ensure(
        "student_group",
        "notion",
        `${GROUPS_DB}#groupe-${n}`,
        { module_id: moduleId, name, type: "project" },
        `${name} (projet)`,
      ),
    );
  }
  const groupNumbers = [...groupIds.keys()].sort((a, b) => a - b);

  // ── Étudiant·es (pages Notion) ───────────────────────────────────────────
  const courseDir = page(COURSE_PAGE).path.replace(/ [0-9a-f]{32}\.md$/, "");
  const studentsDir = join(courseDir, "Étudiant·es");
  const groupNumberById = new Map<string, number>();
  for (const f of readdirSync(join(courseDir, "Groupes projet fil rouge")))
    if (/[0-9a-f]{32}\.md$/.test(f)) {
      const p = page(/([0-9a-f]{32})\.md$/.exec(f)![1]);
      groupNumberById.set(p.id, Number(/(\d+)/.exec(p.title)?.[1]));
    }

  const students: { id: string; label: string; group: number | null; qcm: number | null }[] = [];
  const people: { first: string; last: string }[] = [];
  for (const f of readdirSync(studentsDir)
    .filter((x) => /[0-9a-f]{32}\.md$/.test(x))
    .sort()) {
    const p = page(/([0-9a-f]{32})\.md$/.exec(f)![1]);
    const { first, last } = splitNotionName(p.title);
    people.push({ first, last });
    const initial = `${last.charAt(0).toUpperCase()}.`;
    const label = `${first} ${initial}`;
    const group = groupNumberById.get(linkedIds(p.properties["Groupe"])[0] ?? "") ?? null;
    const promo = p.properties["Promo"] ?? "";
    const appreciation = (p.properties["Appréciation étudiant.e"] ?? "")
      .replace(/<br>/g, "\n")
      .trim();
    const id = await imp.ensure(
      "student",
      "notion",
      p.id,
      {
        first_name: first,
        last_name: initial,
        scholar_group: promo ? `M1 ${promo}` : null,
        personal_notes: appreciation ? `Gestion d'un projet IT (2025-26) : ${appreciation}` : null,
      },
      `${label} — ${promo || "promo ?"} — ${group ? `Groupe ${group}` : "sans groupe"}${appreciation ? " — appréciation" : ""}`,
    );
    students.push({ id, label, group, qcm: parseScore(p.properties["Note individuelle"]) });
    if (group && groupIds.get(group))
      await imp.link(
        "group_member",
        { student_group_id: groupIds.get(group), student_id: id },
        "student_group_id,student_id",
        `Groupe ${group} ← ${label}`,
      );
    else imp.warnings.push(`${label} : aucun groupe dans Notion.`);
  }

  // ── Grilles, évaluations, notes de groupe (détail par critère) ───────────
  const cadrageNotes = headingSections(page(CADRAGE_NOTES).body);
  for (const a of ASSESSMENTS) {
    const gridPage = page(a.grid);
    const criteria = parseTableGrid(gridPage.body);
    const total = criteria.reduce((s, c) => s + c.weight, 0);
    const gridId = await imp.ensure(
      "grading_grid",
      "notion",
      gridPage.id,
      { name: gridPage.title, description: null },
      `${gridPage.title} — ${criteria.map((c) => `${c.label} /${c.weight}`).join(" · ")} = /${total}`,
    );
    const criterionIds: string[] = [];
    for (const [i, c] of criteria.entries()) {
      criterionIds.push(
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
        ),
      );
    }

    const subjectPage = page(a.page);
    const subject = stripLocalImages(subjectPage.body);
    droppedImages += subject.dropped;
    const date = sessions[a.session - 1].when.date;
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
        is_group_grade: true,
        date,
      },
      `${subjectPage.title} — sujet ${subject.body.length} car., ${a.type}, ${date}, grille /${total}, ${groupNumbers.length} groupes`,
    );
    for (const n of groupNumbers)
      await imp.link(
        "assessment_group",
        { assessment_id: assessmentId, student_group_id: groupIds.get(n) },
        "assessment_id,student_group_id",
        `${subjectPage.title} → Groupe ${n}`,
      );

    // Détail par critère : matrice de correction (cadrage, specs) ou tableau de la page (oral).
    const matrix = a.matrix ? parseCsv(readFileSync(ctx.csv(a.matrix), "utf8")) : [];
    for (const suiviId of linkedIds(subjectPage.properties["📂 Suivi corrections"])) {
      const suivi = page(suiviId);
      const n = Number(/groupe\s*(\d+)/i.exec(suivi.title)?.[1]);
      const value = parseScore(suivi.properties["Note /20"]);
      if (!n || value === null || !groupIds.get(n)) {
        imp.warnings.push(`${suivi.title} : groupe ou note introuvable (ignoré).`);
        continue;
      }
      const table = parseCorrectionTable(suivi.body);
      const detail = criteria.map((c, i) => {
        const row = matrix.find(
          (r) => Number(/^\s*\**(\d+)\./.exec(r["Nom"] ?? "")?.[1]) === i + 1,
        );
        const fromTable = table.rows.find((r) => r.number === i + 1);
        return {
          criterion: c,
          id: criterionIds[i],
          score: row ? parseScore(row[`Note équipe ${n}`]) : (fromTable?.score ?? null),
          comment: (row ? row[`Commentaire équipe ${n}`] : fromTable?.comment) ?? "",
        };
      });
      const sum = detail.reduce((s, d) => s + (d.score ?? 0), 0);
      if (detail.some((d) => d.score === null))
        imp.warnings.push(`${suivi.title} : détail par critère incomplet.`);
      else if (Math.abs(sum - value) > 0.01)
        imp.warnings.push(
          `${suivi.title} : somme des critères ${sum} ≠ note ${value} (note conservée).`,
        );

      let global = table.global;
      if (!global && a.matrix === ASSESSMENTS[0].matrix)
        global =
          [...cadrageNotes.entries()].find(([k]) => new RegExp(`^groupe ${n}\\b`).test(k))?.[1] ??
          "";
      const feedback = [
        global,
        detail.some((d) => d.comment)
          ? `**Détail par critère**\n${detail
              .map(
                (d) =>
                  `- **${d.criterion.label}** — ${d.score ?? "?"}/${d.criterion.weight} : ${cleanInline(d.comment.replace(/<br>/g, " "))}`,
              )
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const scores = Object.fromEntries(
        detail.filter((d) => d.score !== null).map((d) => [d.id, d.score]),
      );

      await imp.ensure(
        "grade",
        "notion",
        suivi.id,
        {
          assessment_id: assessmentId,
          student_group_id: groupIds.get(n),
          is_group_grade: true,
          value,
          scores,
          feedback: feedback || null,
        },
        `${subjectPage.title} › Groupe ${n} : ${value}/20 (${Object.keys(scores).length} critères${global ? ", commentaire global" : ""})`,
      );
    }
  }

  // ── QCM individuel (note Notion = note Moodle ramenée sur 20) ────────────
  const qcmPage = page(QCM.page);
  const qcmId = await imp.ensure(
    "assessment",
    "notion",
    qcmPage.id,
    {
      module_id: moduleId,
      title: "QCM individuel",
      type: QCM.type,
      subject: QCM.subject,
      is_group_grade: false,
      date: sessions[QCM.session - 1].when.date,
      duration_minutes: QCM.duration,
      max_score: 20,
    },
    `QCM individuel — ${sessions[QCM.session - 1].when.date}, ${QCM.duration} min, /20, ${groupNumbers.length} groupes`,
  );
  for (const n of groupNumbers)
    await imp.link(
      "assessment_group",
      { assessment_id: qcmId, student_group_id: groupIds.get(n) },
      "assessment_id,student_group_id",
      `QCM individuel → Groupe ${n}`,
    );
  for (const s of students) {
    if (s.qcm === null) {
      imp.warnings.push(`${s.label} : pas de note de QCM.`);
      continue;
    }
    await imp.ensure(
      "grade",
      "notion",
      `${qcmPage.id}#${s.id}`,
      { assessment_id: qcmId, student_id: s.id, is_group_grade: false, value: s.qcm },
      `QCM › ${s.label} : ${s.qcm}/20`,
    );
  }

  // ── 2e passe : modèle de cadrage, retour d'expérience, commentaires, supports ──
  const linkNow = async (session: number, resourceId: string, label: string) =>
    imp.link(
      "course_resource",
      { course_id: courseIds.get(session), resource_id: resourceId, role: "secondary" },
      "course_id,resource_id",
      `Séance ${session} ↔ ${label}`,
    );

  const template = page(CADRAGE_TEMPLATE);
  const templateId = await ensureResource(
    template.id,
    {
      title: "Modèle — Dossier de cadrage SantaConnect",
      content: template.body,
      category: "Gestion de projet",
      tags: ["modèle", "SantaConnect"],
    },
    `Modèle — Dossier de cadrage SantaConnect (${template.body.length} car.)`,
  );
  await linkNow(3, templateId, "Modèle — Dossier de cadrage");

  const summaries = TEAM_SUMMARIES.map((id) => page(id));
  const retex = [
    "Synthèse des propositions des 6 équipes (projet SantaConnect, 2025-26) : positionnement, livrables, solution, MVP, points forts et points faibles. Noms des étudiant·es retirés.",
    ...summaries.map((p) => `## ${p.title}\n\n${anonymize(p.body, people)}`),
  ].join("\n\n");
  const leftovers = people
    .map((x) => x.first.split(/\s+/)[0])
    .filter((f) => f.length > 3 && new RegExp(`(?<!\\p{L})${f}(?!\\p{L})`, "u").test(retex));
  if (leftovers.length)
    imp.warnings.push(
      `Retour d'expérience : prénoms encore présents à vérifier (${[...new Set(leftovers)].join(", ")}).`,
    );
  const retexId = await ensureResource(
    `${NOTES_PREP}#retour-experience`,
    {
      title: "Retour d'expérience 2025 — propositions des équipes",
      content: retex,
      category: "Gestion de projet",
      tags: ["retour d'expérience", "SantaConnect"],
    },
    `Retour d'expérience 2025 — propositions des équipes (6 équipes, anonymisé, ${retex.length} car.)`,
  );
  await linkNow(7, retexId, "Retour d'expérience 2025");

  for (const [i, c] of PREDEFINED_COMMENTS.entries()) {
    await imp.ensure(
      "predefined_comment",
      "notion",
      `${NOTES_PREP}#commentaire-${i + 1}`,
      { text: c.text, category: c.category, tags: ["gestion de projet", ...c.tags] },
      `[${c.category}] ${c.text}`,
    );
  }

  for (const f of PDFS) {
    const path = join(page(f.page).path.replace(/ [0-9a-f]{32}\.md$/, ""), f.file);
    if (f.to === "resource") {
      const resourceId = resourceIds.get(RISK_ACTIVITY);
      if (resourceId)
        await attachResourceFile(imp, resourceId, path, "Identifier et gérer les risques projet");
      else imp.warnings.push(`Ressource cible absente pour ${f.file}.`);
    } else
      await importModuleDocument(imp, moduleId, "slides", path, `${f.page}#pdf:${f.file}`, f.name);
  }

  // ── Documents du module ──────────────────────────────────────────────────
  await importModuleDocument(
    imp,
    moduleId,
    "outline_sent",
    ctx.outlinePdf,
    `${COURSE_PAGE}#trame-envoyee`,
    "Progression pédagogique — Gestion d'un projet IT (M1).pdf",
  );
  await importModuleDocument(
    imp,
    moduleId,
    "external_invoice",
    ctx.invoicePdf,
    `${COURSE_PAGE}#facture-26-01-5`,
    "Facture 26-01-5 — Nantes Ynov Campus.pdf",
  );

  if (droppedImages)
    imp.warnings.push(`${droppedImages} image(s) retirée(s) des sujets d'évaluation.`);
  for (const issue of imageIssues) imp.warnings.push(`Image non importée — ${issue}`);
  imp.warnings.push(
    "Non importés (décision PO) : dossiers de cadrage des groupes (gabarits restés vides), classement des groupes, liens Jira/Trello.",
  );
}
