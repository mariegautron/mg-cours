// Audit LECTURE SEULE des modules importés (Notion / Moodle) : cohérence des données telles
// que l'application les lit (séances, ressources, groupes, évaluations, grilles, notes).
//   node scripts/notion-migrate/audit.mts --env .env.vercel.local [--owner-email …]
// N'écrit rien : uniquement des `select`.
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

// Lignes lues telles quelles (audit ad hoc, colonnes variées) : typage volontairement souple.
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

async function rows(table: string, columns: string, match: Row = {}): Promise<Row[]> {
  let q = sb.from(table).select(columns).eq("owner_id", owner);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data, error } = await q.limit(10000);
  if (error) throw new Error(`${table} : ${error.message}`);
  return (data ?? []) as unknown as Row[];
}
async function inList(table: string, columns: string, col: string, ids: string[]): Promise<Row[]> {
  if (!ids.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .eq("owner_id", owner)
      .in(col, ids.slice(i, i + 150))
      .limit(10000);
    if (error) throw new Error(`${table} : ${error.message}`);
    out.push(...((data ?? []) as unknown as Row[]));
  }
  return out;
}

let problems = 0;
const ok = (s: string) => console.log(`  ✅ ${s}`);
const bad = (s: string) => {
  problems++;
  console.log(`  ⚠️  ${s}`);
};
const check = (cond: boolean, good: string, wrong: string) => (cond ? ok(good) : bad(wrong));
const round = (n: number) => Math.round(n * 100) / 100;

const refs = await rows("import_ref", "target_id", { target_table: "module" });
const modules = (
  await inList(
    "module",
    "*",
    "id",
    refs.map((r) => String(r.target_id)),
  )
).sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
console.log(`Audit lecture seule — ${modules.length} module(s) importé(s)\n`);

for (const m of modules) {
  console.log(`\n══ ${m.name} (${m.year}) — ${m.level} — ${m.ycode ?? "YCODE ?"} ══`);

  // Module
  check(!!m.ycode, `YCODE ${m.ycode}`, "YCODE vide");
  check(
    Number(m.total_hours) > 0 && !!m.hourly_rate,
    `${m.total_hours} h à ${m.hourly_rate} €/h`,
    "heures ou taux horaire manquants",
  );
  ok(
    `état ${m.iceberg_state}, ${m.archived_at ? "rangé" : "non rangé"}, ${m.finished_at ? "terminé" : "non terminé"}`,
  );
  check(
    !!m.student_intro,
    "présentation aux étudiant·es renseignée",
    "présentation aux étudiant·es vide",
  );

  // Séances
  const courses = (
    await rows(
      "course",
      "id, position, title, session_date, start_time, end_time, completion, prep_status, learning_objectives",
      { module_id: m.id },
    )
  ).sort((a, b) => a.position - b.position);
  const links = await inList(
    "course_resource",
    "course_id, resource_id",
    "course_id",
    courses.map((c) => c.id),
  );
  const planned = courses.reduce((n, c) => {
    if (!c.start_time || !c.end_time) return n;
    const [h1, m1] = String(c.start_time).split(":").map(Number);
    const [h2, m2] = String(c.end_time).split(":").map(Number);
    return n + (h2 + m2 / 60 - (h1 + m1 / 60));
  }, 0);
  console.log(`\n  Séances : ${courses.length}`);
  check(courses.length > 0, `${courses.length} séance(s)`, "aucune séance");
  check(
    courses.every((c) => c.title && c.session_date),
    "toutes avec titre et date",
    `${courses.filter((c) => !c.title || !c.session_date).length} séance(s) sans titre ou sans date`,
  );
  check(
    courses.every((c) => c.start_time && c.end_time),
    `horaires renseignés (${round(planned)} h planifiées / ${m.total_hours} h)`,
    `${courses.filter((c) => !c.start_time || !c.end_time).length} séance(s) sans horaires (${round(planned)} h planifiées / ${m.total_hours} h)`,
  );
  check(
    courses.every((c) => c.completion),
    "toutes clôturées (faite)",
    `${courses.filter((c) => !c.completion).length} séance(s) sans clôture`,
  );
  check(
    courses.every((c) => (c.learning_objectives ?? []).length > 0),
    "objectifs renseignés",
    `${courses.filter((c) => !(c.learning_objectives ?? []).length).length} séance(s) sans objectifs`,
  );
  const noRes = courses.filter((c) => !links.some((l) => l.course_id === c.id));
  check(
    noRes.length === 0,
    "chaque séance a au moins une ressource",
    `${noRes.length} séance(s) sans ressource : ${noRes.map((c) => c.position).join(", ")}`,
  );

  // Attendus
  const expectations = await rows("module_expectation", "id, origin", { module_id: m.id });
  const coverLinks = await inList(
    "course_expectation",
    "expectation_id",
    "course_id",
    courses.map((c) => c.id),
  );
  console.log(
    `\n  Attendus : ${expectations.length} (${expectations.filter((e) => e.origin === "custom").length} personnels)`,
  );
  check(expectations.length > 0, "attendus présents", "aucun attendu (Rapprochement vide)");
  if (expectations.length) {
    const uncovered = expectations.filter(
      (e) => !coverLinks.some((l) => l.expectation_id === e.id),
    );
    check(
      uncovered.length === 0,
      "tous liés à une séance",
      `${uncovered.length} attendu(s) non rattaché(s) à une séance`,
    );
  }

  // Groupes et étudiant·es
  const groups = await rows("student_group", "id, name, type", { module_id: m.id });
  const members = await inList(
    "group_member",
    "student_group_id, student_id",
    "student_group_id",
    groups.map((g) => g.id),
  );
  const students = await inList("student", "id, first_name, last_name", "id", [
    ...new Set(members.map((x) => String(x.student_id))),
  ]);
  console.log(`\n  Groupes : ${groups.length} · étudiant·es : ${students.length}`);
  const emptyGroups = groups.filter((g) => !members.some((x) => x.student_group_id === g.id));
  check(
    emptyGroups.length === 0,
    "aucun groupe vide",
    `groupes vides : ${emptyGroups.map((g) => g.name).join(", ")}`,
  );
  const years = await inList(
    "student_year",
    "student_id",
    "student_id",
    students.map((s) => s.id),
  );
  check(
    students.every((s) => years.some((y) => y.student_id === s.id)),
    "année scolaire présente pour tous",
    `${students.filter((s) => !years.some((y) => y.student_id === s.id)).length} étudiant·e(s) sans année`,
  );

  // Évaluations
  const assessments = (
    await rows(
      "assessment",
      "id, title, type, exam_kind, is_group_grade, max_score, date, duration_minutes, grading_grid_id, course_id, project_id, project_role, prep_status, subject, auto_validated_criterion_ids, makeup_of_id",
      { module_id: m.id },
    )
  ).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const targets = await inList(
    "assessment_group",
    "assessment_id, student_group_id",
    "assessment_id",
    assessments.map((a) => a.id),
  );
  const grades = await inList(
    "grade",
    "id, assessment_id, student_id, student_group_id, is_group_grade, value, scores, feedback, criterion_comments, attendance",
    "assessment_id",
    assessments.map((a) => a.id),
  );
  const gridIds = [...new Set(assessments.map((a) => a.grading_grid_id).filter(Boolean))];
  const criteria = await inList(
    "grid_criterion",
    "id, grading_grid_id, label, weight, is_bonus, axis_id, position",
    "grading_grid_id",
    gridIds,
  );
  const levels = await inList(
    "criterion_level",
    "grid_criterion_id",
    "grid_criterion_id",
    criteria.map((c) => c.id),
  );
  const project = (await rows("module_project", "id, title, brief_md", { module_id: m.id }))[0];

  console.log(
    `\n  Évaluations : ${assessments.length}${project ? ` · projet « ${project.title} »` : ""}`,
  );
  for (const a of assessments) {
    console.log(`\n   ── « ${a.title} » (${a.type}) ${a.date ?? "sans date"}`);
    const crit = criteria.filter((c) => c.grading_grid_id === a.grading_grid_id);
    const gridTotal = crit.filter((c) => !c.is_bonus).reduce((n, c) => n + Number(c.weight), 0);
    const max = Number(a.max_score) > 0 ? Number(a.max_score) : gridTotal > 0 ? gridTotal : 20;
    const aTargets = targets
      .filter((t) => t.assessment_id === a.id)
      .map((t) => String(t.student_group_id));
    const aGrades = grades.filter((g) => g.assessment_id === a.id);

    check(!!a.date, `date ${a.date}`, "pas de date");
    check(!!a.course_id, "rattachée à une séance", "pas de séance liée (course_id vide)");
    check(!!a.exam_kind, `type d'épreuve ${a.exam_kind}`, "exam_kind vide");
    check(
      a.prep_status !== "to_build",
      `préparation : ${a.prep_status}`,
      "préparation « à construire » alors qu'elle est importée",
    );
    check(
      String(a.subject ?? "").length > 0,
      `sujet ${String(a.subject ?? "").length} car.`,
      "sujet vide",
    );
    if (project)
      check(
        a.project_id === project.id,
        `projet lié (${a.project_role ?? "rôle ?"})`,
        a.project_id ? "projet lié mais sans rôle" : "non rattachée au projet fil rouge",
      );
    check(
      a.is_group_grade ? aTargets.length > 0 : true,
      `${aTargets.length} groupe(s) visé(s)`,
      "aucun groupe visé (assessment_group vide)",
    );
    if (a.grading_grid_id) {
      const levelCount = levels.filter((l) =>
        crit.some((c) => c.id === l.grid_criterion_id),
      ).length;
      check(
        crit.length > 0,
        `grille : ${crit.length} critère(s), total ${round(gridTotal)}${levelCount ? `, ${levelCount} palier(s)` : ""}`,
        "grille sans critère",
      );
      check(
        Math.abs(max - gridTotal) < 0.01 || Number(a.max_score) > 0,
        `barème /${max}`,
        `barème /${max} ≠ total de la grille /${gridTotal}`,
      );
      if (
        Number(a.max_score) > 0 &&
        gridTotal > 0 &&
        Math.abs(Number(a.max_score) - gridTotal) > 0.01
      )
        console.log(
          `     ℹ️ barème de l'évaluation /${a.max_score} ≠ total de la grille /${round(gridTotal)} (note ramenée sur 20 par l'app)`,
        );
    } else console.log(`     ℹ️ sans grille (barème /${max})`);

    // Notes
    const expected = a.is_group_grade ? aTargets.length : students.length;
    const noted = aGrades.filter((g) => g.value !== null);
    check(
      noted.length > 0,
      `${noted.length} note(s) saisie(s) (attendues : ${a.is_group_grade ? `${aTargets.length} groupes` : `${students.length} étudiant·es`})`,
      "aucune note",
    );
    if (noted.length && noted.length !== expected)
      console.log(
        `     ℹ️ ${noted.length} note(s) pour ${expected} ${a.is_group_grade ? "groupe(s)" : "étudiant·e(s)"}`,
      );
    const tooHigh = noted.filter((g) => Number(g.value) > max + 0.01);
    check(
      tooHigh.length === 0,
      "aucune note au-dessus du barème",
      `${tooHigh.length} note(s) > barème /${max} (bonus ?)`,
    );
    const wrongKind = aGrades.filter(
      (g) => Boolean(g.is_group_grade) !== Boolean(a.is_group_grade),
    );
    check(
      wrongKind.length === 0,
      "type de note cohérent (groupe / individuel)",
      `${wrongKind.length} note(s) de mauvais type`,
    );
    const badKeys = aGrades.filter((g) =>
      Object.keys(g.scores ?? {}).some((k) => !crit.some((c) => c.id === k)),
    );
    check(
      badKeys.length === 0,
      "détails par critère rattachés à la grille",
      `${badKeys.length} note(s) avec des critères inconnus`,
    );
    const withScores = aGrades.filter((g) => Object.keys(g.scores ?? {}).length > 0);
    if (withScores.length) {
      const gaps = withScores.filter((g) => {
        const sum = Object.values(g.scores as Record<string, number>).reduce(
          (n, v) => n + Number(v),
          0,
        );
        return g.value !== null && Math.abs(sum - Number(g.value)) > 0.01;
      });
      if (gaps.length)
        console.log(
          `     ℹ️ ${gaps.length}/${withScores.length} note(s) dont la somme des critères diffère de la note (bonus ou arrondi conservés)`,
        );
      else ok(`${withScores.length} note(s) : somme des critères = note`);
    }
    const commentKeys = aGrades.filter((g) =>
      Object.keys(g.criterion_comments ?? {}).some(
        (k) => !k.startsWith("axis:") && !k.startsWith("checks:") && !crit.some((c) => c.id === k),
      ),
    );
    check(
      commentKeys.length === 0,
      "commentaires par critère rattachés à la grille",
      `${commentKeys.length} note(s) avec des commentaires de critères inconnus`,
    );
    const orphanGroup = aGrades.filter(
      (g) => g.student_group_id && !groups.some((x) => x.id === g.student_group_id),
    );
    check(
      orphanGroup.length === 0,
      "notes rattachées à un groupe du module",
      `${orphanGroup.length} note(s) d'un groupe étranger au module`,
    );
    const orphanStudent = aGrades.filter(
      (g) => g.student_id && !students.some((s) => s.id === g.student_id),
    );
    check(
      orphanStudent.length === 0,
      "notes rattachées à un·e étudiant·e du module",
      `${orphanStudent.length} note(s) d'un·e étudiant·e hors module`,
    );
    const noFeedback = noted.filter(
      (g) => !g.feedback && !Object.keys(g.criterion_comments ?? {}).length,
    ).length;
    if (noFeedback) console.log(`     ℹ️ ${noFeedback} note(s) sans commentaire`);
  }

  // Ressources
  const resIds = [...new Set(links.map((l) => String(l.resource_id)))];
  const resources = await inList(
    "resource",
    "id, title, kind, audience, status, category",
    "id",
    resIds,
  );
  console.log(`\n  Ressources liées : ${resources.length}`);
  check(
    resources.every((r) => r.kind),
    "toutes classées (type)",
    `${resources.filter((r) => !r.kind).length} ressource(s) sans type`,
  );
  check(
    resources.every((r) => r.status === "ready"),
    "toutes prêtes",
    `${resources.filter((r) => r.status !== "ready").length} ressource(s) « à construire »`,
  );
  check(
    resources.every((r) => r.category),
    "toutes avec une matière",
    `${resources.filter((r) => !r.category).length} ressource(s) sans matière`,
  );

  // Documents
  const docs = await rows("module_document", "kind", { module_id: m.id });
  console.log(`\n  Documents : ${docs.map((d) => d.kind).join(", ") || "aucun"}`);
  check(
    docs.some((d) => d.kind === "outline_sent"),
    "progression envoyée déposée",
    "pas de progression envoyée",
  );
  check(
    docs.some((d) => d.kind === "external_invoice"),
    "facture déposée",
    "pas de facture déposée",
  );
  check(
    docs.some((d) => d.kind === "school_expectations"),
    "fiche école déposée",
    "pas de fiche école (PDF)",
  );
}

// Transversal
const questions = await rows("question", "id, category, type");
const noAnswer = await inList(
  "question_choice",
  "question_id, is_correct",
  "question_id",
  questions.map((q) => String(q.id)),
);
console.log(`\n══ Banque de questions : ${questions.length} ══`);
const withoutCorrect = questions.filter(
  (q) =>
    ["single_choice", "multiple_choice", "true_false"].includes(q.type) &&
    !noAnswer.some((c) => c.question_id === q.id && c.is_correct),
);
check(
  withoutCorrect.length === 0,
  "toutes les questions à choix ont une bonne réponse",
  `${withoutCorrect.length} question(s) à choix sans bonne réponse (M2 : à définir)`,
);

console.log(
  `\n${problems === 0 ? "✅ Aucun point à corriger." : `⚠️  ${problems} point(s) à vérifier (voir ⚠️ ci-dessus ; les ℹ️ sont des remarques).`}`,
);
