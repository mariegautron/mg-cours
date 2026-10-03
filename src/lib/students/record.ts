/** US-161 : fiche d'une personne — notes par module, présences. Fonctions pures. */

export type Attendance = "present" | "absent_unexcused" | "absent_excused";

export interface GradeLine {
  moduleId: string;
  moduleName: string;
  assessmentId: string;
  assessmentTitle: string;
  value: number | null;
  maxScore: number;
  attendance: Attendance;
  isGroupGrade: boolean;
}

export interface ModuleGrades {
  moduleId: string;
  moduleName: string;
  lines: GradeLine[];
}

/** Notes regroupées par module (ordre alphabétique), évaluations par titre. */
export function gradesByModule(lines: readonly GradeLine[]): ModuleGrades[] {
  const map = new Map<string, ModuleGrades>();
  for (const l of lines) {
    const m = map.get(l.moduleId) ?? { moduleId: l.moduleId, moduleName: l.moduleName, lines: [] };
    m.lines.push(l);
    map.set(l.moduleId, m);
  }
  return [...map.values()]
    .map((m) => ({
      ...m,
      lines: [...m.lines].sort((a, b) => a.assessmentTitle.localeCompare(b.assessmentTitle, "fr")),
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName, "fr"));
}

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Présent·e",
  absent_excused: "Absence excusée",
  absent_unexcused: "Absence non prévenue",
};

/** Absences seulement (la présence est la règle, on ne liste que les exceptions). */
export function absences(lines: readonly GradeLine[]): GradeLine[] {
  return lines.filter((l) => l.attendance !== "present");
}

/** « 14 / 20 » ou « pas de note ». */
export function formatGrade(value: number | null, max: number): string {
  if (value === null) return "pas de note";
  const f = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `${f(value)} / ${f(max)}`;
}
