import type { Tables } from "@/types/db";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";

export type Checkpoint = Tables<"checkpoint">;
export type CheckpointResult = Tables<"checkpoint_result">;

export async function listCheckpoints(moduleId: string): Promise<Checkpoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkpoint")
    .select("*")
    .eq("module_id", moduleId)
    .order("position");
  return data ?? [];
}

export async function getCheckpoint(moduleId: string, id: string): Promise<Checkpoint | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkpoint")
    .select("*")
    .eq("id", id)
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}

/** Étudiant·es du module (membres de ses groupes, sans doublon), par nom. */
export async function listModuleStudents(moduleId: string): Promise<Tables<"student">[]> {
  const groups = await listModuleGroups(moduleId);
  const byId = new Map<string, Tables<"student">>();
  for (const g of groups) for (const s of g.members) byId.set(s.id, s);
  return [...byId.values()].sort(
    (a, b) =>
      a.last_name.localeCompare(b.last_name, "fr") ||
      a.first_name.localeCompare(b.first_name, "fr"),
  );
}

export async function listCheckpointResults(checkpointIds: string[]): Promise<CheckpointResult[]> {
  if (checkpointIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkpoint_result")
    .select("*")
    .in("checkpoint_id", checkpointIds);
  return data ?? [];
}

export async function getCheckpointResult(
  checkpointId: string,
  studentId: string,
): Promise<CheckpointResult | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkpoint_result")
    .select("*")
    .eq("checkpoint_id", checkpointId)
    .eq("student_id", studentId)
    .maybeSingle();
  return data;
}
