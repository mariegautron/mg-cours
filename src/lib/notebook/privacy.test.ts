/**
 * Garde-fou US-65 / US-67 : le carnet de séance (observations sur les étudiant·es, clôture,
 * retour d'expérience) ne sort jamais de l'application — ni PDF, ni e-mail, ni présentation.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toExportCourses, type ExportCourseRow } from "@/lib/modules/course-export";
import { buildOutlineContent, type OutlineInput } from "@/lib/ynov/outline";

const ROOT = join(__dirname, "..", "..", "..");

/** Tout ce qui produit un PDF, un e-mail, un fichier téléchargé ou une page projetée. */
const OUTWARD = [
  "src/lib/pdf",
  "src/app/api",
  "src/app/(present)",
  "src/components/present",
  "src/lib/modules/course-export.ts",
  "src/lib/ynov/outline.ts",
  "src/lib/outline",
  "src/lib/assessments/results.ts",
  "src/lib/assessments/results-data.ts",
  "src/lib/invoice",
  "src/app/(app)/modules/[id]/assessments/email-action.ts",
  "src/app/(app)/modules/[id]/billing/actions.ts",
];

const PRIVATE =
  /student_observation|observation_tag|retro_note|not_covered|next_time|\bcompletion\b|lib\/notebook|components\/notebook/;

function files(path: string): string[] {
  const abs = join(ROOT, path);
  if (statSync(abs).isFile()) return [path];
  return readdirSync(abs).flatMap((name) => files(join(path, name)));
}

describe("carnet de séance : données privées", () => {
  it("aucun code d'export, d'e-mail ou de présentation ne lit le carnet", () => {
    const sources = OUTWARD.flatMap(files).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"),
    );
    expect(sources.length).toBeGreaterThan(10);
    const leaks = sources.filter((f) => PRIVATE.test(readFileSync(join(ROOT, f), "utf8")));
    expect(leaks).toEqual([]);
  });

  const SECRET = {
    completion: "partial",
    not_covered: "SECRET-non-traite",
    next_time: "SECRET-prochaine-fois",
    retro_note: "SECRET-retour-experience",
  };

  it("l'export PDF des cours ignore la clôture même si la ligne la contient", () => {
    const row = {
      title: "Séance 1",
      session_date: "2026-10-12",
      learning_objectives: [],
      material: null,
      course_resource: [],
      ...SECRET,
    } as ExportCourseRow;
    expect(JSON.stringify(toExportCourses([row]))).not.toMatch(/SECRET|partial/);
  });

  it("la progression pédagogique ignore la clôture même si la séance la contient", () => {
    const course = {
      title: "Séance 1",
      type: "lecture",
      position: 1,
      session_date: "2026-10-12",
      learning_objectives: [],
      animation_notes: null,
      assessment_notes: null,
      material: null,
      content_last_updated_at: "2026-10-01T00:00:00Z",
      resources: [],
      ...SECRET,
    } as OutlineInput["courses"][number];
    const content = buildOutlineContent({
      teacherName: "Marie",
      module: {
        name: "M",
        ycode: null,
        level: null,
        year: 2026,
        total_hours: 21,
        hours_lecture: null,
        hours_td: null,
        hours_tp: null,
        school: null,
      },
      courses: [course],
    });
    expect(JSON.stringify(content)).not.toMatch(/SECRET|partial/);
  });
});
