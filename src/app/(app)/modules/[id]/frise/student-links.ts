"use server";

import { revalidatePath } from "next/cache";

import { clientEnv } from "@/lib/env";
import { studentSpaceUrl } from "@/lib/modules/espace";
import { failure } from "@/lib/messages";
import { notebookStudents } from "@/lib/notebook/notebook";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";
import { listModuleGroups } from "@/lib/students/queries";

export interface StudentLinksState {
  error?: string;
  /** Liens créés : les jetons ne sont jamais relisibles ensuite (seul le haché est gardé). */
  links?: { name: string; url: string }[];
}

/**
 * Crée les liens personnels de l'espace étudiant·e. `onlyMissing` : seulement pour les personnes
 * sans lien actif ; sinon tous les liens sont renouvelés (les anciens cessent de fonctionner).
 */
export async function createStudentLinks(
  moduleId: string,
  onlyMissing: boolean,
): Promise<StudentLinksState> {
  const supabase = await createClient();
  const probe = await supabase.from("module_student_link").select("id").limit(1);
  if (probe.error) {
    return {
      error: "Les liens personnels seront disponibles après la mise à jour de la base de données.",
    };
  }
  const students = notebookStudents(await listModuleGroups(moduleId));
  if (students.length === 0) {
    return { error: "Aucun·e étudiant·e dans ce module : crée d’abord les groupes." };
  }

  const { data: active } = await supabase
    .from("module_student_link")
    .select("student_id")
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  const has = new Set((active ?? []).map((l) => l.student_id));
  const targets = onlyMissing ? students.filter((s) => !has.has(s.id)) : students;
  if (targets.length === 0) return { links: [] };

  const revoke = await supabase
    .from("module_student_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .in(
      "student_id",
      targets.map((s) => s.id),
    )
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer les liens") };

  const created = targets.map((s) => ({ student: s, token: generateToken() }));
  const { error } = await supabase.from("module_student_link").insert(
    created.map(({ student, token }) => ({
      module_id: moduleId,
      student_id: student.id,
      token_hash: hashToken(token),
    })),
  );
  if (error) return { error: failure("créer les liens") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return {
    links: created.map(({ student, token }) => ({
      name: `${student.first_name} ${student.last_name}`,
      url: studentSpaceUrl(clientEnv.NEXT_PUBLIC_APP_URL, token),
    })),
  };
}

/** Révoque tous les liens personnels du module. */
export async function revokeStudentLinks(moduleId: string): Promise<StudentLinksState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_student_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (error) return { error: failure("révoquer les liens") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { links: [] };
}
