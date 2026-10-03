// Compléments 7 : le M2 Accessibilité 2024-25 n'a pas de fiche école. Les objectifs de ses 4
// journées (progression envoyée) deviennent des attendus « ajoutés par l'intervenante »
// (module_expectation.origin = 'custom'), chacun rattaché à la journée qui le couvre
// (course_expectation). Simulation par défaut ; décision PO du 03/10.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const M2_YCODE_NAME = /^Accessibilité & Qualité Web/;

export async function migrate({ imp }: CourseContext): Promise<void> {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  let found = false;
  for (const ref of refs) {
    const [mod] = await select(imp, "module", "id, name, year, level", { id: ref.target_id });
    if (!mod || !M2_YCODE_NAME.test(String(mod.name)) || Number(mod.year) !== 2024) continue;
    found = true;

    const existing = await select(imp, "module_expectation", "id, label", { module_id: mod.id });
    if (existing.length)
      imp.warnings.push(
        `M2 : ${existing.length} attendu(s) déjà présent(s) : les objectifs identiques ne sont pas recréés.`,
      );
    const known = new Map(
      existing.map((e) => [String(e.label).toLocaleLowerCase("fr"), String(e.id)]),
    );
    const courses = (
      await select(imp, "course", "id, position, title, learning_objectives", { module_id: mod.id })
    ).sort((a, b) => Number(a.position) - Number(b.position));

    let position = existing.length;
    for (const c of courses) {
      const objectives = (c.learning_objectives as string[] | null) ?? [];
      for (const [i, raw] of objectives.entries()) {
        const label = raw.replace(/\s+/g, " ").trim();
        if (label.length < 3) continue;
        let expectationId = known.get(label.toLocaleLowerCase("fr"));
        if (!expectationId) {
          position++;
          expectationId = await imp.ensure(
            "module_expectation",
            "notion",
            `m2-progression#jour-${String(c.position)}-objectif-${i + 1}`,
            { module_id: mod.id, kind: "objective", label, position, origin: "custom" },
            `Jour ${String(c.position)} › attendu ${i + 1} : ${label}`,
          );
          known.set(label.toLocaleLowerCase("fr"), expectationId);
        }
        await imp.link(
          "course_expectation",
          { course_id: c.id, expectation_id: expectationId },
          "course_id,expectation_id",
          `Jour ${String(c.position)} couvre « ${label.slice(0, 60)} »`,
        );
      }
    }
  }
  if (!found) imp.warnings.push("Module M2 Accessibilité (2024) introuvable.");
  imp.warnings.push(
    "Pas de fiche école pour le M2 : ces attendus sont « ajoutés par l'intervenante », pas ceux de l'école. YCODE toujours inconnu.",
  );
}
