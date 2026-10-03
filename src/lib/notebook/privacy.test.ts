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
  "src/lib/present",
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
  /student_observation|observation_tag|retro_note|experience_note|not_covered|\bcompletion\b|lib\/notebook|components\/notebook/;

/**
 * `next_time` (« À faire pour la prochaine fois ») est autorisé sur UNE diapositive projetée
 * (US-68), lue par ce seul fichier : ni PDF, ni e-mail, ni autre page.
 */
const NEXT_TIME_ALLOWED = "src/lib/present/reprise.ts";

/**
 * US-134 : la vue présentatrice (seconde fenêtre, jamais projetée) affiche les notes de séance de
 * Marie, stockées dans `retro_note`. Son seul point de lecture est cette page ; la fenêtre
 * projetée, elle, ne doit jamais y toucher (voir le test dédié plus bas).
 */
const PRIVATE_VIEW_PAGE =
  "src/app/(present)/present/modules/[id]/courses/[courseId]/presenter/page.tsx";
const PROJECTED_PAGE = "src/app/(present)/present/modules/[id]/courses/[courseId]/page.tsx";

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
    const leaks = sources
      .filter((f) => f !== PRIVATE_VIEW_PAGE)
      .filter((f) => PRIVATE.test(readFileSync(join(ROOT, f), "utf8")));
    expect(leaks).toEqual([]);
  });

  it("la vue présentatrice ne lit que retro_note ; la page projetée ne lit rien du carnet", () => {
    const privateView = readFileSync(join(ROOT, PRIVATE_VIEW_PAGE), "utf8");
    // Le carnet des étudiant·es (saisie seule : ObservationPanel) vit dans la vue privée ; elle ne
    // lit en revanche aucune donnée de clôture ni aucune observation existante.
    const others =
      /student_observation|observation_tag|experience_note|not_covered|\bcompletion\b|next_time|lib\/notebook\/queries/;
    expect(others.test(privateView)).toBe(false);
    expect(PRIVATE.test(readFileSync(join(ROOT, PROJECTED_PAGE), "utf8"))).toBe(false);
  });

  it("next_time n'est lu que par la diapositive de reprise (US-68)", () => {
    const sources = OUTWARD.flatMap(files).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"),
    );
    const readers = sources.filter((f) => /next_time/.test(readFileSync(join(ROOT, f), "utf8")));
    expect(readers).toEqual([NEXT_TIME_ALLOWED]);
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

describe("vue présentatrice (US-64) : la fenêtre projetée ne montre que du contenu étudiant·es", () => {
  const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
  const PROJECTED = "src/app/(present)/present/modules/[id]/courses/[courseId]/page.tsx";
  const PRESENTER = "src/app/(present)/present/modules/[id]/courses/[courseId]/presenter/page.tsx";

  it("la fenêtre projetée filtre ses ressources par studentFacing() et ignore les notes", () => {
    const source = read(PROJECTED);
    expect(source).toMatch(/studentFacing\(/);
    expect(source).not.toMatch(/animation_notes|assessment_notes|material|audience/);
  });

  it("le déroulé projeté ne reçoit que des ressources déjà filtrées par la page", () => {
    const presenter = read(PRESENTER);
    // Les diapositives de la vue présentatrice sont les mêmes que celles projetées…
    expect(presenter).toMatch(/resources: studentFacing\(allResources\)/);
    // …et les ressources réservées ne passent que par la liste de la vue présentatrice.
    expect(read("src/components/present/course-deck.tsx")).not.toMatch(/audience|teacher/);
  });

  it("seul le code de synchronisation parle au canal, avec des indices uniquement", () => {
    const users = [
      "src/components/present/present-shell.tsx",
      "src/components/present/presenter-view.tsx",
    ];
    for (const file of users) {
      const posts = [...read(file).matchAll(/postMessage\(([^)]*)\)/g)].map((m) => m[1]);
      expect(posts.length).toBeGreaterThan(0);
      for (const payload of posts) expect(payload).toMatch(/^\{ type: "(state|go|hello)"/);
    }
  });
});
