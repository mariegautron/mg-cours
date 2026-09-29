import { ASSESSMENT_FILES_BUCKET, type AssessmentFile } from "@/lib/assessments/files";
import { copiedFile } from "@/lib/modules/duplicate-evaluations";
import { createClient } from "@/lib/supabase/server";

/**
 * Copie réelle des fichiers d'un sujet dans le stockage privé, vers le dossier de la nouvelle
 * évaluation (pas une référence : supprimer l'original ne casse jamais la copie). Renvoie les fichiers
 * copiés et les noms de ceux qui n'ont pas pu l'être.
 */
export async function copyAssessmentFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  files: readonly AssessmentFile[],
  newAssessmentId: string,
): Promise<{ copied: AssessmentFile[]; failed: string[] }> {
  const storage = supabase.storage.from(ASSESSMENT_FILES_BUCKET);
  const copied: AssessmentFile[] = [];
  const failed: string[] = [];
  for (const file of files) {
    const next = copiedFile(file, ownerId, newAssessmentId);
    const { error } = await storage.copy(file.path, next.path);
    if (error) failed.push(file.name);
    else copied.push(next);
  }
  return { copied, failed };
}
