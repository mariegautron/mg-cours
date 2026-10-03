// Compléments 6 : fiche école du B2 « Accessibilité et qualité Web » (A2526_0121, texte fourni
// par la PO, pas de PDF) : 6 attendus (module_expectation, origin 'school') et présentation aux
// étudiant·es si elle est vide. Simulation par défaut ; ne complète que ce qui est vide.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { complete, select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const B2_FICHE_KEY = "fiche-ecole:A2526_0121";
const B2_OBJECTIVES = [
  "Compréhension des besoins utilisateurs",
  "Conception de parcours utilisateurs accessibles à tous",
  "Respect des normes et outils",
  "Optimisation des performances web (temps de chargement, SEO, poids des fichiers)",
  "Garantie de la compatibilité navigateurs, appareils",
  "Possibilité de passer la certification Opquast",
];

export function b2Intro(): string {
  return [
    "## Objectifs pédagogiques",
    B2_OBJECTIVES.map((o) => `- ${o}`).join("\n"),
    "## Prérequis",
    "Aucun prérequis.",
    "## Certification",
    "Certification Opquast sur la qualité web, passée à la fin du cours.",
    "## Évaluation",
    "Un QCM ou une évaluation. Avec la certification Opquast, une note bonus selon le score obtenu.",
  ].join("\n\n");
}

export async function migrate({ imp }: CourseContext): Promise<void> {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  let found = false;
  for (const ref of refs) {
    const [mod] = await select(
      imp,
      "module",
      "id, name, ycode, total_hours, year, level, student_intro",
      { id: ref.target_id },
    );
    if (!mod || mod.ycode !== "A2526_0121") continue;
    found = true;

    const existing = await select(imp, "module_expectation", "id, label", { module_id: mod.id });
    const known = new Set(existing.map((e) => String(e.label).toLocaleLowerCase("fr")));
    for (const [i, label] of B2_OBJECTIVES.entries()) {
      if (known.has(label.toLocaleLowerCase("fr"))) continue;
      await imp.ensure(
        "module_expectation",
        "notion",
        `${B2_FICHE_KEY}#objectif-${i + 1}`,
        { module_id: mod.id, kind: "objective", label, position: i + 1, origin: "school" },
        `Attendu ${i + 1}/6 : ${label}`,
      );
    }
    if (!mod.student_intro)
      await complete(
        imp,
        "module",
        String(mod.id),
        { student_intro: b2Intro() },
        `Présentation aux étudiant·es (${b2Intro().length} car. : 6 objectifs, prérequis, certification, évaluation)`,
      );

    if (Number(mod.total_hours) !== 16)
      imp.warnings.push(
        `B2 : ${String(mod.total_hours)} h dans le module (5 séances de 4 h, facture 26-03-6 : 20 h × 50 €) contre 16 h dans la fiche école : module conservé à 20 h.`,
      );
  }
  if (!found) imp.warnings.push("Module B2 (A2526_0121) introuvable.");
  imp.warnings.push(
    "Fiche B2 : la description destinée aux étudiant·es n'a pas été reçue en entier (texte abrégé) : non reprise dans la présentation. Barème Opquast : non importé (à structurer côté application).",
  );
}
