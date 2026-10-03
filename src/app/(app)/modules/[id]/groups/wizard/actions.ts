"use server";

import { revalidatePath } from "next/cache";

import { drawGroupThemes } from "@/app/(app)/modules/[id]/project/actions";
import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface WizardInput {
  type: "tp" | "td" | "project";
  groups: { name: string; studentIds: string[] }[];
  /** Tirer au sort les thèmes du projet fil rouge pour ces groupes (type « project »). */
  assignThemes: boolean;
}

export interface WizardState {
  error?: string;
  created?: number;
  themesMessage?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GROUPS = 100;

/** Crée les groupes constitués par l'assistant (US-132), leurs membres et, au choix, les thèmes. */
export async function createGroupsFromWizard(
  moduleId: string,
  input: WizardInput,
): Promise<WizardState> {
  const groups = input.groups.map((g) => ({
    name: g.name.trim().slice(0, 100),
    studentIds: [...new Set(g.studentIds.filter((s) => UUID.test(s)))],
  }));
  if (groups.length === 0 || groups.length > MAX_GROUPS) {
    return { error: "Il faut entre 1 et 100 groupes." };
  }
  if (groups.some((g) => !g.name)) return { error: "Chaque groupe doit avoir un nom." };
  if (groups.some((g) => g.studentIds.length === 0)) return { error: "Un groupe est vide." };
  const names = groups.map((g) => g.name.toLowerCase());
  if (new Set(names).size !== names.length) return { error: "Deux groupes portent le même nom." };
  const everyone = groups.flatMap((g) => g.studentIds);
  if (new Set(everyone).size !== everyone.length) {
    return { error: "Une personne est dans deux groupes." };
  }
  if (!["tp", "td", "project"].includes(input.type)) return { error: "Type de groupe inconnu." };

  const supabase = await createClient();
  const { data: mod } = await supabase.from("module").select("id").eq("id", moduleId).maybeSingle();
  if (!mod) return { error: NOT_FOUND.module };

  const { data: created, error } = await supabase
    .from("student_group")
    .insert(groups.map((g) => ({ module_id: moduleId, name: g.name, type: input.type })))
    .select("id, name");
  if (error || !created) {
    return {
      error:
        error?.code === "23505"
          ? "Un groupe du module porte déjà un de ces noms."
          : failure("créer les groupes"),
    };
  }
  const idByName = new Map(created.map((c) => [c.name.toLowerCase(), c.id]));
  const { error: memberError } = await supabase.from("group_member").insert(
    groups.flatMap((g) =>
      g.studentIds.map((student_id) => ({
        student_group_id: idByName.get(g.name.toLowerCase())!,
        student_id,
      })),
    ),
  );
  if (memberError) {
    await supabase
      .from("student_group")
      .delete()
      .in(
        "id",
        created.map((c) => c.id),
      );
    return { error: failure("ajouter les membres") };
  }

  let themesMessage: string | undefined;
  if (input.assignThemes && input.type === "project") {
    const res = await drawGroupThemes(moduleId, false);
    themesMessage = res.error ?? res.message;
  }
  revalidatePath(`/modules/${moduleId}`);
  return { created: created.length, themesMessage };
}
