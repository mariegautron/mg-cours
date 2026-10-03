"use server";

import { revalidatePath } from "next/cache";

import { clientEnv } from "@/lib/env";
import { moduleShareUrl } from "@/lib/modules/frise";
import { loadFrise } from "@/lib/modules/frise-queries";
import { failure, NOT_FOUND } from "@/lib/messages";
import { generateToken, hashToken } from "@/lib/quiz/token";
import { createClient } from "@/lib/supabase/server";

export interface ShareState {
  error?: string;
  /** Lien créé : le jeton n'est jamais relisible ensuite (seul le haché est gardé). */
  url?: string;
  revoked?: boolean;
}

const UNAVAILABLE =
  "Le lien partageable sera disponible après la mise à jour de la base de données. La frise reste projetable.";

/** Crée (ou remplace) le lien de la frise : l'ancien lien est révoqué, l'instantané est celui d'aujourd'hui. */
export async function publishModuleLink(moduleId: string): Promise<ShareState> {
  const supabase = await createClient();
  const probe = await supabase.from("module_share_link").select("id").limit(1);
  if (probe.error) return { error: UNAVAILABLE };
  const frise = await loadFrise(moduleId);
  if (!frise) return { error: NOT_FOUND.module };

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
    payload: frise as never,
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
