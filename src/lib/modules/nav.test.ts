import { describe, expect, it } from "vitest";

import { activeModuleNav, moduleNavItems, moduleSectionLabel } from "./nav";

describe("menu d'un module (table de navigation)", () => {
  it("7 entrées dans l'ordre", () => {
    expect(moduleNavItems("m1").map((i) => i.label)).toEqual([
      "Cette semaine",
      "Séances",
      "Évaluations",
      "Classe",
      "Espace étudiant·es",
      "Programme",
      "Clôture",
    ]);
  });
  it("entrée courante d'après l'adresse", () => {
    expect(activeModuleNav("/modules/m1/billing", "m1")).toBe("closing");
    expect(activeModuleNav("/modules/m1/assessments/a2/quiz", "m1")).toBe("assessments");
    expect(activeModuleNav("/modules/m1/project", "m1")).toBe("assessments");
    expect(activeModuleNav("/modules/m1/courses/c1/notebook", "m1")).toBe("sessions");
    expect(activeModuleNav("/modules/m1/planning", "m1")).toBe("sessions");
    expect(activeModuleNav("/modules/m1/appreciations", "m1")).toBe("class");
    expect(activeModuleNav("/modules/m1/expectations", "m1")).toBe("program");
    expect(activeModuleNav("/modules/m1", "m1")).toBe("week");
    expect(activeModuleNav("/modules/m2/billing", "m1")).toBeNull();
    expect(moduleSectionLabel("/modules/m1", "m1")).toBe("Cette semaine");
  });
});
