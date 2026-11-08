import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface SubmissionItemsData {
  /** La table existe : sinon on retombe sur le lien unique par groupe (project_submission). */
  available: boolean;
  items: Tables<"submission_item">[];
  /** Versions remplacées par un nouveau dépôt (visibles par Marie seulement). */
  replaced?: Tables<"submission_item">[];
  /** Dépôts d'étudiant·es que Marie n'a pas encore vus (notification « nouveau rendu »). */
  unseen?: Tables<"submission_item">[];
}

export async function listSubmissionItems(assessmentId: string): Promise<SubmissionItemsData> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("submission_item")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at");
    if (error || !data) return { available: false, items: [] };
    // Les versions remplacées (colonne ajoutée par la migration d'historique) ne comptent plus dans le rendu.
    const isReplaced = (i: unknown) => !!(i as { replaced_at?: string | null }).replaced_at;
    return {
      available: true,
      items: data.filter((i) => !isReplaced(i)),
      replaced: data.filter(isReplaced),
      unseen: data.filter((i) => {
        const x = i as unknown as { added_by?: string; teacher_seen_at?: string | null };
        return !isReplaced(i) && x.added_by === "student" && !x.teacher_seen_at;
      }),
    };
  } catch {
    return { available: false, items: [] };
  }
}
