import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/db";

export async function getProfile(): Promise<Tables<"teacher_profile"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("teacher_profile").select("*").maybeSingle();
  return data;
}

export async function listAllSchools(): Promise<Tables<"school">[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("school").select("*").order("name");
  return data ?? [];
}

export async function getSchool(id: string): Promise<Tables<"school"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("school").select("*").eq("id", id).maybeSingle();
  return data;
}
