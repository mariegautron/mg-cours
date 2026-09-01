import { z } from "zod";

/**
 * Variables d'environnement.
 * Les valeurs serveur ne doivent jamais être importées depuis un Client Component.
 *
 * La validation est volontairement tolérante pour que `next build` fonctionne en
 * CI sans secrets. `isSupabaseConfigured` permet aux gardes runtime de dégrader
 * proprement si la config manque.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const isSupabaseConfigured =
  clientEnv.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

/** À appeler uniquement depuis du code serveur (route handlers, server actions, RSC). */
export function serverEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
  });
}
