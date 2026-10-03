// Compléments 5 : fiche école de « Gestion d'un projet IT » (texte fourni par la PO, pas de PDF).
//  · 10 objectifs pédagogiques → attendus du module (module_expectation, origin 'school') ;
//  · présentation aux étudiant·es (module.student_intro) si elle est vide.
// Simulation par défaut ; ne complète que ce qui est vide.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { complete, select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const GP_FICHE_KEY = "fiche-ecole:A2526_0172";
const GP_DESCRIPTION =
  "Découvrez les étapes clés pour gérer efficacement un projet IT, de l'analyse fonctionnelle à la mise en production. Ce cours vous guide dans la définition des objectifs, la conception détaillée, et la stratégie de maintenance du logiciel. Vous apprendrez également à préparer des phases de tests et de recettage, à fournir une documentation claire lors de la livraison, et à élaborer une stratégie de formation pour les utilisateurs finaux. Grâce à une méthodologie structurée, vous pourrez anticiper les imprévus et minimiser leur impact sur vos projets.";
const GP_OBJECTIVES = [
  "Définir les cycles d'un projet informatique",
  "Réaliser le cadrage d'un projet",
  "Exprimer les besoins",
  "Cartographier les acteurs du projet",
  "Évaluer la faisabilité du projet",
  "Estimer les coûts",
  "Organiser et piloter l'avancement du projet",
  "Comprendre et maîtriser les méthodes de gestion de projet agile (Scrum, Kanban, SAFe)",
  "Effectuer des comptes rendus d'activités",
  "Comprendre les différentes prestations de maintenance : préventive, corrective et évolutive",
];

export function gpIntro(): string {
  return [
    "## Présentation",
    GP_DESCRIPTION,
    "## Objectifs pédagogiques",
    GP_OBJECTIVES.map((o) => `- ${o}`).join("\n"),
    "## Prérequis",
    "Aucun prérequis.",
    "## Évaluation",
    "Projet et soutenance.",
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
    if (!mod || !/^Gestion d'un projet IT/.test(String(mod.name))) continue;
    found = true;

    const existing = await select(imp, "module_expectation", "id, label", { module_id: mod.id });
    if (existing.length)
      imp.warnings.push(
        `GP : ${existing.length} attendu(s) déjà présent(s) (saisis dans l'application) : les objectifs de la fiche s'ajoutent sans doublon exact.`,
      );
    const known = new Set(existing.map((e) => String(e.label).toLocaleLowerCase("fr")));
    for (const [i, label] of GP_OBJECTIVES.entries()) {
      if (known.has(label.toLocaleLowerCase("fr"))) continue;
      await imp.ensure(
        "module_expectation",
        "notion",
        `${GP_FICHE_KEY}#objectif-${i + 1}`,
        { module_id: mod.id, kind: "objective", label, position: i + 1, origin: "school" },
        `Attendu ${i + 1}/10 : ${label}`,
      );
    }

    if (!mod.student_intro)
      await complete(
        imp,
        "module",
        String(mod.id),
        { student_intro: gpIntro() },
        `Présentation aux étudiant·es (${gpIntro().length} car. : description, 10 objectifs, prérequis, évaluation)`,
      );

    // Écarts fiche ↔ module déjà importé (rien n'est modifié).
    if (mod.ycode !== "A2526_0172")
      imp.warnings.push(`GP : YCODE ${String(mod.ycode)} ≠ fiche A2526_0172.`);
    if (Number(mod.total_hours) !== 28)
      imp.warnings.push(`GP : ${String(mod.total_hours)} h dans le module, 28 h dans la fiche.`);
    if (Number(mod.year) !== 2025) imp.warnings.push(`GP : année ${String(mod.year)} ≠ 2025/2026.`);
  }
  if (!found) imp.warnings.push("Module « Gestion d'un projet IT » introuvable.");
  imp.warnings.push(
    "Fiche école GP : niveau « Mastère 1 » du programme Expert en Développement mobile & IoT ; le module importé couvre DEVWEB, DEVLMIOT et DATA (niveau conservé). Aucun PDF : le document « fiche école » n'est pas créé. Unités pédagogiques : « Néant ».",
  );
}
