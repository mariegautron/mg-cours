// Compléments 10 : dépôt des contrats dans l'administratif des modules (type « Convention de
// formation », migration 20261104 : plusieurs fichiers par module, libellé libre, date de signature).
//  · M2 2024-25 : convention de formation (19/05/2025, signée le 25/05/2025) et avenant n° 1
//    (signé le 15/07/2025, fin d'intervention au 08/07/2025) ;
//  · GP et B2 2025-26 : contrat de prestation commun (07/11/2025) : un seul fichier de stockage,
//    deux lignes (une par module).
// L'édition archivée « Accessibilité » n'a pas de module : rien à déposer.
// Simulation par défaut ; à n'écrire qu'après application de la migration 20261104 ET accord de la PO.
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { safeName } from "../../../src/lib/storage/files.ts";
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const DOWNLOADS = join(homedir(), "Téléchargements");
/** Exemplaire terminé le 25/05/2025 (le « -1 » est une copie retéléchargée plus tard). */
const M2_CONVENTION = join(DOWNLOADS, "Complétez_avec_Docusign _CONVENTION_FORMATIO.pdf");
const M2_AVENANT = join(DOWNLOADS, "Complétez_avec_Docusign _Avenant_1_de_modifi.pdf");
const CONTRACT_2526 = join(DOWNLOADS, "convention_prestation.pdf");

interface Deposit {
  /** Clé stable d'idempotence. */
  key: string;
  file: string;
  name: string;
  label: string;
  signedOn: string;
}

async function module_(imp: Importer, match: (m: Record<string, unknown>) => boolean) {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  for (const ref of refs) {
    const [m] = await select(imp, "module", "id, name, year, ycode", { id: ref.target_id });
    if (m && match(m)) return m;
  }
  return null;
}

async function deposit(
  imp: Importer,
  mod: Record<string, unknown>,
  d: Deposit,
  storagePath: string,
  alreadyUploaded: boolean,
) {
  const size = statSync(d.file).size;
  if (!alreadyUploaded)
    await imp.upload("module-documents", storagePath, readFileSync(d.file), "application/pdf");
  await imp.ensure(
    "module_document",
    "notion",
    `${d.key}#${String(mod.id)}`,
    {
      module_id: mod.id,
      kind: "training_agreement",
      name: d.name,
      path: storagePath,
      size_bytes: size,
      mime: "application/pdf",
      label: d.label,
      signed_on: d.signedOn,
    },
    `${String(mod.name)} (${String(mod.year)}) › ${d.label} — ${d.name} (${Math.round(size / 1024)} Ko, signé le ${d.signedOn})`,
  );
}

export async function migrate({ imp }: CourseContext): Promise<void> {
  const missing = [M2_CONVENTION, M2_AVENANT, CONTRACT_2526].filter((f) => !existsSync(f));
  if (missing.length) {
    imp.warnings.push(`Fichier(s) introuvable(s) : ${missing.join(" ; ")}`);
    return;
  }

  // M2 : convention + avenant
  const m2 = await module_(
    imp,
    (m) => /^Accessibilité & Qualité Web/.test(String(m.name)) && Number(m.year) === 2024,
  );
  if (m2) {
    const folder = `${imp.ownerId}/${String(m2.id)}`;
    for (const d of [
      {
        key: "contrat:m2-convention-2025",
        file: M2_CONVENTION,
        name: "Convention de formation — Accessibilité et Qualité Web (M2).pdf",
        label: "Convention de formation",
        signedOn: "2025-05-25",
      },
      {
        key: "contrat:m2-avenant-1-2025",
        file: M2_AVENANT,
        name: "Avenant n° 1 — Accessibilité et Qualité Web (M2).pdf",
        label: "Avenant n° 1 (fin au 08/07/2025)",
        signedOn: "2025-07-15",
      },
    ])
      await deposit(imp, m2, d, `${folder}/${safeName(d.name)}`, false);
  } else imp.warnings.push("Module M2 Accessibilité (2024) introuvable.");

  // 2025-26 : un contrat, deux modules, un seul fichier de stockage
  const gp = await module_(imp, (m) => m.ycode === "A2526_0172");
  const b2 = await module_(imp, (m) => m.ycode === "A2526_0121");
  const contract: Deposit = {
    key: "contrat:prestation-2025-26",
    file: CONTRACT_2526,
    name: "Convention de prestation de services — Gestion de projet IT et Accessibilité (2025-26).pdf",
    label: "Convention de prestation (48 h : GP 28 h + B2 20 h)",
    signedOn: "2025-11-07",
  };
  if (gp && b2) {
    const sharedPath = `${imp.ownerId}/${String(gp.id)}/${safeName(contract.name)}`;
    await deposit(imp, gp, contract, sharedPath, false);
    await deposit(imp, b2, contract, sharedPath, true);
  } else imp.warnings.push("Module GP ou B2 introuvable : contrat 2025-26 non déposé.");

  imp.warnings.push(
    "Édition archivée « Accessibilité » : pas de module, contrat de prestation (16/12/2024) non déposé.",
    "Migration 20261104 (valeur d'énumération training_agreement, colonnes label et signed_on) requise avant l'écriture.",
  );
}
