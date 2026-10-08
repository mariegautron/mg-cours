"use server";

import { revalidatePath } from "next/cache";

import { clientEnv } from "@/lib/env";
import { moduleShareUrl } from "@/lib/modules/frise";
import { DEFAULT_ESPACE_OPTIONS, type EspaceOptions } from "@/lib/modules/espace";
import { loadEspace } from "@/lib/modules/espace-queries";
import { loadFrise } from "@/lib/modules/frise-queries";
import { failure, NOT_FOUND } from "@/lib/messages";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";

export interface ShareState {
  error?: string;
  /** Lien créé : le jeton n'est jamais relisible ensuite (seul le haché est gardé). */
  url?: string;
  revoked?: boolean;
  updated?: boolean;
}

const UNAVAILABLE =
  "Le lien partageable sera disponible après la mise à jour de la base de données. La frise reste projetable.";

/** Crée (ou remplace) le lien de la frise : l'ancien lien est révoqué, l'instantané est celui d'aujourd'hui. */
async function snapshot(moduleId: string, options: EspaceOptions) {
  const frise = await loadFrise(moduleId);
  if (!frise) return null;
  const espace = await loadEspace(moduleId, options);
  return { ...frise, espace } as never;
}

/** Met à jour l'instantané du lien actif (même adresse) avec les données d'aujourd'hui. */
export async function updateModuleLink(
  moduleId: string,
  options: EspaceOptions = DEFAULT_ESPACE_OPTIONS,
): Promise<ShareState> {
  const supabase = await createClient();
  const payload = await snapshot(moduleId, options);
  if (!payload) return { error: NOT_FOUND.module };
  const { data, error } = await supabase
    .from("module_share_link")
    .update({ payload, published_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null)
    .select("id");
  if (error) return { error: failure("mettre à jour le lien") };
  if (!data?.length) return { error: "Aucun lien actif : crée-le d’abord." };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { updated: true };
}

export async function publishModuleLink(
  moduleId: string,
  options: EspaceOptions = DEFAULT_ESPACE_OPTIONS,
): Promise<ShareState> {
  const supabase = await createClient();
  const probe = await supabase.from("module_share_link").select("id").limit(1);
  if (probe.error) return { error: UNAVAILABLE };
  const payload = await snapshot(moduleId, options);
  if (!payload) return { error: NOT_FOUND.module };

  const revoke = await supabase
    .from("module_share_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (revoke.error) return { error: failure("créer le lien") };

  const token = generateToken();
  const { error } = await supabase.from("module_share_link").insert({
    module_id: moduleId,
    token_hash: hashToken(token),
    payload,
  });
  if (error) return { error: failure("créer le lien") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { url: moduleShareUrl(clientEnv.NEXT_PUBLIC_APP_URL, token) };
}

/** Révoque le lien : il n'affichera plus rien. */
export async function revokeModuleLink(moduleId: string): Promise<ShareState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("module_share_link")
    .update({ revoked_at: new Date().toISOString() })
    .eq("module_id", moduleId)
    .is("revoked_at", null);
  if (error) return { error: failure("révoquer le lien") };
  revalidatePath(`/modules/${moduleId}/frise`);
  return { revoked: true };
}
