import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tables personnelles de Marie. Ni les jetons (liens de résultats, accès QCM) ni le carnet privé de séance : une règle du projet les garde hors de tout export.
const TABLES = [
  "teacher_profile",
  "school",
  "school_setting",
  "module",
  "course",
  "course_plan",
  "resource",
  "resource_version",
  "question",
  "question_choice",
  "student",
  "student_group",
  "assessment",
  "grade",
  "appreciation",
  "grading_grid",
  "invoice",
  "invoice_tracking",
  "module_retrospective",
] as const;

/** Export JSON de toutes les données de la personne connectée (RLS : seulement les siennes). */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connectée", { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    out[t] = error ? [] : data;
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mes-donnees.json"',
      "Cache-Control": "no-store",
    },
  });
}
