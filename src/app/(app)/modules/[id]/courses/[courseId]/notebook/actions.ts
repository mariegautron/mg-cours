"use server";

import { revalidatePath } from "next/cache";

import {
  OBSERVATION_TAG_LABELS,
  readClosureForm,
  readObservationForm,
} from "@/lib/notebook/notebook";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface NotebookState {
  error?: string;
  /** Message de confirmation (zone `role=status`). */
  message?: string;
  /** Change à chaque enregistrement réussi (réinitialise le formulaire côté client). */
  savedAt?: number;
}

function refresh(moduleId: string, courseId: string) {
  revalidatePath(`/modules/${moduleId}/courses/${courseId}/notebook`);
  revalidatePath(`/modules/${moduleId}`);
}

async function courseBelongsToModule(moduleId: string, courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course")
    .select("id")
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .maybeSingle();
  return !!data;
}

/** Observation courte sur un·e étudiant·e d'un groupe du module, rattachée à la séance. */
export async function addObservation(
  moduleId: string,
  courseId: string,
  _prev: NotebookState,
  formData: FormData,
): Promise<NotebookState> {
  const parsed = readObservationForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  const { studentId, tag, note } = parsed.data;

  if (!(await courseBelongsToModule(moduleId, courseId))) return { error: NOT_FOUND.course };

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("group_member")
    .select("student:student_id(first_name, last_name), student_group!inner(module_id)")
    .eq("student_id", studentId)
    .eq("student_group.module_id", moduleId)
    .limit(1)
    .maybeSingle();
  const student = (
    membership as unknown as {
      student: { first_name: string; last_name: string } | null;
    } | null
  )?.student;
  if (!student) return { error: "Cet·te étudiant·e n’appartient à aucun groupe du module." };

  const { error } = await supabase.from("student_observation").insert({
    module_id: moduleId,
    course_id: courseId,
    student_id: studentId,
    tag,
    note,
  });
  if (error) return { error: failure("enregistrer") };

  refresh(moduleId, courseId);
  revalidatePath(`/students/${studentId}`);
  return {
    message: `Observation enregistrée : ${student.first_name} ${student.last_name} — ${OBSERVATION_TAG_LABELS[tag]}.`,
    savedAt: Date.now(),
  };
}

export async function deleteObservation(moduleId: string, courseId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_observation")
    .delete()
    .eq("id", id)
    .eq("course_id", courseId)
    .select("student_id")
    .maybeSingle();
  refresh(moduleId, courseId);
  if (data) revalidatePath(`/students/${data.student_id}`);
}

/** Clôture de séance : statut, points non traités, consignes, retour d'expérience privé. */
export async function saveCourseClosure(
  moduleId: string,
  courseId: string,
  _prev: NotebookState,
  formData: FormData,
): Promise<NotebookState> {
  const parsed = readClosureForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  const { completion, notCovered, nextTime, retroNote } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course")
    .update({
      completion,
      not_covered: notCovered,
      next_time: nextTime,
      retro_note: retroNote,
    })
    .eq("id", courseId)
    .eq("module_id", moduleId)
    .select("id")
    .maybeSingle();
  if (error) return { error: failure("enregistrer", { kept: true }) };
  if (!data) return { error: NOT_FOUND.course };

  refresh(moduleId, courseId);
  return { message: "Clôture enregistrée.", savedAt: Date.now() };
}
