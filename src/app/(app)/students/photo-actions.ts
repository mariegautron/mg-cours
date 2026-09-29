"use server";

import { randomUUID } from "node:crypto";

import { unzipSync } from "fflate";
import { revalidatePath } from "next/cache";

import {
  checkPhoto,
  isIgnoredZipEntry,
  matchPhotosToStudents,
  photoPath,
  PHOTO_MAX_BYTES,
  STUDENT_PHOTOS_BUCKET,
  ZIP_MAX_BYTES,
  ZIP_MAX_ENTRIES,
  describePhotoImport,
  type PhotoMime,
} from "@/lib/students/photo";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface PhotoState {
  error?: string;
  message?: string;
}

/** Enregistre une photo (stockage + colonne) et supprime l'ancienne. */
async function storePhoto(
  supabase: Supabase,
  ownerId: string,
  studentId: string,
  bytes: Uint8Array,
  mime: PhotoMime,
): Promise<boolean> {
  const { data: student } = await supabase
    .from("student")
    .select("photo_path")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return false;

  const path = photoPath(ownerId, studentId, mime, randomUUID());
  const { error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) return false;

  const { error: updateError } = await supabase
    .from("student")
    .update({ photo_path: path })
    .eq("id", studentId);
  if (updateError) {
    await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([path]);
    return false;
  }
  if (student.photo_path) {
    await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([student.photo_path]);
  }
  return true;
}

/** Photo d'un·e étudiant·e, une par une. */
export async function uploadStudentPhoto(
  studentId: string,
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez une photo." };
  if (file.size > PHOTO_MAX_BYTES) return { error: "La photo dépasse 2 Mo." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkPhoto(bytes);
  if (!check.ok) return { error: check.error };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  if (!(await storePhoto(supabase, auth.user.id, studentId, bytes, check.mime))) {
    return { error: "Enregistrement impossible. Réessayez." };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return { message: "Photo enregistrée." };
}

export async function deleteStudentPhoto(studentId: string): Promise<PhotoState> {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("student")
    .select("photo_path")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { error: "Étudiant·e introuvable." };

  if (student.photo_path) {
    const { error } = await supabase
      .from("student")
      .update({ photo_path: null })
      .eq("id", studentId);
    if (error) return { error: "Suppression impossible. Réessayez." };
    await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([student.photo_path]);
  }

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return { message: "Photo supprimée." };
}

/** Zip de photos nommées par numéro étudiant (« A12345.jpg »). */
export async function importPhotosZip(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const zip = formData.get("zip");
  if (!(zip instanceof File) || zip.size === 0) return { error: "Choisissez un fichier zip." };
  if (zip.size > ZIP_MAX_BYTES) return { error: "Le zip dépasse 30 Mo." };

  let rejected = 0;
  let count = 0;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await zip.arrayBuffer()), {
      filter: (f) => {
        if (isIgnoredZipEntry(f.name)) return false;
        count++;
        if (count > ZIP_MAX_ENTRIES || f.originalSize > PHOTO_MAX_BYTES) {
          rejected++;
          return false;
        }
        return true;
      },
    });
  } catch {
    return { error: "Zip illisible. Vérifiez le fichier." };
  }
  if (count > ZIP_MAX_ENTRIES)
    return { error: `Le zip contient plus de ${ZIP_MAX_ENTRIES} fichiers.` };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  const { data: students } = await supabase.from("student").select("id, student_number");

  const valid: { name: string; file: { bytes: Uint8Array; mime: PhotoMime } }[] = [];
  for (const [name, bytes] of Object.entries(entries)) {
    const check = checkPhoto(bytes);
    if (check.ok) valid.push({ name, file: { bytes, mime: check.mime } });
    else rejected++;
  }

  const match = matchPhotosToStudents(valid, students ?? []);
  let added = 0;
  for (const m of match.matched) {
    if (await storePhoto(supabase, auth.user.id, m.studentId, m.file.bytes, m.file.mime)) added++;
    else rejected++;
  }

  revalidatePath("/students");
  const summary = describePhotoImport({
    added,
    unmatched: match.unmatched.length,
    ambiguous: match.ambiguous.length,
    rejected,
  });
  return added > 0 ? { message: summary } : { error: summary };
}
