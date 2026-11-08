/**
 * Copies incomplètes (commencées, sans note) et personnes à qui un lien de résultats est déjà
 * publié pour elles. Fonction pure, partagée par la page Résultats et la fiche de l'évaluation.
 */
export interface IncompleteGradeRow {
  value: number | null;
  attendance: string | null;
  scores: unknown;
  student_id: string | null;
  student_group_id: string | null;
}

export interface IncompleteGroup {
  id: string;
  name: string;
  members: { id: string; first_name: string; last_name: string }[];
}

export interface IncompleteCopy {
  key: string;
  name: string;
  /** Personnes concernées (l'étudiant·e, ou les membres du groupe). */
  students: { id: string; name: string }[];
}

export function incompleteCopies(
  grades: readonly IncompleteGradeRow[],
  groups: readonly IncompleteGroup[],
): IncompleteCopy[] {
  const out: IncompleteCopy[] = [];
  for (const g of grades) {
    const started =
      typeof g.scores === "object" &&
      g.scores !== null &&
      Object.keys(g.scores as Record<string, unknown>).length > 0;
    if (g.value !== null || g.attendance !== "present" || !started) continue;
    if (g.student_group_id) {
      const group = groups.find((x) => x.id === g.student_group_id);
      out.push({
        key: g.student_group_id,
        name: group?.name ?? "Groupe",
        students: (group?.members ?? []).map((m) => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
        })),
      });
    } else if (g.student_id) {
      const member = groups.flatMap((x) => x.members).find((m) => m.id === g.student_id);
      const name = member ? `${member.first_name} ${member.last_name}` : "Copie";
      out.push({ key: g.student_id, name, students: [{ id: g.student_id, name }] });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Copies incomplètes dont au moins une personne a déjà un lien de résultats actif. */
export function publishedIncomplete(
  copies: readonly IncompleteCopy[],
  published: ReadonlySet<string>,
): IncompleteCopy[] {
  return copies
    .map((c) => ({ ...c, students: c.students.filter((s) => published.has(s.id)) }))
    .filter((c) => c.students.length > 0);
}
