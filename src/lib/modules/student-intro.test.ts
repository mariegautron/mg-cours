import { describe, expect, it } from "vitest";

import { parseFiche } from "./fiche";
import { buildStudentIntro, inclusify } from "./student-intro";

// Texte de la fiche YNOV « Analyse des besoins » : rubriques description, objectifs et prérequis.
const FICHE = `FICHE PÉDAGOGIQUE
Nom long Analyse des Besoins & Faisabilité Technique
Niveau Mastère 1
Volume heures totales
FFP TDP
28h 10h 18h
Description du cours : Module expert de cadrage de projets complexes. Maîtrise de l'analyse approfondie des besoins via entretiens
Objectifs pédagogiques :
• Cartographier les parties prenantes et leurs rôles (RACI/RASCI)
• Conduire des entretiens d'expression de besoins
• Analyser l'environnement technique existant (SWOT)
Prérequis : Bachelor informatique - Gestion de projet
Unités pédagogiques
1 FFP 3h Cadrage du besoin`;

describe("parseFiche — description, objectifs, prérequis (US-104)", () => {
  it("lit les trois rubriques de la fiche", () => {
    const r = parseFiche(FICHE);
    expect(r.description).toBe(
      "Module expert de cadrage de projets complexes. Maîtrise de l'analyse approfondie des besoins via entretiens",
    );
    expect(r.objectives).toEqual([
      "Cartographier les parties prenantes et leurs rôles (RACI/RASCI)",
      "Conduire des entretiens d'expression de besoins",
      "Analyser l'environnement technique existant (SWOT)",
    ]);
    expect(r.prerequisites).toEqual(["Bachelor informatique - Gestion de projet"]);
  });

  it("ne change rien aux champs déjà lus", () => {
    expect(parseFiche(FICHE)).toMatchObject({
      name: "Analyse des Besoins & Faisabilité Technique",
      level: "Mastère 1",
      totalHours: 28,
      hoursLecture: 10,
      hoursTd: 18,
    });
  });

  it("accepte un texte sans retour à la ligne (PDF fusionné), puces sur une seule ligne", () => {
    const r = parseFiche(FICHE.replace(/\n/g, " "));
    expect(r.objectives).toHaveLength(3);
    expect(r.objectives?.[2]).toBe("Analyser l'environnement technique existant (SWOT)");
    expect(r.prerequisites).toEqual(["Bachelor informatique - Gestion de projet"]);
    expect(r.description).toMatch(/^Module expert de cadrage/);
  });

  it("rattache une ligne de suite à sa puce", () => {
    const r = parseFiche(
      "Objectifs pédagogiques\n• Cartographier les parties prenantes\net leurs rôles\n• Conduire des entretiens",
    );
    expect(r.objectives).toEqual([
      "Cartographier les parties prenantes et leurs rôles",
      "Conduire des entretiens",
    ]);
  });

  it("n'invente rien quand les rubriques sont absentes", () => {
    const r = parseFiche("Nom long Web\nVolume heures totales\n21h");
    expect(r.description).toBeUndefined();
    expect(r.objectives).toBeUndefined();
    expect(r.prerequisites).toBeUndefined();
  });
});

/** Formes du masculin pluriel désignant des personnes, sans point médian. */
const NON_INCLUSIVE =
  /(?<![\wÀ-ÿ])(?:étudiants?|apprenants?|intervenants?|participants?|diplômés?)(?![\wÀ-ÿ·])/i;
/** Mots de la 2e personne du singulier (`\b` ne connaît pas « â » : lookarounds). */
const TUTOIEMENT = /(?<![\wÀ-ÿ])(?:tu|toi|ton|ta|tes|te|t’)(?![\wÀ-ÿ])/i;

describe("buildStudentIntro", () => {
  const intro = buildStudentIntro(parseFiche(FICHE));

  it("produit le brouillon complet, au Markdown de la présentation", () => {
    expect(intro).toBe(`## Bienvenue !

Bienvenue dans le module « Analyse des Besoins & Faisabilité Technique ». Module expert de cadrage de projets complexes.

## Ce que vous saurez faire
À l’issue du module, vous serez capable de :
- cartographier les parties prenantes et leurs rôles (RACI/RASCI)
- conduire des entretiens d'expression de besoins
- analyser l'environnement technique existant (SWOT)

## Prérequis
Ce module s’appuie sur : Bachelor informatique - Gestion de projet.

## Volume horaire
Ce module représente 28 h d’enseignement (10 h de cours, 18 h de TD).

Nous avons hâte de travailler avec vous. Bon module, et à très vite !
`);
  });

  it("vouvoie : jamais de tutoiement", () => {
    expect(intro).toMatch(/\bvous\b/);
    expect(intro).not.toMatch(TUTOIEMENT);
    expect(TUTOIEMENT.test("Tu es prêt·e ? Ton module")).toBe(true);
    expect(TUTOIEMENT.test("Nous avons hâte, vous êtes prêt·e")).toBe(false);
  });

  it("est en écriture inclusive : aucune forme masculine plurielle désignant des personnes", () => {
    expect(intro).not.toMatch(NON_INCLUSIVE);
    expect(intro).not.toMatch(/(?<![\wÀ-ÿ])(?:tous|ceux)(?![\wÀ-ÿ])/i);
    expect(intro).not.toMatch(/\([es]{1,2}\)/);
  });

  it("passe en écriture inclusive les mots de la fiche qui ne le sont pas", () => {
    const text = buildStudentIntro({
      name: "Droit",
      description: "Ce module forme les étudiants et les apprenants. La suite.",
      objectives: ["Accompagner les intervenants", "Évaluer les participants."],
      prerequisites: ["Être diplômés d'une licence", "Avoir suivi le module Web"],
    });
    expect(text).not.toMatch(NON_INCLUSIVE);
    expect(text).toContain("les étudiant·es et les apprenant·es");
    expect(text).toContain("- accompagner les intervenant·es");
    expect(text).toContain("- évaluer les participant·es");
    expect(text).toContain("- Être diplômé·es d'une licence");
    expect(text).not.toContain("La suite");
  });

  it("le contrôle d'inclusivité échoue bel et bien sur une forme non inclusive", () => {
    expect(NON_INCLUSIVE.test("Les étudiants sont invités")).toBe(true);
    expect(NON_INCLUSIVE.test("Les étudiant·es sont invité·es")).toBe(false);
  });

  it("ne garde que les sections que la fiche fournit", () => {
    expect(buildStudentIntro({})).toBe(
      "## Bienvenue !\n\nBienvenue dans ce module.\n\nNous avons hâte de travailler avec vous. Bon module, et à très vite !\n",
    );
    expect(buildStudentIntro({ name: "Web", totalHours: 21 })).toContain(
      "Ce module représente 21 h d’enseignement.",
    );
  });

  it("liste les prérequis quand il y en a plusieurs", () => {
    const text = buildStudentIntro({ prerequisites: ["HTML", "JavaScript."] });
    expect(text).toContain("## Prérequis\nCe module s’appuie sur :\n- HTML\n- JavaScript\n");
  });
});

describe("inclusify", () => {
  it("laisse intact ce qui l'est déjà", () => {
    expect(inclusify("les étudiant·es")).toBe("les étudiant·es");
  });
});
