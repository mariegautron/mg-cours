/** US-59: Planning a la creation du module.
 * Server Actions pour creer les seances depuis un planning.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { parseSchedule, validateSessionOrder } from "./schedule-parser";

export interface CreateCoursesResult {
  created: number;
  errors: string[];
}

/** Cree les seances depuis un texte de planning.
 * Parse le texte, valide l'ordre, puis cree les seances dans la base.
 * Les seances sont numerotees dans l'ordre du planning.
 * La premiere seance definit first_session_date du module.
 */
export async function createCoursesFromSchedule(
  moduleId: string,
  scheduleText: string,
): Promise<CreateCoursesResult> {
  const supabase = await createClient();
  
  // Parser le planning
  const { sessions, errors } = parseSchedule(scheduleText);
  
  if (sessions.length === 0) {
    return { created: 0, errors };
  }
  
  // Valider l'ordre chronologique
  const orderError = validateSessionOrder(sessions);
  if (orderError) {
    return { created: 0, errors: [...errors, orderError] };
  }
  
  // Creer les seances
  const courses = sessions.map((s, index) => ({
    module_id: moduleId,
    title: `S\u0019ance ${index + 1}`,
    position: index + 1,
    session_date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
    type: "lecture" as const,
    prep_status: "todo" as const,
    learning_objectives: [] as string[],
  }));
  
  const { error } = await supabase.from("course").insert(courses);
  
  if (error) {
    return { created: 0, errors: [...errors, `Erreur base de donn\u0019es : ${error.message}`] };
  }
  
  // Mettre a jour first_session_date du module si la premiere seance a une date
  if (sessions[0].date) {
    await supabase
      .from("module")
      .update({ first_session_date: sessions[0].date })
      .eq("id", moduleId);
  }
  
  return { created: courses.length, errors };
}
