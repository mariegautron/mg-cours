import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien reçu par e-mail (réinitialisation du mot de passe) : échange le code contre une
 * session, puis envoie vers `next` (un chemin de l'appli seulement). Lien expiré ou déjà utilisé :
 * retour à la demande, avec une phrase qui l'explique.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/login/nouveau");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login/oubli?expired=1", origin));
}
