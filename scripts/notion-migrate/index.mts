// Migration Notion / Moodle → MG COURS, cours par cours (voir docs/MIGRATION-NOTION.md).
//
// Simulation (par défaut, n'écrit rien) :
//   node scripts/notion-migrate/index.mts --course b2-accessibilite-2526 \
//     --env .env.vercel.local --notion ~/Bureau/exports/notion \
//     --moodle ~/Bureau/exports/moodle/b2-accessibilite-2526.mbz \
//     --participants <participants.csv> --outline-pdf <trame.pdf> --invoice-pdf <facture.pdf>
// Écriture : même commande + --apply (uniquement après validation du rapport).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

import { createClient } from "@supabase/supabase-js";

import * as b2 from "./courses/b2-accessibilite-2526.mts";
import { Importer } from "./lib/importer.mts";
import { readMoodleBackup } from "./lib/moodle.mts";
import { indexExport, readPage } from "./lib/notion.mts";

const COURSES: Record<string, typeof b2> = { "b2-accessibilite-2526": b2 };

function args(): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next.replace(/^~(?=\/)/, homedir());
      i++;
    } else out[key] = true;
  }
  return out;
}

function loadEnv(path: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l))
      .filter((m) => m !== null)
      .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
  );
}

async function main() {
  const a = args();
  const course = COURSES[String(a.course)];
  if (!course) throw new Error(`--course requis parmi : ${Object.keys(COURSES).join(", ")}`);
  for (const k of ["env", "notion", "moodle"])
    if (typeof a[k] !== "string") throw new Error(`--${k} requis`);

  const env = loadEnv(a.env as string);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents du fichier d'env",
    );
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: users, error } = await sb.auth.admin.listUsers();
  if (error) throw new Error(`Utilisateurs : ${error.message}`);
  const owners =
    typeof a["owner-email"] === "string"
      ? users.users.filter((u) => u.email === a["owner-email"])
      : users.users;
  if (owners.length !== 1)
    throw new Error(`Compte propriétaire ambigu (${owners.length}) : préciser --owner-email`);

  const apply = a.apply === true;
  console.log(
    `Base : ${new URL(url).host} · propriétaire : ${owners[0].email} · mode : ${apply ? "ÉCRITURE" : "simulation"}`,
  );

  const index = indexExport([a.notion as string]);
  const imp = new Importer(sb, owners[0].id, apply);
  await course.migrate({
    imp,
    page: (id) => readPage(index, id),
    moodle: readMoodleBackup(a.moodle as string),
    participantsCsv: typeof a.participants === "string" ? a.participants : null,
    outlinePdf: typeof a["outline-pdf"] === "string" ? a["outline-pdf"] : null,
    invoicePdf: typeof a["invoice-pdf"] === "string" ? a["invoice-pdf"] : null,
  });
  imp.printReport();
}

main().catch((e: unknown) => {
  console.error(`\n❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
