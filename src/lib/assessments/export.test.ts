import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { correctionCriteria, exportableAssessments } from "./export";
import type { GridHandout } from "./grid-handout";

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

describe("correctionCriteria", () => {
  it("ne garde que les critères avec attendus ou référence", () => {
    const criterion = (label: string, description: string | null, reference: string | null) => ({
      label,
      description,
      reference,
      isBonus: false,
      max: 2,
      levels: [],
    });
    const handout = {
      axes: [
        {
          label: null,
          max: 4,
          bonusMax: 0,
          criteria: [criterion("Avec", "Attendu", null), criterion("Sans", " ", null)],
        },
      ],
    } as unknown as GridHandout;
    expect(correctionCriteria(handout).map((c) => c.label)).toEqual(["Avec"]);
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
    expect(route).toMatch(/qcmCorrectionQuestions/);
    expect(route).not.toMatch(/quiz_attempt|submissions|grade\b/);
  });
});
