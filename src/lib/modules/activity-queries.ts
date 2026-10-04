import { cleanActivity, EMPTY_ACTIVITY, type Activity } from "@/lib/modules/activity";
import { createClient } from "@/lib/supabase/server";

/**
 * Détails des activités du déroulé d'une séance (durée, type, horaire, objectif, état). Protégé :
 * sans la migration, `available` est faux et le déroulé reste simple.
 */
export async function getCourseActivities(
  courseId: string,
): Promise<{ available: boolean; byResource: Map<string, Activity> }> {
  const byResource = new Map<string, Activity>();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_resource")
      .select(
        "resource_id, duration_minutes, activity_type, start_time, pedagogical_objective, prep_state",
      )
      .eq("course_id", courseId);
    if (error || !data) return { available: false, byResource };
    for (const row of data) {
      byResource.set(
        row.resource_id,
        cleanActivity({
          durationMinutes: row.duration_minutes,
          type: row.activity_type,
          startTime: row.start_time,
          objective: row.pedagogical_objective,
          prepState: row.prep_state ?? EMPTY_ACTIVITY.prepState,
        }),
      );
    }
    return { available: true, byResource };
  } catch {
    return { available: false, byResource };
  }
}
