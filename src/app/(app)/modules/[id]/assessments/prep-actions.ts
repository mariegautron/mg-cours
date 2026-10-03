"use server";

import { revalidatePath } from "next/cache";

import {
  parseExamKind,
  parseSubjectVersions,
  parseSubmissionMode,
  type ExamKind,
  type SubjectVersions,
  type SubmissionMode,
} from "@/lib/assessments/exam-kind";
import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

export interface PrepState {
  error?: string;
  savedAt?: string;
}

const UNAVAILABLE =
  "Ce choix sera disponible après la mise à jour de la base de données. Rien n’est perdu : reviens ici ensuite.";

/**
 * Évaluation individuelle (IndPrep) : type d'épreuve, versions du sujet, arrivée des rendus, sujet de
 * rattrapage préparé d'avance. Colonnes additives : si la migration n'est pas appliquée, on le dit
 * au lieu d'échouer.
 */
export async function saveIndividualPrep(
  moduleId: string,
  assessmentId: string,
  patch: {
    examKind?: ExamKind;
    subjectVersions?: SubjectVersions;
    submissionMode?: SubmissionMode;
    makeupPrepared?: boolean;
  },
): Promise<PrepState> {
  const update: TablesUpdate<"assessment"> = {};
  if (patch.examKind !== undefined) {
    const v = parseExamKind(patch.examKind);
    if (!v) return { error: "Type d’épreuve inconnu." };
    update.exam_kind = v;
  }
  if (patch.subjectVersions !== undefined) {
    update.subject_versions = parseSubjectVersions(patch.subjectVersions);
  }
  if (patch.submissionMode !== undefined) {
    const v = parseSubmissionMode(patch.submissionMode);
    if (!v) return { error: "Mode d’arrivée inconnu." };
    update.submission_mode = v;
  }
  if (patch.makeupPrepared !== undefined) update.makeup_prepared = !!patch.makeupPrepared;
  if (Object.keys(update).length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment")
    .update(update)
    .eq("id", assessmentId)
    .eq("module_id", moduleId)
    .select("id")
    .maybeSingle();
  if (error) {
    // Colonne absente (migration non appliquée) : message clair, pas d'erreur technique.
    return {
      error: /column|schema cache/i.test(error.message) ? UNAVAILABLE : failure("enregistrer"),
    };
  }
  if (!data) return { error: NOT_FOUND.assessment };
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  return {
    savedAt: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }),
  };
}
