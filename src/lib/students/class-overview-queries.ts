import "server-only";

import type { GroupOverviewRow, OverviewRow } from "@/components/students/class-overview";
import { appreciationStatus, STATUS_LABELS } from "@/lib/appreciations/appreciation";
import { listAppreciations } from "@/lib/appreciations/queries";
import { moduleStudentAverages } from "@/lib/assessments/queries";
import { listModuleObservations } from "@/lib/notebook/queries";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { listModuleGroups } from "@/lib/students/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Vue de classe (observations par personne et par groupe, moyenne, appréciation) : affichée dans
 * Appréciations, où elle sert à écrire (doublon D33, avant sur la page des groupes).
 */
export async function loadClassOverview(
  id: string,
): Promise<{ overview: OverviewRow[]; groupRows: GroupOverviewRow[] }> {
  const [groups, observations, appreciations, rules, averages] = await Promise.all([
    listModuleGroups(id),
    listModuleObservations(id),
    listAppreciations(id),
    getSchoolRulesForModule(id),
    moduleStudentAverages(id),
  ]);
  const people = [...new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m])).values()];
  const averageOf = new Map(averages.map((a) => [a.student.id, a.average.average]));
  const overview: OverviewRow[] = people.map((m) => {
    const mine = observations.filter((o) => o.student_id === m.id);
    const count = (...tags: string[]) => mine.filter((o) => tags.includes(o.tag)).length;
    const status = appreciationStatus(
      appreciations.byStudent.get(m.id) ?? "",
      rules.appreciationMax,
    );
    return {
      id: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      participation: count("participation"),
      question: count("relevant_question"),
      difficulty: count("difficulty"),
      other: count("other", "absent_late"),
      total: mine.length,
      average: averageOf.get(m.id) ?? null,
      appreciation: STATUS_LABELS[status],
      appreciationTone: status === "written" ? "ok" : status === "too_long" ? "lock" : "warn",
    };
  });
  // Une ligne par groupe : ses observations de groupe (même découpage par étiquette).
  const supabase = await createClient();
  const { data: groupObs } = groups.length
    ? await supabase
        .from("group_observation")
        .select("student_group_id, tag")
        .in(
          "student_group_id",
          groups.map((g) => g.id),
        )
    : { data: [] };
  const groupRows: GroupOverviewRow[] = groups.map((g) => {
    const mine = (groupObs ?? []).filter((o) => o.student_group_id === g.id);
    const count = (...tags: string[]) => mine.filter((o) => tags.includes(o.tag)).length;
    return {
      id: g.id,
      name: g.name,
      participation: count("participation"),
      question: count("relevant_question"),
      difficulty: count("difficulty"),
      other: count("other", "absent_late"),
      total: mine.length,
    };
  });

  return { overview, groupRows };
}
