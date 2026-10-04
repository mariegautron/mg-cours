// Compléments 13 : suppression de la ressource « QCM — Accessibilité M2 (questions) » (banque en
// texte, sans bonnes réponses, en brouillon), devenue redondante : ses 60 questions sont dans la
// banque de questions (décision de la PO, 04/10). Simulation par défaut ; ne supprime que si la
// banque contient bien ces questions.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const SOURCE_ID = "questions:nantesynovcampus2024devwebmast2m2s2-elective2";
const EXPECTED_QUESTIONS = 60;

export async function migrate({ imp }: CourseContext): Promise<void> {
  const id = await imp.findRef("moodle", SOURCE_ID, "resource");
  if (!id) {
    imp.warnings.push(
      "Ressource « QCM — Accessibilité M2 (questions) » introuvable : déjà supprimée ?",
    );
    return;
  }
  const [r] = await select(imp, "resource", "id, title, kind, status, content", { id });
  if (!r) {
    imp.warnings.push("Ressource introuvable en base (référence d'import orpheline).");
    return;
  }
  const questions = (await select(imp, "question", "id, tags", {})).filter((q) =>
    ((q.tags as string[] | null) ?? []).includes("m2 2024-25"),
  );
  const seances = await select(imp, "course_resource", "id", { resource_id: id });
  const modules = await select(imp, "module_resource", "id", { resource_id: id });
  const links = await select(imp, "resource_question", "id", { resource_id: id });
  const label = `« ${String(r.title)} » (${String(r.kind)}, ${String(r.status)}, ${String(r.content ?? "").length} car.) — liens supprimés avec elle : ${seances.length} séance(s), ${modules.length} module(s) retenu(s), ${links.length} question(s) liée(s)`;

  if (questions.length < EXPECTED_QUESTIONS) {
    imp.warnings.push(
      `Suppression refusée : ${questions.length} question(s) M2 dans la banque, ${EXPECTED_QUESTIONS} attendues. ${label}`,
    );
    return;
  }
  imp.report.push({
    table: "resource (suppression)",
    action: "délier",
    label: `${label} ; ${questions.length} questions M2 présentes dans la banque`,
  });
  if (!imp.apply) return;
  const { error } = await imp.sb.from("resource").delete().eq("id", id).eq("owner_id", imp.ownerId);
  if (error) throw new Error(`resource « ${String(r.title)} » : ${error.message}`);
  await imp.sb
    .from("import_ref")
    .delete()
    .eq("owner_id", imp.ownerId)
    .eq("source", "moodle")
    .eq("source_id", SOURCE_ID)
    .eq("target_table", "resource");
}
