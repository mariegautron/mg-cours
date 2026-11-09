import { ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { safeName } from "@/lib/export/csv";
import { parseResourceFiles, RESOURCE_FILES_BUCKET } from "@/lib/resources/files";
import { STUDENT_PHOTOS_BUCKET } from "@/lib/students/photo";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Durée des liens signés : le navigateur télécharge les fichiers un à un pendant ce temps. */
const SIGNED_SECONDS = 60 * 60;

/**
 * « Exporter mes fichiers » : la liste des fichiers (nom dans le .zip + lien signé d'une heure).
 * Le navigateur les télécharge et construit le .zip lui-même : rien de lourd ne passe par ici.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connectée", { status: 401 });

  const [mods, assessments, groups, students, submissions, resources, documents] =
    await Promise.all([
      supabase.from("module").select("id, name"),
      supabase.from("assessment").select("id, title, module_id, files"),
      supabase.from("student_group").select("id, name"),
      supabase.from("student").select("id, first_name, last_name, photo_path"),
      supabase
        .from("submission_item")
        .select("assessment_id, student_id, group_id, storage_path, file_name, label")
        .not("storage_path", "is", null),
      supabase.from("resource").select("title, files"),
      supabase.from("module_document").select("module_id, name, path"),
    ]);
  const moduleName = new Map((mods.data ?? []).map((m) => [m.id, m.name]));
  const assessmentById = new Map((assessments.data ?? []).map((a) => [a.id, a]));
  const groupName = new Map((groups.data ?? []).map((g) => [g.id, g.name]));
  const studentName = new Map(
    (students.data ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`]),
  );

  const wanted: { bucket: string; path: string; name: string }[] = [];
  for (const s of submissions.data ?? []) {
    const a = assessmentById.get(s.assessment_id);
    const who = s.student_id
      ? (studentName.get(s.student_id) ?? "étudiant·e")
      : (groupName.get(s.group_id ?? "") ?? "groupe");
    wanted.push({
      bucket: ASSESSMENT_FILES_BUCKET,
      path: s.storage_path!,
      name: `rendus/${safeName(moduleName.get(a?.module_id ?? "") ?? "")}/${safeName(a?.title ?? "")}/${safeName(who)} - ${safeName(s.file_name || s.label)}`,
    });
  }
  for (const a of assessments.data ?? []) {
    for (const f of parseResourceFiles(a.files)) {
      wanted.push({
        bucket: ASSESSMENT_FILES_BUCKET,
        path: f.path,
        name: `evaluations/${safeName(moduleName.get(a.module_id) ?? "")}/${safeName(a.title)}/${safeName(f.name)}`,
      });
    }
  }
  for (const r of resources.data ?? []) {
    for (const f of parseResourceFiles(r.files)) {
      wanted.push({
        bucket: RESOURCE_FILES_BUCKET,
        path: f.path,
        name: `ressources/${safeName(r.title)}/${safeName(f.name)}`,
      });
    }
  }
  for (const d of documents.data ?? []) {
    wanted.push({
      bucket: "module-documents",
      path: d.path,
      name: `documents/${safeName(moduleName.get(d.module_id) ?? "")}/${safeName(d.name)}`,
    });
  }
  for (const s of students.data ?? []) {
    if (!s.photo_path) continue;
    const ext = s.photo_path.split(".").pop() || "jpg";
    wanted.push({
      bucket: STUDENT_PHOTOS_BUCKET,
      path: s.photo_path,
      name: `photos/${safeName(`${s.last_name} ${s.first_name}`)}.${ext}`,
    });
  }

  // Liens signés, par lot et par bucket.
  const files: { name: string; url: string }[] = [];
  const skipped: string[] = [];
  const byBucket = new Map<string, typeof wanted>();
  for (const w of wanted) byBucket.set(w.bucket, [...(byBucket.get(w.bucket) ?? []), w]);
  for (const [bucket, list] of byBucket) {
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const { data } = await supabase.storage.from(bucket).createSignedUrls(
        chunk.map((w) => w.path),
        SIGNED_SECONDS,
      );
      chunk.forEach((w, k) => {
        const url = data?.[k]?.signedUrl;
        if (url) files.push({ name: w.name, url });
        else skipped.push(w.name);
      });
    }
  }
  return Response.json({ files, skipped }, { headers: { "Cache-Control": "no-store" } });
}
