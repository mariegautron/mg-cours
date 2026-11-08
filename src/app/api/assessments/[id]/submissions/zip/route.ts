import { zipSync } from "fflate";

import { ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { deadlineOf, lateMinutes } from "@/lib/deposits/rules";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (s: string) =>
  s
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "Sans nom";

/**
 * Tous les rendus d'une évaluation dans un ZIP : un dossier par groupe (« Nom du groupe ») ou par
 * personne (« Nom Prénom »), suffixé « (en retard) » si le dépôt a eu lieu après la date limite. Les
 * liens sont réunis dans un fichier « liens.txt » du dossier. Session de Marie requise (RLS).
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/assessments/[id]/submissions/zip">,
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!assessment) return new Response("Introuvable", { status: 404 });
  const { data: items } = await supabase
    .from("submission_item")
    .select("*")
    .eq("assessment_id", id)
    .order("created_at");
  const current = (items ?? []).filter(
    (i) => !(i as unknown as { replaced_at?: string | null }).replaced_at,
  );
  if (!current.length) return new Response("Aucun rendu à télécharger", { status: 404 });

  const [{ data: groups }, { data: students }] = await Promise.all([
    supabase.from("student_group").select("id, name"),
    supabase.from("student").select("id, first_name, last_name"),
  ]);
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const studentName = new Map(
    (students ?? []).map((s) => [s.id, `${s.last_name} ${s.first_name}`.trim()]),
  );
  const extra = assessment as unknown as { oral_start_time?: string | null };
  const deadline = deadlineOf(
    assessment.date,
    extra.oral_start_time ? extra.oral_start_time.slice(0, 5) : null,
  );

  const files: Record<string, Uint8Array> = {};
  const folders = new Map<string, typeof current>();
  for (const it of current) {
    const key = it.group_id ?? it.student_id ?? "";
    folders.set(key, [...(folders.get(key) ?? []), it]);
  }
  for (const [key, list] of folders) {
    const base = clean(groupName.get(key) ?? studentName.get(key) ?? "Sans nom");
    const stamps = list
      .map((i) => (i as unknown as { submitted_at?: string }).submitted_at)
      .filter(Boolean) as string[];
    const late =
      list.some((i) => i.added_by === "student") &&
      stamps.length > 0 &&
      lateMinutes(deadline, new Date(stamps.sort().at(-1) as string)) > 0;
    const dir = `${base}${late ? " (en retard)" : ""}`;
    const links: string[] = [];
    for (const [n, it] of list.entries()) {
      if (it.kind === "link" && it.url) {
        links.push(it.url);
        continue;
      }
      if (!it.storage_path) continue;
      const { data } = await supabase.storage
        .from(ASSESSMENT_FILES_BUCKET)
        .download(it.storage_path);
      if (!data) continue;
      files[`${dir}/${n + 1}-${clean(it.file_name ?? "rendu")}`] = new Uint8Array(
        await data.arrayBuffer(),
      );
    }
    if (links.length) files[`${dir}/liens.txt`] = new TextEncoder().encode(links.join("\n"));
  }
  if (Object.keys(files).length === 0) return new Response("Aucun fichier", { status: 404 });
  const zip = zipSync(files, { level: 0 });
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="rendus.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
