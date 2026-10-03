import { existsSync, readFileSync } from "node:fs";

/**
 * Variables Supabase pour les tests qui interrogent l'API directement : `.env.local` en local ;
 * en CI (pas de `.env.local`), les variables d'environnement du job.
 */
export function localEnv(): Record<string, string> {
  const fromProcess = Object.fromEntries(
    Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  if (!existsSync(".env.local")) return fromProcess;
  const fromFile = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
  // Le fichier local prime sur l'environnement du shell.
  return { ...fromProcess, ...fromFile };
}
