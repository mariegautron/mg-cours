import { readFileSync } from "node:fs";

/** Variables de `.env.local` (Supabase local) pour les tests qui interrogent l'API directement. */
export function localEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}
