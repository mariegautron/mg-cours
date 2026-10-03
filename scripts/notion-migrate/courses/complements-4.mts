// Compléments 4 (écrans refaits, 03/10) — à valider par écriture :
//  a) séances passées des modules terminés → completion = 'done' ;
//  b) tags des ressources d'activités (type, objectif pédagogique) quand ils sont vides ;
//  c) banques GP (69) et M2 (60) → vraies questions de la banque (catégorie « À classer ») ;
//  d) retrait du doublon « Livrable » de course.assessment_notes (GP) si course_plan le contient.
// Simulation par défaut ; chaque passe ne complète que ce qui est vide ou resté tel que l'import l'a posé.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Importer } from "../lib/importer.mts";
import type { MoodleCourse } from "../lib/moodle.mts";
import {
  htmlToMarkdown,
  parseQuestionBank,
  type MoodleQuestion,
} from "../lib/moodle-questions.mts";
import type { NotionPage } from "../lib/notion.mts";

import { complete, select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
  moodle: MoodleCourse | null;
}

const TO_CLASSIFY = "À classer";
const M2_QUESTIONS_HTML = join(homedir(), "Bureau/exports/moodle/m2-questions.html");
const GP_COURSE_KEY = "gp-2526";
const M2_COURSE_KEY = "nantesynovcampus2024devwebmast2m2s2-elective2";

// ── a) Séances passées → faites ────────────────────────────────────────────

async function completions({ imp }: CourseContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  const today = new Date().toISOString().slice(0, 10);
  for (const ref of refs) {
    const [mod] = await select(imp, "module", "id, name, year, finished_at", { id: ref.target_id });
    if (!mod?.finished_at) continue;
    const courses = await select(imp, "course", "id, title, position, session_date, completion", {
      module_id: mod.id,
    });
    for (const c of courses.sort((a, b) => Number(a.position) - Number(b.position))) {
      if (c.completion || !c.session_date || String(c.session_date) > today) continue;
      await complete(
        imp,
        "course",
        String(c.id),
        { completion: "done" },
        `${String(mod.name)} (${String(mod.year)}) › séance ${String(c.position)} « ${String(c.title).slice(0, 50)} » (${String(c.session_date)}) → faite`,
      );
    }
  }
}

// ── b) Tags des ressources d'activités ─────────────────────────────────────

/** « 🧠 Comprendre : Assimiler des notions… » → « comprendre ». */
function objectiveTag(value: string): string[] {
  return value
    .split(/,\s*(?=[^\p{L}\d]*\p{Lu})/u)
    .map((part) =>
      part
        .split(":")[0]
        .replace(/^[^\p{L}\d]+/u, "")
        .trim()
        .toLocaleLowerCase("fr"),
    )
    .filter(Boolean);
}

async function resourceTags({ imp, page, has }: CourseContext) {
  const refs = await select(imp, "import_ref", "source_id, target_id", {
    target_table: "resource",
    source: "notion",
  });
  for (const ref of refs) {
    const sourceId = String(ref.source_id);
    if (!/^[0-9a-f]{32}$/.test(sourceId) || !has(sourceId)) continue;
    const p = page(sourceId);
    const type = (p.properties["Type"] ?? "").trim().toLocaleLowerCase("fr");
    const objectives = objectiveTag(p.properties["Objectifs pédagogiques"] ?? "");
    const wanted = [...new Set([type, ...objectives].filter(Boolean))];
    if (!wanted.length) continue;
    const [res] = await select(imp, "resource", "id, title, tags", { id: ref.target_id });
    if (!res) continue;
    const current = (res.tags as string[] | null) ?? [];
    const missing = wanted.filter((t) => !current.includes(t));
    if (current.length || !missing.length) continue;
    await complete(
      imp,
      "resource",
      String(res.id),
      { tags: wanted },
      `${String(res.title).slice(0, 60)} : tags [${wanted.join(", ")}]`,
    );
  }
}

// ── c) Banques de questions ────────────────────────────────────────────────

interface PlannedChoice {
  text: string;
  correct: boolean;
  fraction: number;
  feedback: string;
}
interface PlannedQuestion {
  name: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "numerical" | "open";
  statement: string;
  feedback: string;
  points: number;
  theme: string;
  choices: PlannedChoice[];
  numericValue: number | null;
  tolerance: number | null;
  /** Remarque affichée dans le rapport (question à reprendre à la main). */
  note: string | null;
}

const clampFraction = (f: number) => Math.max(-1, Math.min(1, Math.round(f * 10000) / 10000));

export function planFromMoodle(q: MoodleQuestion): PlannedQuestion {
  const base = {
    name: q.name.slice(0, 500),
    statement: q.text,
    feedback: q.feedback,
    points: q.points,
    theme: q.category,
    numericValue: null as number | null,
    tolerance: null as number | null,
    note: null as string | null,
  };
  const choices = q.answers.map((a) => ({
    text: a.text.replace(/\n+/g, " ").trim(),
    correct: a.fraction > 0,
    fraction: clampFraction(a.fraction),
    feedback: a.feedback,
  }));
  if (q.type === "truefalse") {
    const yes = choices.find((c) => /^(vrai|true)/i.test(c.text));
    const correctIsTrue = yes ? yes.correct : (choices[0]?.correct ?? true);
    return {
      ...base,
      type: "true_false",
      choices: [
        { text: "Vrai", correct: correctIsTrue, fraction: correctIsTrue ? 1 : 0, feedback: "" },
        { text: "Faux", correct: !correctIsTrue, fraction: correctIsTrue ? 0 : 1, feedback: "" },
      ],
    };
  }
  if (q.type === "numerical") {
    const best = q.answers.find((a) => a.fraction > 0);
    const value = Number((best?.text ?? "").replace(",", "."));
    if (Number.isFinite(value) && best)
      return {
        ...base,
        type: "numerical",
        choices: [],
        numericValue: value,
        tolerance: q.tolerance,
      };
    return {
      ...base,
      type: "open",
      choices: [],
      note: "numérique sans valeur lisible : importée en question ouverte",
    };
  }
  if (q.type === "multichoice") {
    const good = choices.filter((c) => c.correct).length;
    return { ...base, type: good > 1 ? "multiple_choice" : "single_choice", choices };
  }
  return { ...base, type: "open", choices: [] };
}

/** Export HTML Moodle (sans bonnes réponses) → questions à choix sans réponse cochée. */
export function planFromXhtml(html: string): PlannedQuestion[] {
  const out: PlannedQuestion[] = [];
  for (const b of html.split(/<div class="question">/).slice(1)) {
    const body = b.split(/<\/div>\s*(?:<!--|$)/)[0];
    const name = htmlToMarkdown(/<h3>([\s\S]*?)<\/h3>/.exec(body)?.[1] ?? "").replace(/\n+/g, " ");
    let statement = htmlToMarkdown(
      (/<p class="questiontext">([\s\S]*?)<\/p>\s*(?:<ul|<!--|$)/.exec(body)?.[1] ?? "").replace(
        /<img[^>]*>/g,
        "*(image dans Moodle)*",
      ),
    );
    const items = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)]
      .map((m) => htmlToMarkdown(m[1]).replace(/\n+/g, " ").trim())
      .filter(Boolean);
    const planned: PlannedQuestion = {
      name: name.slice(0, 500),
      type: "single_choice",
      statement,
      feedback: "",
      points: 1,
      theme: "",
      choices: [],
      numericValue: null,
      tolerance: null,
      note: null,
    };
    if (/export of essay/.test(body)) {
      planned.type = "open";
    } else if (/class="match"/.test(body)) {
      const options = [
        ...new Set(
          [...body.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)]
            .map((m) => htmlToMarkdown(m[1]).trim())
            .filter((o) => o && !/^choisir/i.test(o)),
        ),
      ];
      statement += `\n\nÉléments :\n${items.map((i) => `- ${i}`).join("\n")}\n\nPropositions :\n${options.map((o) => `- ${o}`).join("\n")}`;
      planned.type = "open";
      planned.statement = statement;
      planned.note = "association (pas de type équivalent) : importée en question ouverte";
    } else {
      const isTf = /class="truefalse"|type="radio"[^>]*value="(?:true|false)"/i.test(body);
      planned.type = isTf
        ? "true_false"
        : /type="checkbox"/.test(body)
          ? "multiple_choice"
          : "single_choice";
      planned.choices = (isTf ? ["Vrai", "Faux"] : items).map((text) => ({
        text,
        correct: false,
        fraction: 0,
        feedback: "",
      }));
      planned.note = "aucune bonne réponse dans l'export : à cocher avant usage";
    }
    out.push(planned);
  }
  return out;
}

async function importQuestions(
  imp: Importer,
  sourceKey: string,
  label: string,
  questions: PlannedQuestion[],
  tags: string[],
) {
  let toReview = 0;
  for (const [i, q] of questions.entries()) {
    const questionTags = [
      ...new Set([...tags, ...(q.theme ? [q.theme.toLocaleLowerCase("fr")] : [])]),
    ];
    const id = await imp.ensure(
      "question",
      "moodle",
      `question:${sourceKey}:${i + 1}`,
      {
        category: TO_CLASSIFY,
        name: q.name,
        type: q.type,
        statement: q.statement,
        general_feedback: q.feedback,
        default_points: q.points,
        tags: questionTags,
        numeric_value: q.numericValue,
        numeric_tolerance: q.tolerance,
      },
      `${label} › ${i + 1}. « ${q.name.slice(0, 55)} » — ${q.type}${q.choices.length ? `, ${q.choices.length} choix` : ""}${q.note ? ` ⚠ ${q.note}` : ""}`,
    );
    if (q.note) toReview++;
    for (const [j, c] of q.choices.entries())
      await imp.ensure(
        "question_choice",
        "moodle",
        `question:${sourceKey}:${i + 1}#choix-${j + 1}`,
        {
          question_id: id,
          position: j + 1,
          text: c.text || "(vide)",
          is_correct: c.correct,
          fraction: c.fraction,
          feedback: c.feedback,
        },
        `${label} › ${i + 1} › choix ${j + 1}${c.correct ? " ✅" : ""}`,
      );
  }
  if (toReview)
    imp.warnings.push(
      `${label} : ${toReview} question(s) à reprendre à la main (voir ⚠ dans le rapport).`,
    );
}

async function banks(ctx: CourseContext) {
  const { imp, moodle } = ctx;
  if (moodle) {
    const planned = parseQuestionBank(moodle.questionsXml).map(planFromMoodle);
    await importQuestions(imp, GP_COURSE_KEY, "QCM GP", planned, [
      "gestion de projet",
      "qcm",
      "gp 2025-26",
    ]);
  } else imp.warnings.push("Banque GP : pas de sauvegarde Moodle (--moodle gp-2526.mbz), ignorée.");

  if (existsSync(M2_QUESTIONS_HTML)) {
    const planned = planFromXhtml(readFileSync(M2_QUESTIONS_HTML, "utf8"));
    await importQuestions(imp, M2_COURSE_KEY, "QCM M2", planned, [
      "accessibilité",
      "qcm",
      "m2 2024-25",
      "réponses à définir",
    ]);
  } else imp.warnings.push("Banque M2 : export HTML absent, ignorée.");
}

// ── d) Doublon « Livrable » des séances GP ─────────────────────────────────

const flat = (s: string) =>
  s
    .replace(/[*\-•]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fr");

async function deliverableDuplicates({ imp }: CourseContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "course_plan" });
  for (const ref of refs) {
    const [plan] = await select(imp, "course_plan", "course_id, deliverable", {
      id: ref.target_id,
    });
    if (!plan?.deliverable) continue;
    const [course] = await select(imp, "course", "id, position, assessment_notes", {
      id: plan.course_id,
    });
    const notes = String(course?.assessment_notes ?? "");
    const m = /^\*\*Livrable\*\*\n([\s\S]*?)(?:\n\n\*\*Évaluation\*\*\n([\s\S]*))?$/.exec(notes);
    if (!m || flat(m[1]) !== flat(String(plan.deliverable))) continue;
    const rest = m[2] ? `**Évaluation**\n${m[2]}` : null;
    await complete(
      imp,
      "course",
      String(course.id),
      { assessment_notes: rest },
      `Séance ${String(course.position)} : bloc « Livrable » retiré (déjà dans le livrable de séance) ; avant ${notes.length} car. → après ${rest?.length ?? 0} car.`,
    );
  }
}

export async function migrate(ctx: CourseContext): Promise<void> {
  await completions(ctx);
  await resourceTags(ctx);
  await banks(ctx);
  await deliverableDuplicates(ctx);
}
