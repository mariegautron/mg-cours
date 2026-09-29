// Compléments des 3 cours importés (voir complements-fonctions.mts) : `--course complements`.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { runComplements } from "./complements-fonctions.mts";
import { PREDEFINED_COMMENTS } from "./gp-2526.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

export async function migrate(ctx: CourseContext): Promise<void> {
  await runComplements(ctx, {
    predefinedComments: PREDEFINED_COMMENTS,
    // Horaires M2 : ceux de Notion totalisent 29 h (28 h facturées) → en attente de la PO.
    m2Days: [],
  });
}
