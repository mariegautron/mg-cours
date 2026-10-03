// Rapport de santé des données (LECTURE SEULE) : hygiène des données importées et inventaire de la
// bibliothèque réutilisable pour un nouveau module. Sortie en Markdown.
//   node scripts/notion-migrate/health.mts --env .env.vercel.local [--owner-email …] > rapport.md
// N'écrit rien : uniquement des `select`.
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

// Lignes lues telles quelles (rapport ad hoc, colonnes variées) : typage volontairement souple.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function loadEnv(path: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
      .filter((m) => m !== null)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}

const argv = process.argv.slice(2);
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const env = loadEnv(arg("env") ?? ".env.vercel.local");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: users, error: userError } = await sb.auth.admin.listUsers();
if (userError) throw new Error(userError.message);
const email = arg("owner-email");
const owners = email ? users.users.filter((u) => u.email === email) : users.users;
if (owners.length !== 1) throw new Error(`Propriétaire ambigu (${owners.length}) : --owner-email`);
const owner = owners[0].id;

async function all(table: string, columns: string): Promise<Row[]> {
  const { data, error } = await sb.from(table).select(columns).eq("owner_id", owner).limit(20000);
  if (error) throw new Error(`${table} : ${error.message}`);
  return (data ?? []) as unknown as Row[];
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const cut = (s: unknown, n = 90) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .slice(0, n);
const out: string[] = [];
const line = (s = "") => out.push(s);
const issues: string[] = [];
function flag(ok: boolean, good: string, wrong: string) {
  line(`- ${ok ? "✅" : "⚠️"} ${ok ? good : wrong}`);
  if (!ok) issues.push(wrong);
}

const [
  modules,
  courses,
  courseRes,
  moduleRes,
  resources,
  students,
  years,
  groups,
  members,
  assessments,
  assessmentGroups,
  grids,
  criteria,
  comments,
  questions,
  choices,
  groupGrades,
] = await Promise.all([
  all("module", "id, name, year, ycode, level, total_hours, archived_at, finished_at"),
  all("course", "id, module_id, title, position"),
  all("course_resource", "course_id, resource_id"),
  all("module_resource", "module_id, resource_id"),
  all("resource", "id, title, kind, category, audience, status, tags, url, files, content"),
  all("student", "id, first_name, last_name, scholar_group"),
  all("student_year", "student_id, year, scholar_group"),
  all("student_group", "id, module_id, name"),
  all("group_member", "student_group_id, student_id"),
  all("assessment", "id, module_id, title, grading_grid_id"),
  all("assessment_group", "assessment_id, student_group_id"),
  all("grading_grid", "id, name"),
  all("grid_criterion", "id, grading_grid_id, is_bonus, weight"),
  all("predefined_comment", "id, text, category, subject, grid_criterion_id, tags"),
  all("question", "id, category, type, tags"),
  all("question_choice", "question_id, is_correct"),
  all("grade", "id, assessment_id"),
]);

line(`# Rapport de santé des données — ${new Date().toISOString().slice(0, 10)}`);
line();
line(
  `Volumes : ${modules.length} module(s), ${courses.length} séance(s), ${resources.length} ressource(s), ${students.length} étudiant·e(s), ${groups.length} groupe(s), ${assessments.length} évaluation(s), ${grids.length} grille(s), ${comments.length} phrase(s) de correction, ${questions.length} question(s), ${groupGrades.length} note(s).`,
);

// 1. Modules
line("\n## 1. Modules\n");
for (const m of modules) {
  const missing = ["year", "ycode", "level", "total_hours"].filter((k) => !m[k]);
  flag(
    missing.length === 0,
    `${m.name} (${m.year}) : année, YCODE, niveau et heures renseignés`,
    `${m.name} (${m.year ?? "année ?"}) : champs vides : ${missing.join(", ")}`,
  );
}
flag(
  modules.every((m) => courses.some((c) => c.module_id === m.id)),
  "tous les modules ont des séances",
  `modules sans séance : ${modules
    .filter((m) => !courses.some((c) => c.module_id === m.id))
    .map((m) => m.name)
    .join(", ")}`,
);

// 2. Ressources
line("\n## 2. Ressources\n");
const noTitle = resources.filter((r) => !String(r.title ?? "").trim());
flag(
  noTitle.length === 0,
  "aucune ressource sans titre",
  `${noTitle.length} ressource(s) sans titre`,
);
const byTitle = new Map<string, Row[]>();
for (const r of resources)
  byTitle.set(fold(String(r.title ?? "")), [
    ...(byTitle.get(fold(String(r.title ?? ""))) ?? []),
    r,
  ]);
const dupTitles = [...byTitle.entries()].filter(([k, v]) => k && v.length > 1);
flag(
  dupTitles.length === 0,
  "aucun doublon de titre",
  `${dupTitles.length} titre(s) en double : ${dupTitles.map(([, v]) => `« ${cut(v[0].title, 50)} » ×${v.length}`).join(" ; ")}`,
);
const byUrl = new Map<string, Row[]>();
for (const r of resources.filter((x) => x.url))
  byUrl.set(String(r.url).replace(/\/$/, ""), [
    ...(byUrl.get(String(r.url).replace(/\/$/, "")) ?? []),
    r,
  ]);
const dupUrls = [...byUrl.entries()].filter(([, v]) => v.length > 1);
flag(
  dupUrls.length === 0,
  "aucun lien en double",
  `${dupUrls.length} lien(s) en double : ${dupUrls.map(([u, v]) => `${cut(u, 60)} ×${v.length}`).join(" ; ")}`,
);
flag(
  resources.every((r) => r.kind),
  "toutes classées (type)",
  `${resources.filter((r) => !r.kind).length} ressource(s) sans type`,
);
flag(
  resources.every((r) => r.category),
  "toutes avec une matière",
  `${resources.filter((r) => !r.category).length} ressource(s) sans matière`,
);
flag(
  resources.every((r) => r.status === "ready" || !r.status),
  "toutes prêtes",
  `${resources.filter((r) => r.status && r.status !== "ready").length} ressource(s) « à construire » : ${resources
    .filter((r) => r.status && r.status !== "ready")
    .map((r) => cut(r.title, 50))
    .join(" ; ")}`,
);
const empty = resources.filter(
  (r) => !String(r.content ?? "").trim() && !r.url && !(r.files ?? []).length,
);
flag(
  empty.length === 0,
  "aucune ressource vide (ni contenu, ni lien, ni fichier)",
  `${empty.length} ressource(s) vide(s) : ${empty.map((r) => cut(r.title, 50)).join(" ; ")}`,
);

// Tags
const tagCount = new Map<string, number>();
for (const r of resources)
  for (const t of r.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
const tagGroups = new Map<string, string[]>();
for (const t of tagCount.keys())
  tagGroups.set(fold(t).replace(/s$/, ""), [
    ...(tagGroups.get(fold(t).replace(/s$/, "")) ?? []),
    t,
  ]);
const tagVariants = [...tagGroups.values()].filter((v) => v.length > 1);
flag(
  tagVariants.length === 0,
  `tags cohérents (${tagCount.size} tags distincts)`,
  `${tagVariants.length} tag(s) en variantes : ${tagVariants.map((v) => v.map((t) => `« ${t} »`).join(" / ")).join(" ; ")}`,
);
line(`- ℹ️ ${resources.filter((r) => !(r.tags ?? []).length).length} ressource(s) sans tag`);

// 3. Étudiant·es, groupes, séances
line("\n## 3. Étudiant·es, groupes, séances\n");
const noYear = students.filter((s) => !years.some((y) => y.student_id === s.id));
flag(
  noYear.length === 0,
  "tous les étudiant·es ont une année scolaire",
  `${noYear.length} étudiant·e(s) sans année : ${noYear.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}`,
);
const noPromo = students.filter(
  (s) =>
    years.some((y) => y.student_id === s.id) &&
    !years.filter((y) => y.student_id === s.id).some((y) => y.scholar_group),
);
flag(
  noPromo.length === 0,
  "toutes les années ont une promotion",
  `${noPromo.length} étudiant·e(s) avec une année mais sans promotion : ${noPromo.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}`,
);
const noGroup = students.filter((s) => !members.some((m) => m.student_id === s.id));
flag(
  noGroup.length === 0,
  "tous les étudiant·es sont dans un groupe",
  `${noGroup.length} étudiant·e(s) sans groupe : ${noGroup.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}`,
);
const emptyGroups = groups.filter((g) => !members.some((m) => m.student_group_id === g.id));
flag(
  emptyGroups.length === 0,
  "aucun groupe vide",
  `${emptyGroups.length} groupe(s) vide(s) : ${emptyGroups.map((g) => g.name).join(", ")}`,
);
const untargeted = groups.filter(
  (g) =>
    !assessmentGroups.some((a) => a.student_group_id === g.id) &&
    assessments.some((a) => a.module_id === g.module_id),
);
flag(
  untargeted.length === 0,
  "chaque groupe est visé par une évaluation",
  `${untargeted.length} groupe(s) sans évaluation : ${untargeted.map((g) => g.name).join(", ")}`,
);
const orphanCourses = courses.filter((c) => !modules.some((m) => m.id === c.module_id));
flag(
  orphanCourses.length === 0,
  "aucune séance orpheline",
  `${orphanCourses.length} séance(s) sans module`,
);
const bare = courses.filter((c) => !courseRes.some((l) => l.course_id === c.id));
flag(
  bare.length === 0,
  "chaque séance a au moins une ressource",
  `${bare.length} séance(s) sans ressource : ${bare.map((c) => `${modules.find((m) => m.id === c.module_id)?.name} S${c.position}`).join(", ")}`,
);
const noGrid = assessments.filter((a) => !a.grading_grid_id);
line(
  `- ℹ️ ${noGrid.length} évaluation(s) sans grille : ${noGrid.map((a) => cut(a.title, 40)).join(" ; ") || "aucune"}`,
);

// 4. Banque de questions
line("\n## 4. Banque de questions\n");
const noCorrect = questions.filter(
  (q) =>
    ["single_choice", "multiple_choice", "true_false"].includes(q.type) &&
    !choices.some((c) => c.question_id === q.id && c.is_correct),
);
flag(
  noCorrect.length === 0,
  "toutes les questions à choix ont une bonne réponse",
  `${noCorrect.length} question(s) à choix sans bonne réponse`,
);
const unclassified = questions.filter((q) => q.category === "À classer");
line(`- ℹ️ ${unclassified.length}/${questions.length} question(s) en catégorie « À classer »`);

// 5. Bibliothèque réutilisable
line("\n## 5. Bibliothèque réutilisable pour un nouveau module\n");
const usedIn = (id: string) =>
  courseRes.filter((l) => l.resource_id === id).length +
  moduleRes.filter((l) => l.resource_id === id).length;
const FAMILIES: [string, string[]][] = [
  ["Cours", ["course"]],
  ["Ateliers", ["workshop"]],
  ["Évaluations (projets, modèles, corrigés)", ["project", "template", "answer_key"]],
  ["QCM (banques)", ["question_bank"]],
  ["Références", ["reference"]],
  ["Notes enseignante", ["teacher_notes"]],
];
for (const [label, kinds] of FAMILIES) {
  const list = resources.filter((r) => kinds.includes(r.kind));
  line(`\n### ${label} — ${list.length}\n`);
  const byCat = new Map<string, Row[]>();
  for (const r of list)
    byCat.set(r.category ?? "(sans matière)", [
      ...(byCat.get(r.category ?? "(sans matière)") ?? []),
      r,
    ]);
  for (const [cat, items] of [...byCat.entries()].sort()) {
    line(`**${cat}** (${items.length})`);
    for (const r of items.sort((a, b) => String(a.title).localeCompare(String(b.title), "fr")))
      line(
        `- ${cut(r.title, 100)} — ${r.audience === "teacher" ? "enseignante · " : ""}${usedIn(r.id)} usage(s)${(r.tags ?? []).length ? ` · ${(r.tags as string[]).join(", ")}` : ""}`,
      );
    line();
  }
}
line("\n### Grilles de correction\n");
for (const g of grids) {
  const cs = criteria.filter((c) => c.grading_grid_id === g.id);
  const used = assessments.filter((a) => a.grading_grid_id === g.id).length;
  line(
    `- ${cut(g.name, 90)} — ${cs.length} critère(s), total ${cs.filter((c) => !c.is_bonus).reduce((n, c) => n + Number(c.weight), 0)}${cs.some((c) => c.is_bonus) ? " + bonus" : ""} — ${used} évaluation(s)`,
  );
}
line("\n### Phrases de correction\n");
const bySubject = new Map<string, number>();
for (const c of comments)
  bySubject.set(
    c.subject ?? "(sans matière)",
    (bySubject.get(c.subject ?? "(sans matière)") ?? 0) + 1,
  );
for (const [s, n] of [...bySubject.entries()].sort()) line(`- ${s} : ${n}`);
line(`- dont ${comments.filter((c) => c.grid_criterion_id).length} liée(s) à un critère`);

line(
  `\n---\n${issues.length === 0 ? "✅ Aucun point d'hygiène à corriger." : `⚠️ ${issues.length} point(s) d'hygiène à examiner (voir ⚠️).`}`,
);
console.log(out.join("\n"));
