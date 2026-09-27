import type { Tables } from "@/types/db";

type Student = Pick<Tables<"student">, "id" | "first_name" | "last_name">;

export interface TargetGroup<S extends Student = Student> {
  id: string;
  name: string;
  members: S[];
}

/**
 * Formulaires de saisie d'une évaluation, rangés par groupe visé :
 * - note de groupe : un formulaire par groupe (`students` vide) ;
 * - note individuelle : un formulaire par membre de l'ensemble des groupes. Un·e étudiant·e
 *   présent·e dans plusieurs groupes n'apparaît qu'une fois, dans le premier groupe qui le/la contient.
 * Les groupes sont triés par nom, les membres par nom puis prénom.
 */
export function gradingTargets<S extends Student>(
  isGroupGrade: boolean,
  groups: TargetGroup<S>[],
): { group: TargetGroup<S>; students: S[] }[] {
  const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  if (isGroupGrade) return sorted.map((group) => ({ group, students: [] }));

  const seen = new Set<string>();
  return sorted.map((group) => {
    const students = group.members
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .sort(
        (a, b) =>
          a.last_name.localeCompare(b.last_name, "fr") ||
          a.first_name.localeCompare(b.first_name, "fr"),
      );
    return { group, students };
  });
}
