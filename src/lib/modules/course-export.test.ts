import { describe, expect, it } from "vitest";

import { toExportCourses, type ExportCourseRow } from "./course-export";

const resource = (title: string, audience: "students" | "teacher") => ({
  title,
  description: null,
  content: `# ${title}`,
  url: null,
  audience,
});

describe("toExportCourses", () => {
  const rows: ExportCourseRow[] = [
    {
      title: "Cadrage",
      session_date: "2026-10-12",
      learning_objectives: ["Rédiger un dossier de cadrage"],
      material: null,
      course_resource: [
        { role: "secondary", resource: resource("Corrigé cartographie", "teacher") },
        { role: "secondary", resource: resource("Modèle de cadrage", "students") },
        { role: "primary", resource: resource("Dossier de cadrage", "students") },
        { role: "secondary", resource: null },
      ],
    },
  ];

  it("n'inclut jamais une ressource réservée à l'enseignante", () => {
    const [course] = toExportCourses(rows);
    expect(course.resources.map((r) => r.title)).toEqual([
      "Dossier de cadrage",
      "Modèle de cadrage",
    ]);
    expect(JSON.stringify(course)).not.toContain("Corrigé");
  });

  it("numérote les séances et n'expose pas le champ audience", () => {
    const [course] = toExportCourses(rows);
    expect(course.number).toBe(1);
    expect(course.resources[0]).not.toHaveProperty("audience");
  });
});
