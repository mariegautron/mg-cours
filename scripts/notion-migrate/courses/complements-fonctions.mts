// Compléments après import des 3 cours (B2 2025-26, Gestion de projet 2025-26, M2 2024-25) :
// tirer parti des fonctionnalités livrées depuis (paliers, axes, références, bonus hors barème,
// commentaire par critère, phrases réutilisables, horaires par séance, années scolaires).
// Chaque passe ne renseigne que ce qui est vide ou resté tel que l'import l'a posé : une
// retouche faite dans l'application n'est jamais écrasée.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";
import { frenchDateTimeRange, parseGrid, parseRubricTables } from "../lib/parsers.mts";

export interface ComplementContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

type Row = Record<string, unknown>;

async function select(imp: Importer, table: string, columns: string, match: Row): Promise<Row[]> {
  let query = imp.sb.from(table).select(columns).eq("owner_id", imp.ownerId);
  for (const [k, v] of Object.entries(match)) query = query.eq(k, v as string);
  const { data, error } = await query.limit(5000);
  if (error) throw new Error(`${table} : ${error.message}`);
  return (data ?? []) as unknown as Row[];
}

/** Applique `patch` (déjà filtré sur les champs à compléter) et le consigne au rapport. */
async function complete(imp: Importer, table: string, id: string, patch: Row, label: string) {
  if (!Object.keys(patch).length) return;
  imp.report.push({ table, action: "compléter", label });
  await imp.update(table, id, patch, label);
}

// ── 1. Grilles : axes, références, bonus, paliers ──────────────────────────

const B2_GRIDS = [
  "2df903c74f1380d0a9c4d1468af3b223",
  "2df903c74f138048849ded517ce97771",
  "2df903c74f13804889d6d417c96d4db7",
];
const M2_PROJECT_GRID = "20b903c74f1380ae91e6fef0882cee74";

/** « **8 pts** texte… » → paliers (points + texte) et texte d'introduction du critère. */
export function splitLevels(description: string): {
  lead: string;
  levels: { points: number; description: string }[];
} {
  const marker = /\*\*\s*(\d+(?:[.,]\d+)?)\s*pts?\s*\*\*/g;
  const hits = [...description.matchAll(marker)];
  if (!hits.length) return { lead: description, levels: [] };
  const levels = hits.map((m, i) => ({
    points: Number(m[1].replace(",", ".")),
    description: description
      .slice(m.index + m[0].length, hits[i + 1]?.index ?? description.length)
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  }));
  return { lead: description.slice(0, hits[0].index).trim(), levels };
}

async function gridCriteria(imp: Importer, gridId: string) {
  const rows = await select(
    imp,
    "grid_criterion",
    "id, label, weight, description, position, axis_id, reference, is_bonus",
    { grading_grid_id: gridId },
  );
  return rows.sort((a, b) => Number(a.position) - Number(b.position));
}

async function b2Grids({ imp, page }: ComplementContext) {
  for (const pageId of B2_GRIDS) {
    const gridId = await imp.findRef("notion", pageId, "grading_grid");
    if (!gridId) {
      imp.warnings.push(`Grille B2 ${pageId} : pas encore importée (ignorée).`);
      continue;
    }
    const parsed = parseGrid(page(pageId).body).criteria;
    const criteria = await gridCriteria(imp, gridId);
    for (const [i, c] of parsed.entries()) {
      const row = criteria[i];
      if (!row || row.label !== c.label) {
        imp.warnings.push(`Grille B2 ${pageId} › critère ${i + 1} : libellé différent (ignoré).`);
        continue;
      }
      const { lead, levels } = splitLevels(c.description);
      if (!levels.length) continue;
      const top = Math.max(...levels.map((l) => l.points));
      if (top !== c.weight)
        imp.warnings.push(`« ${c.label} » : palier le plus haut ${top} ≠ barème ${c.weight}.`);
      for (const [n, l] of levels.entries())
        await imp.ensure(
          "criterion_level",
          "notion",
          `${pageId}#critere-${i + 1}#palier-${l.points}`,
          { grid_criterion_id: row.id, points: l.points, description: l.description, position: n },
          `${c.label} › ${l.points} pt${l.points > 1 ? "s" : ""}`,
        );
      // Le texte des paliers ne reste pas doublé dans la description (si non retouchée).
      if (row.description === c.description && c.description !== lead)
        await complete(
          imp,
          "grid_criterion",
          String(row.id),
          { description: lead },
          `${c.label} : description = énoncé seul`,
        );
    }
  }
}

async function m2ProjectGrid({ imp, page }: ComplementContext) {
  const gridId = await imp.findRef("notion", M2_PROJECT_GRID, "grading_grid");
  if (!gridId) {
    imp.warnings.push("Grille M2 projet : pas encore importée (ignorée).");
    return;
  }
  const rows = parseRubricTables(page(M2_PROJECT_GRID).body);
  const criteria = await gridCriteria(imp, gridId);
  const axisIds = new Map<string, string>();
  for (const r of rows) {
    if (!r.section || axisIds.has(r.section)) continue;
    axisIds.set(
      r.section,
      await imp.ensure(
        "grid_axis",
        "notion",
        `${M2_PROJECT_GRID}#axe-${axisIds.size + 1}`,
        { grading_grid_id: gridId, label: r.section, position: axisIds.size },
        `Axe « ${r.section} »`,
      ),
    );
  }
  for (const [i, r] of rows.entries()) {
    const row = criteria[i];
    if (!row || row.label !== r.label) {
      imp.warnings.push(`Grille M2 projet › critère ${i + 1} : libellé différent (ignoré).`);
      continue;
    }
    const imported = [
      r.section && `*${r.section}*`,
      r.description,
      r.reference && `Référence RGAA : ${r.reference}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const patch: Row = {};
    const axisId = axisIds.get(r.section);
    if (axisId && !row.axis_id) patch.axis_id = axisId;
    if (r.reference && !row.reference) patch.reference = r.reference;
    if (r.bonus && !row.is_bonus) patch.is_bonus = true;
    if (row.description === imported && r.description !== imported)
      patch.description = r.description;
    await complete(
      imp,
      "grid_criterion",
      String(row.id),
      patch,
      `${r.label} → ${Object.keys(patch).join(", ")}`,
    );
  }
}

// ── 2. Commentaire par critère (depuis le bloc « Détail par critère ») ─────

const DETAIL_BLOCK = /\*\*Détail par critère\*\*\n((?:- .*(?:\n|$))+)/;
const DETAIL_LINE = /^- \*\*(.+?)\*\* — (\S+?)\/(\S+?)(?: : ([\s\S]*))?$/;

async function gradeComments({ imp }: ComplementContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "grade" });
  const criteriaByAssessment = new Map<string, Map<string, string>>();
  for (const ref of refs) {
    const gradeId = String(ref.target_id);
    const [grade] = await select(imp, "grade", "id, assessment_id, feedback, criterion_comments", {
      id: gradeId,
    });
    if (!grade?.feedback) continue;
    const empty =
      !grade.criterion_comments || Object.keys(grade.criterion_comments as Row).length === 0;
    const block = DETAIL_BLOCK.exec(String(grade.feedback));
    if (!empty || !block) continue;

    const assessmentId = String(grade.assessment_id);
    if (!criteriaByAssessment.has(assessmentId)) {
      const [a] = await select(imp, "assessment", "grading_grid_id", { id: assessmentId });
      const criteria = a?.grading_grid_id
        ? await select(imp, "grid_criterion", "id, label", { grading_grid_id: a.grading_grid_id })
        : [];
      criteriaByAssessment.set(
        assessmentId,
        new Map(criteria.map((c) => [String(c.label), String(c.id)])),
      );
    }
    const byLabel = criteriaByAssessment.get(assessmentId)!;

    const comments: Record<string, string> = {};
    let unmatched = 0;
    for (const line of block[1].split("\n").filter(Boolean)) {
      const m = DETAIL_LINE.exec(line);
      if (!m) {
        unmatched++;
        continue;
      }
      const id = byLabel.get(m[1]);
      if (!id) {
        unmatched++;
        continue;
      }
      if (m[4]?.trim()) comments[id] = m[4].trim();
    }
    if (unmatched) {
      imp.warnings.push(
        `Note ${gradeId.slice(0, 8)} : ${unmatched} ligne(s) du détail non reconnue(s), note laissée telle quelle.`,
      );
      continue;
    }
    if (!Object.keys(comments).length) continue;
    const feedback =
      String(grade.feedback)
        .replace(DETAIL_BLOCK, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim() || null;
    await complete(
      imp,
      "grade",
      gradeId,
      { criterion_comments: comments, feedback },
      `note ${gradeId.slice(0, 8)} : ${Object.keys(comments).length} commentaire(s) par critère, commentaire libre ${feedback ? `${feedback.length} car.` : "vide"}`,
    );
  }
}

// ── 3. Phrases réutilisables (GP) : matière et critère lié ─────────────────

const GP_NOTES_PREP = "29e903c74f13806197c8da904892ab33";
const GP_SUBJECT = "Gestion de projet";
const GP_GRIDS = {
  cadrage: "2ae903c74f13803c97e5e8ee19d9b46a",
  specs: "2ae903c74f1380768d39e198d7847ebd",
  oral: "2ae903c74f138023bbcbfbf092ac25c0",
} as const;
/** Sujet (2e étiquette de la phrase) → fragment du libellé du critère, par grille. */
const CRITERION_HINTS: Record<keyof typeof GP_GRIDS, Record<string, string>> = {
  cadrage: {
    objectifs: "contexte",
    contexte: "contexte",
    acteurs: "acteurs",
    besoin: "besoins",
    contraintes: "besoins",
    swot: "swot",
    faisabilité: "faisabilité",
    mvp: "solution",
    rédaction: "qualité",
    risques: "risques",
  },
  specs: { méthodologie: "méthodolog" },
  oral: {},
};

async function phrases({ imp }: ComplementContext, comments: { text: string; tags: string[] }[]) {
  const criteria = new Map<string, { id: string; label: string }[]>();
  for (const [phase, gridPage] of Object.entries(GP_GRIDS)) {
    const gridId = await imp.findRef("notion", gridPage, "grading_grid");
    if (gridId)
      criteria.set(
        phase,
        (await gridCriteria(imp, gridId)).map((c) => ({
          id: String(c.id),
          label: String(c.label),
        })),
      );
  }
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  for (const [i, c] of comments.entries()) {
    const id = await imp.findRef(
      "notion",
      `${GP_NOTES_PREP}#commentaire-${i + 1}`,
      "predefined_comment",
    );
    if (!id) continue;
    const [row] = await select(
      imp,
      "predefined_comment",
      "id, subject, grid_criterion_id, criterion_label",
      { id },
    );
    if (!row) continue;
    const phase = (c.tags.find((t) => t in GP_GRIDS) ?? "cadrage") as keyof typeof GP_GRIDS;
    const topic = c.tags.find((t) => !(t in GP_GRIDS));
    const hint = topic
      ? (CRITERION_HINTS[phase][fold(topic)] ?? CRITERION_HINTS[phase][topic])
      : undefined;
    const match = hint
      ? criteria.get(phase)?.find((k) => fold(k.label).includes(fold(hint)))
      : undefined;
    const patch: Row = {};
    if (!row.subject) patch.subject = GP_SUBJECT;
    if (match && !row.grid_criterion_id) {
      patch.grid_criterion_id = match.id;
      patch.criterion_label = match.label;
    }
    await complete(
      imp,
      "predefined_comment",
      id,
      patch,
      `« ${c.text.slice(0, 50)}… » → ${GP_SUBJECT}${match ? ` · critère « ${match.label} »` : " · sans critère"}`,
    );
  }
}

// ── 6. Banque QCM du M2 : sans bonnes réponses → « à construire » ──────────

async function m2QuestionBank({ imp }: ComplementContext) {
  const id = await imp.findRef(
    "moodle",
    "questions:nantesynovcampus2024devwebmast2m2s2-elective2",
    "resource",
  );
  if (!id) return;
  const [row] = await select(imp, "resource", "id, title, status, intent_note", { id });
  if (!row || row.status !== "ready" || row.intent_note) return;
  await complete(
    imp,
    "resource",
    id,
    {
      status: "progress",
      intent_note:
        "Questions importées depuis l'export HTML de Moodle, sans les bonnes réponses : à compléter avant d'utiliser la banque.",
    },
    `${row.title} → à construire`,
  );
}

// ── 4. Horaires des séances (début / fin) ──────────────────────────────────

const GP_SESSIONS = [
  "29f903c74f13816e84d0d4001606cf2c",
  "29f903c74f13817a9d5fc1d3ebda6f38",
  "29f903c74f1381be9b90ec157d82c5e3",
  "29f903c74f13813a89d7c9a46400690f",
  "29f903c74f138021ae34c63419ce5a5c",
  "29f903c74f13800f9896da827bd7aab1",
  "29f903c74f13806fb669f054c61deb5b",
  "29f903c74f138003a23efb5681b6f0cc",
];
async function setTimes(
  imp: Importer,
  courseSource: string,
  start: string | null,
  end: string | null,
  label: string,
) {
  if (!start || !end) {
    imp.warnings.push(`${label} : horaires introuvables dans la source.`);
    return;
  }
  const id = await imp.findRef("notion", courseSource, "course");
  if (!id) return;
  const [row] = await select(imp, "course", "id, start_time, end_time", { id });
  if (!row || row.start_time || row.end_time) return;
  await complete(
    imp,
    "course",
    id,
    { start_time: `${start}:00`, end_time: `${end}:00` },
    `${label} : ${start}–${end}`,
  );
}

async function times(
  { imp, page, has }: ComplementContext,
  m2: { id: string; activities: string[] }[],
) {
  for (const [i, id] of GP_SESSIONS.entries()) {
    if (!has(id)) continue;
    const when = frenchDateTimeRange(page(id).properties["Date"]);
    await setTimes(
      imp,
      id,
      when.start?.padStart(5, "0") ?? null,
      when.end?.padStart(5, "0") ?? null,
      `Gestion de projet › séance ${i + 1}`,
    );
  }
  for (const [i, day] of m2.entries()) {
    const slots = day.activities
      .filter((a) => has(a))
      .map((a) => frenchDateTimeRange(page(a).properties["Date et heure"]))
      .filter((w) => w.start && w.end);
    if (!slots.length) continue;
    const start = slots.map((w) => w.start!.padStart(5, "0")).sort()[0];
    const end = slots
      .map((w) => w.end!.padStart(5, "0"))
      .sort()
      .at(-1)!;
    await setTimes(imp, day.id, start, end, `M2 › jour ${i + 1}`);
  }
  imp.warnings.push(
    "B2 : aucun horaire dans Notion (dates vides) — début / fin à saisir dans l'application.",
  );
}

// ── 5. Promotion par année scolaire ────────────────────────────────────────

async function studentYears({ imp }: ComplementContext) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "student" });
  for (const ref of refs) {
    const studentId = String(ref.target_id);
    const [student] = await select(imp, "student", "id, first_name, last_name, scholar_group", {
      id: studentId,
    });
    if (!student?.scholar_group) continue;
    const members = await select(imp, "group_member", "student_group_id", {
      student_id: studentId,
    });
    const years: number[] = [];
    for (const m of members) {
      const [g] = await select(imp, "student_group", "module_id", { id: m.student_group_id });
      const [mod] = g ? await select(imp, "module", "year", { id: g.module_id }) : [];
      if (mod) years.push(Number(mod.year));
    }
    if (!years.length) continue;
    const counts = new Map<number, number>();
    for (const y of years) counts.set(y, (counts.get(y) ?? 0) + 1);
    const year = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    const existing = await select(imp, "student_year", "id", { student_id: studentId, year });
    if (existing.length) continue;
    await imp.link(
      "student_year",
      { student_id: studentId, year, scholar_group: String(student.scholar_group).trim() },
      "student_id,year",
      `${String(student.first_name)} ${String(student.last_name)} → ${year}-${String(year + 1).slice(2)} : ${String(student.scholar_group).trim()}`,
    );
  }
}

export async function runComplements(
  ctx: ComplementContext,
  data: {
    predefinedComments: { text: string; tags: string[] }[];
    m2Days: { id: string; activities: string[] }[];
  },
) {
  await b2Grids(ctx);
  await m2ProjectGrid(ctx);
  await gradeComments(ctx);
  await phrases(ctx, data.predefinedComments);
  await m2QuestionBank(ctx);
  await times(ctx, data.m2Days);
  await studentYears(ctx);
}
