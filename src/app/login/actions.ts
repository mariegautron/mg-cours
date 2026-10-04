"use server";

import { redirect } from "next/navigation";

import { safeNext, passwordProblem } from "@/lib/auth/redirect";
import { clientEnv } from "@/lib/env";
import { failure } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Renseigne ton e-mail et ton mot de passe." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou mot de passe incorrect." };
  }

  redirect(safeNext(next));
}

export interface ResetRequestState {
  error?: string;
  sent?: boolean;
}

/**
 * « Mot de passe oublié » : le message est le même que l'adresse existe ou non (on ne révèle pas
 * quels comptes existent). Le lien reçu passe par `/auth/callback` puis `/login/nouveau`.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Renseigne une adresse e-mail valide." };
  }
  const supabase = await createClient();
  const base = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/callback?next=/login/nouveau`,
  });
  return { sent: true };
}

export interface NewPasswordState {
  error?: string;
}

/** Nouveau mot de passe, après le lien reçu par e-mail (la session de récupération est ouverte). */
export async function setNewPassword(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const problem = passwordProblem(password, confirm);
  if (problem) return { error: problem };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { error: "Ce lien a expiré. Demande un nouveau lien de réinitialisation." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: failure("changer ton mot de passe") };
  redirect("/dashboard?password=changed");
}
