"use server";

import { attachGroupsToUngroupedAssessments } from "@/lib/assessments/attach-groups";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readGroupForm } from "@/lib/students/schema";
import { enroll } from "@/lib/students/enrollment";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface GroupFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createGroup(
  moduleId: string,
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const parsed = readGroupForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_group")
    .insert({ module_id: moduleId, name: parsed.data.name, type: parsed.data.type })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? "Un groupe porte déjà ce nom dans ce module."
          : failure("enregistrer"),
    };
  }

  if (formData.get("assessmentsChosen") === "1") {
    const chosen = formData.getAll("assessmentIds").map(String);
    if (chosen.length > 0) {
      const { data: own } = await supabase
        .from("assessment")
        .select("id")
        .eq("module_id", moduleId)
        .in("id", chosen);
      const rows = (own ?? []).map((a) => ({
        assessment_id: a.id,
        student_group_id: data.id,
      }));
      if (rows.length > 0) await supabase.from("assessment_group").insert(rows);
    }
  } else {
    await attachGroupsToUngroupedAssessments(supabase, moduleId, [data.id]);
  }
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/groups/${data.id}`);
}

export async function deleteGroup(moduleId: string, groupId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("student_group").delete().eq("id", groupId);
  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}`);
}

export async function addMember(moduleId: string, groupId: string, studentId: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("group_member").insert({ student_group_id: groupId, student_id: studentId });
  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
}

/** US-77 : ajout en masse ; les étudiant·es déjà membres sont ignoré·es. */
export async function addMembers(
  moduleId: string,
  groupId: string,
  studentIds: string[],
): Promise<{ error?: string; added?: number }> {
  "use server";
  const ids = [...new Set(studentIds)].slice(0, 500);
  if (ids.length === 0) return { error: "Sélectionne au moins un·e étudiant·e." };

  const supabase = await createClient();
  // Le groupe doit appartenir au module et à l'utilisatrice connectée (la RLS filtre le reste).
  const { data: group } = await supabase
    .from("student_group")
    .select("id")
    .eq("id", groupId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!group) return { error: NOT_FOUND.group };

  const { error } = await supabase.from("group_member").upsert(
    ids.map((student_id) => ({ student_group_id: groupId, student_id })),
    { onConflict: "student_group_id,student_id", ignoreDuplicates: true },
  );
  if (error) return { error: failure("ajouter les membres") };
  await enroll(supabase, moduleId, ids);

  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
  revalidatePath(`/modules/${moduleId}`);
  return { added: ids.length };
}

export async function removeMember(moduleId: string, groupId: string, studentId: string) {
  "use server";
  const supabase = await createClient();
  await supabase
    .from("group_member")
    .delete()
    .eq("student_group_id", groupId)
    .eq("student_id", studentId);
  revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
}

/**
 * Arrivant·e tardif·ve : crée la fiche et l'ajoute au groupe en une fois (elle rejoint ainsi le
 * module). Inscrite à l'année du module, comme un import.
 */
export async function createAndAddMember(
  moduleId: string,
  /** `null` : inscrit·e au module seulement (liste des inscrit·es), sans groupe. */
  groupId: string | null,
  input: { firstName: string; lastName: string; email: string },
): Promise<{ error?: string; studentId?: string; name?: string }> {
  "use server";
  const firstName = input.firstName.trim().slice(0, 100);
  const lastName = input.lastName.trim().slice(0, 100);
  const email = input.email.trim().toLowerCase().slice(0, 200) || null;
  if (!firstName || !lastName) return { error: "Le prénom et le nom sont obligatoires." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail invalide." };

  const supabase = await createClient();
  const [{ data: group }, { data: mod }] = await Promise.all([
    groupId
      ? supabase
          .from("student_group")
          .select("id")
          .eq("id", groupId)
          .eq("module_id", moduleId)
          .maybeSingle()
      : Promise.resolve({ data: { id: "" } }),
    supabase.from("module").select("year").eq("id", moduleId).maybeSingle(),
  ]);
  if (!group || !mod) return { error: NOT_FOUND.group };

  // Même e-mail déjà en base : on reprend la fiche au lieu de créer un doublon.
  let studentId: string | null = null;
  if (email) {
    const { data: known } = await supabase
      .from("student")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    studentId = known?.id ?? null;
  }
  if (!studentId) {
    const { data: created, error } = await supabase
      .from("student")
      .insert({ first_name: firstName, last_name: lastName, email })
      .select("id")
      .single();
    if (error || !created) return { error: failure("créer la fiche") };
    studentId = created.id;
    await supabase
      .from("student_year")
      .upsert(
        { student_id: studentId, year: mod.year, scholar_group: null },
        { onConflict: "student_id,year", ignoreDuplicates: true },
      );
  }

  if (groupId) {
    const { error } = await supabase
      .from("group_member")
      .upsert(
        { student_group_id: groupId, student_id: studentId },
        { onConflict: "student_group_id,student_id", ignoreDuplicates: true },
      );
    if (error) return { error: failure("ajouter au groupe") };
    revalidatePath(`/modules/${moduleId}/groups/${groupId}`);
  }
  await enroll(supabase, moduleId, [studentId]);

  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/students");
  return { studentId, name: `${firstName} ${lastName}` };
}

/** « A quitté le module » (date du jour) ou annulation : la personne reste, ses notes aussi. */
export async function setLeftModule(
  moduleId: string,
  studentId: string,
  left: boolean,
): Promise<{ error?: string }> {
  "use server";
  const supabase = await createClient();
  const { data: mod } = await supabase.from("module").select("id").eq("id", moduleId).maybeSingle();
  if (!mod) return { error: NOT_FOUND.module };
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const { error } = await supabase
    .from("module_student")
    .upsert(
      { module_id: moduleId, student_id: studentId, left_at: left ? today : null },
      { onConflict: "module_id,student_id" },
    );
  if (error) {
    return {
      error: "« A quitté le module » sera disponible après la mise à jour de la base de données.",
    };
  }
  revalidatePath(`/modules/${moduleId}`, "layout");
  revalidatePath(`/students/${studentId}`);
  return {};
}
