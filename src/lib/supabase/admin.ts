import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Client à droits complets (clé service role) : SERVEUR UNIQUEMENT (Server Actions, Route Handlers).
 * Usage strictement limité : compteur d'essais par IP, et correction d'une copie déjà rendue avec un
 * jeton valide. Ne jamais l'importer depuis un Client Component ni le passer au navigateur.
 */
export function createAdminClient() {
  const key = serverEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est absent : impossible de corriger les QCM.");
  return createClient<Database>(clientEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client anonyme SANS cookies : ne porte jamais la session de Marie, même connectée dans le même navigateur. */
export function createAnonClient() {
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
