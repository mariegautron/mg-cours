// Compléments 2 des 3 cours importés : projet en jalons, thèmes, sujets liés aux séances.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { runProjectComplements } from "./complements-projets.mts";
import { DAYS } from "./m2-accessibilite-2425.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const B2_PROGRESSION = "2df903c74f13805c8a20f402589c8c9a";

export async function migrate(ctx: CourseContext): Promise<void> {
  await runProjectComplements({
    imp: ctx.imp,
    page: ctx.page,
    m2Days: DAYS.map((d) => d.id),
    b2Session: (n) => `${B2_PROGRESSION}#seance-${n}`,
  });
}
