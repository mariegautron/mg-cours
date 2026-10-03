// Compléments 8 (suite de l'audit du 03/10), accord de la PO :
//  a) attendus de l'école (GP, B2) rattachés aux séances qui les couvrent (course_expectation),
//     par recoupement de mots entre l'attendu et le contenu de la séance (titre, objectifs,
//     déroulé, ressources liées) ; les correspondances sont listées pour relecture ;
//  b) ressources GP non liées rattachées à la séance qui leur correspond le mieux ;
//  c) étudiant·es GP sans année scolaire : ligne student_year (sans promotion).
// Simulation par défaut ; ne complète que ce qui manque.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const STOP = new Set(
  "dans pour avec sans sont leur leurs cette ces des les une aux sur par que qui plus tout toute tous entre vers ainsi comme etre avoir faire projet projets cours seance module etudiants etudiant exemple notion".split(
    " ",
  ),
);
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Racines de 6 lettres des mots utiles d'un texte. */
export function stems(text: string): Set<string> {
  return new Set(
    fold(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5 && !STOP.has(w))
      .map((w) => w.slice(0, 6)),
  );
}

export function overlap(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((s) => b.has(s));
}

interface SessionCorpus {
  id: string;
  position: number;
  title: string;
  stems: Set<string>;
}

async function corpora(imp: Importer, moduleId: string): Promise<SessionCorpus[]> {
  const courses = await select(
    imp,
    "course",
    "id, position, title, learning_objectives, animation_notes, assessment_notes",
    { module_id: moduleId },
  );
  const out: SessionCorpus[] = [];
  for (const c of courses.sort((a, b) => Number(a.position) - Number(b.position))) {
    const links = await select(imp, "course_resource", "resource_id", { course_id: c.id });
    const titles: string[] = [];
    for (const l of links) {
      const [r] = await select(imp, "resource", "title", { id: l.resource_id });
      if (r) titles.push(String(r.title));
    }
    const text = [
      c.title,
      ...((c.learning_objectives as string[] | null) ?? []),
      c.animation_notes,
      c.assessment_notes,
      ...titles,
    ].join(" ");
    out.push({
      id: String(c.id),
      position: Number(c.position),
      title: String(c.title),
      stems: stems(text),
    });
  }
  return out;
}

async function expectationLinks(imp: Importer, mod: Record<string, unknown>) {
  const expectations = (
    await select(imp, "module_expectation", "id, label, position", { module_id: mod.id })
  ).sort((a, b) => Number(a.position) - Number(b.position));
  if (!expectations.length) return;
  const sessions = await corpora(imp, String(mod.id));
  const existing = await select(imp, "course_expectation", "course_id, expectation_id", {});
  const label = `${String(mod.name)} (${String(mod.year)})`;
  let unmatched = 0;
  for (const e of expectations) {
    const words = stems(String(e.label));
    const scored = sessions
      .map((s) => ({ s, hits: overlap(words, s.stems) }))
      .filter((x) => x.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length || a.s.position - b.s.position);
    if (!scored.length) {
      unmatched++;
      continue;
    }
    // Séances dont le recoupement atteint au moins la moitié du meilleur, 3 au plus.
    const best = scored[0].hits.length;
    // Au moins 2 mots en commun (1 si l'attendu n'en compte qu'un), pour éviter les faux amis.
    const min = Math.max(Math.min(2, words.size), Math.ceil(best / 2));
    const kept = scored.filter((x) => x.hits.length >= min).slice(0, 3);
    for (const { s, hits } of kept) {
      if (existing.some((x) => x.expectation_id === e.id && x.course_id === s.id)) continue;
      await imp.link(
        "course_expectation",
        { course_id: s.id, expectation_id: e.id },
        "course_id,expectation_id",
        `${label} › « ${String(e.label).slice(0, 50)} » ↔ séance ${s.position} « ${s.title.slice(0, 40)} » [${hits.join(", ")}]`,
      );
    }
  }
  if (unmatched)
    imp.warnings.push(
      `${label} : ${unmatched} attendu(s) sans séance évidente (à rattacher dans l'application).`,
    );
}

async function unlinkedGpResources(imp: Importer, mod: Record<string, unknown>) {
  const sessions = await corpora(imp, String(mod.id));
  const refs = await select(imp, "import_ref", "target_id", { target_table: "resource" });
  const gpTitles = new Set<string>();
  for (const s of sessions) {
    const links = await select(imp, "course_resource", "resource_id", { course_id: s.id });
    for (const l of links) gpTitles.add(String(l.resource_id));
  }
  for (const ref of refs) {
    const id = String(ref.target_id);
    if (gpTitles.has(id)) continue;
    const [r] = await select(imp, "resource", "id, title, category, kind, audience", { id });
    if (!r || !/^(Gestion de projet|Agilité)$/.test(String(r.category ?? ""))) continue;
    if (r.audience === "teacher") continue; // corrigés, notes : pas projetés aux séances
    const words = stems(String(r.title));
    const best = sessions
      .map((s) => ({ s, hits: overlap(words, s.stems) }))
      .sort((a, b) => b.hits.length - a.hits.length)[0];
    if (!best || best.hits.length < 2) {
      imp.warnings.push(`GP : ressource « ${String(r.title)} » non liée, aucune séance évidente.`);
      continue;
    }
    await imp.link(
      "course_resource",
      { course_id: best.s.id, resource_id: r.id, role: "secondary" },
      "course_id,resource_id",
      `GP › « ${String(r.title).slice(0, 55)} » → séance ${best.s.position} [${best.hits.join(", ")}]`,
    );
  }
}

async function studentsWithoutYear(imp: Importer, mod: Record<string, unknown>) {
  const groups = await select(imp, "student_group", "id", { module_id: mod.id });
  const members: Record<string, unknown>[] = [];
  for (const g of groups)
    members.push(...(await select(imp, "group_member", "student_id", { student_group_id: g.id })));
  for (const studentId of new Set(members.map((m) => String(m.student_id)))) {
    const years = await select(imp, "student_year", "id", { student_id: studentId });
    if (years.length) continue;
    const [s] = await select(imp, "student", "id, first_name, last_name", { id: studentId });
    await imp.link(
      "student_year",
      { student_id: studentId, year: Number(mod.year), scholar_group: null },
      "student_id,year",
      `${String(s?.first_name)} ${String(s?.last_name)} → ${String(mod.year)}-${String(Number(mod.year) + 1).slice(2)} (sans promotion : absente de Notion)`,
    );
  }
}

export async function migrate({ imp }: CourseContext): Promise<void> {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  for (const ref of refs) {
    const [mod] = await select(imp, "module", "id, name, year, ycode", { id: ref.target_id });
    if (!mod) continue;
    if (mod.ycode === "A2526_0172" || mod.ycode === "A2526_0121") await expectationLinks(imp, mod);
    if (mod.ycode === "A2526_0172") {
      await unlinkedGpResources(imp, mod);
      await studentsWithoutYear(imp, mod);
    }
  }
  imp.warnings.push(
    "Rattachements attendus ↔ séances calculés par recoupement de mots : relire la liste ; M2 déjà rattaché par construction.",
  );
}
