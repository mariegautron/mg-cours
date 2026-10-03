import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export interface SubmissionItemsData {
  /** La table existe : sinon on retombe sur le lien unique par groupe (project_submission). */
  available: boolean;
  items: Tables<"submission_item">[];
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
    return { available: true, items: data };
  } catch {
    return { available: false, items: [] };
  }
}
