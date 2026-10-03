// Migration Notion / Moodle → MG COURS, cours par cours (voir docs/MIGRATION-NOTION.md).
//
// Simulation (par défaut, n'écrit rien) :
//   node scripts/notion-migrate/index.mts --course b2-accessibilite-2526 \
//     --env .env.vercel.local --notion ~/Bureau/exports/notion \
//     --moodle ~/Bureau/exports/moodle/b2-accessibilite-2526.mbz \
//     --participants <participants.csv> --outline-pdf <trame.pdf> --invoice-pdf <facture.pdf> \
//     --grades <export Notes Moodle .ods>
// Écriture : même commande + --apply (uniquement après validation du rapport).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

import { createClient } from "@supabase/supabase-js";

import * as b2 from "./courses/b2-accessibilite-2526.mts";
import * as complements from "./courses/complements.mts";
import * as complements2 from "./courses/complements-2.mts";
import * as complements3 from "./courses/complements-3.mts";
import * as complements4 from "./courses/complements-4.mts";
import * as complements5 from "./courses/complements-5.mts";
import * as complements6 from "./courses/complements-6.mts";
import * as complements7 from "./courses/complements-7.mts";
import * as gp from "./courses/gp-2526.mts";
import * as m2 from "./courses/m2-accessibilite-2425.mts";
import { Importer } from "./lib/importer.mts";
import { readMoodleBackup, type MoodleCourse } from "./lib/moodle.mts";
import { databaseCsv, indexExport, readPage, type NotionPage } from "./lib/notion.mts";

/** Contexte commun : chaque cours n'en lit que la partie qui le concerne. */
interface MigrationContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  csv: (databaseId: string) => string;
  has: (id: string) => boolean;
  moodle: MoodleCourse | null;
  participantsCsv: string | null;
  outlinePdf: string | null;
  invoicePdf: string | null;
  gradesFile: string | null;
}

const COURSES: Record<string, { migrate: (ctx: MigrationContext) => Promise<void> }> = {
  "b2-accessibilite-2526": b2,
  "gp-2526": gp,
  "m2-accessibilite-2425": m2,
  complements,
  "complements-2": complements2,
  "complements-3": complements3,
  "complements-4": complements4,
  "complements-5": complements5,
  "complements-6": complements6,
  "complements-7": complements7,
};

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
  for (const k of ["env", "notion"]) if (typeof a[k] !== "string") throw new Error(`--${k} requis`);

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
    csv: (id) => databaseCsv(index, id),
    has: (id) => index.has(id),
    moodle: typeof a.moodle === "string" ? readMoodleBackup(a.moodle) : null,
    participantsCsv: typeof a.participants === "string" ? a.participants : null,
    outlinePdf: typeof a["outline-pdf"] === "string" ? a["outline-pdf"] : null,
    invoicePdf: typeof a["invoice-pdf"] === "string" ? a["invoice-pdf"] : null,
    gradesFile: typeof a.grades === "string" ? a.grades : null,
  });
  imp.printReport();
}

main().catch((e: unknown) => {
  console.error(`\n❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
