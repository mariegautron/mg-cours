import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { BankQuestion, DrawRule } from "@/lib/quiz/types";
import { exportableAssessments, qcmCorrectionThemes } from "./export";
import { subjectSections, withoutRepeatedHeading } from "./subject";

const a = (
  id: string,
  over: Partial<Parameters<typeof exportableAssessments>[0][number]> = {},
) => ({
  id,
  title: id,
  makeup_of_id: null,
  prep_status: "ready" as const,
  date: null,
  ...over,
});

describe("exportableAssessments", () => {
  it("écarte rattrapages et sujets à construire, trie par date", () => {
    const list = exportableAssessments([
      a("B", { date: "2026-11-03" }),
      a("A", { date: "2026-10-12" }),
      a("R", { makeup_of_id: "A" }),
      a("X", { prep_status: "to_build" as never }),
    ]);
    expect(list.map((x) => x.id)).toEqual(["A", "B"]);
  });
});

describe("qcmCorrectionThemes", () => {
  const q = (id: string, category: string, type = "single_choice") =>
    ({
      id,
      name: id,
      category,
      type,
      statement: "?",
      generalFeedback: "Corrigé",
      tags: [],
      numericValue: null,
      numericTolerance: null,
      choices: [],
    }) as unknown as BankQuestion;
  const rule = (category: string | null) =>
    ({ category, tags: [], types: [], count: 1, pointsEach: 1 }) as DrawRule;

  it("un thème par règle, avec les questions tirables (ouvertes comprises), en ordre naturel", () => {
    const themes = qcmCorrectionThemes(
      [q("Q10", "Agile"), q("Q2", "Agile"), q("O1", "Kanban", "open"), q("X", "Autre")],
      [rule("Agile"), rule("Kanban"), rule("Vide")],
    );
    expect(themes.map((t) => [t.label, t.questions.map((x) => x.id)])).toEqual([
      ["Agile", ["Q2", "Q10"]],
      ["Kanban", ["O1"]],
    ]);
  });

  it("sans règle : toute la réserve en un thème ; sans question : rien", () => {
    expect(qcmCorrectionThemes([q("A", "x")], [])).toHaveLength(1);
    expect(qcmCorrectionThemes([], [])).toEqual([]);
  });
});

describe("sujet : titre répété", () => {
  it("retire une première ligne qui répète le titre de la section", () => {
    expect(withoutRepeatedHeading("## Ce qui sera évalué\n\n- Clarté", "Ce qui sera évalué")).toBe(
      "- Clarté",
    );
    expect(withoutRepeatedHeading("**Rendu attendu :**\nUn PDF", "Rendu attendu")).toBe("Un PDF");
    expect(withoutRepeatedHeading("Un PDF\n\n## Rendu attendu", "Rendu attendu")).toBe(
      "Un PDF\n\n## Rendu attendu",
    );
  });

  it("le sujet ne reçoit que ses quatre sections : jamais de question de QCM", () => {
    const sections = subjectSections({
      objective: "Objectif",
      subject: "Consigne",
      deliverable_md: "Rendu",
      evaluated_md: "## Ce qui sera évalué\nClarté",
    });
    expect(sections.map((s) => s.heading)).toEqual([
      "Objectif",
      "Consigne",
      "Rendu attendu",
      "Ce qui sera évalué",
    ]);
    expect(sections[3].text).toBe("Clarté");
    const route = readFileSync("src/app/api/modules/[id]/evaluations/route.ts", "utf8");
    expect(route).toMatch(/SubjectDocument\(\{\s*context,\s*sections: sections/);
  });
});

describe("exports pour Moodle : jamais de contenu privé", () => {
  const read = (p: string) => readFileSync(p, "utf8");
  const FORBIDDEN =
    /animation_notes|assessment_notes|audience === "teacher"|teacher_notes|answer_key|question_bank|personal_notes|observation/;

  it("les routes d'export ne lisent aucun champ privé", () => {
    for (const file of [
      "src/app/api/modules/[id]/courses/route.ts",
      "src/app/api/modules/[id]/evaluations/route.ts",
      "src/lib/pdf/assessment-export.tsx",
      "src/lib/pdf/courses.tsx",
    ]) {
      expect(read(file), file).not.toMatch(FORBIDDEN);
    }
  });

  it("le PDF des cours ne reçoit que des ressources filtrées par studentFacing()", () => {
    expect(read("src/lib/modules/course-export.ts")).toMatch(/studentFacing\(/);
    expect(read("src/lib/modules/queries.ts")).not.toMatch(
      /getCourseExport[\s\S]{0,400}animation_notes/,
    );
  });

  it("seule la correction type du QCM sort, par une pièce dédiée", () => {
    const route = read("src/app/api/modules/[id]/evaluations/route.ts");
    expect(route).toMatch(/qcmCorrectionThemes/);
    expect(route).not.toMatch(/quiz_attempt|submissions|grade\b/);
  });
});
