import { createClient } from "@/lib/supabase/server";

export interface CoursePlan {
  deliverable: string;
  resourceOrder: string[];
}

/** Plans des séances d'un module. Table absente (migration non appliquée) : aucun plan, `available: false`. */
export async function getModulePlans(
  courseIds: string[],
): Promise<{ available: boolean; plans: Map<string, CoursePlan> }> {
  const plans = new Map<string, CoursePlan>();
  if (courseIds.length === 0) return { available: true, plans };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("course_plan")
      .select("course_id, deliverable, resource_order")
      .in("course_id", courseIds);
    if (error) return { available: false, plans };
    for (const row of data ?? []) {
      plans.set(row.course_id, {
        deliverable: row.deliverable,
        resourceOrder: row.resource_order ?? [],
      });
    }
    return { available: true, plans };
  } catch {
    return { available: false, plans };
  }
}

/** Ordre voulu des ressources d'une séance ; `null` si pas de plan ou table absente. */
export async function getCourseResourceOrder(courseId: string): Promise<string[] | null> {
  const { plans } = await getModulePlans([courseId]);
  return plans.get(courseId)?.resourceOrder ?? null;
}
