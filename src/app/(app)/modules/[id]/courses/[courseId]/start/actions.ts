"use server";

import { recordProjection } from "@/app/(present)/present/modules/[id]/courses/[courseId]/presenter/actions";

/**
 * « Commencer le cours » : les éléments gardés « pour moi » sont notés dans le journal de la
 * séance (« Pour moi »), pour que la clôture ne les propose pas à reporter. « Au mieux », comme
 * le journal de projection.
 */
export async function recordKeptForMe(courseId: string, keys: string[]): Promise<void> {
  for (const key of keys.slice(0, 50)) {
    await recordProjection({ courseId, sectionKey: key, resourceId: null, kind: "private" });
  }
}
