// Compléments des 3 cours importés (voir complements-fonctions.mts) : `--course complements`.
import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { runComplements } from "./complements-fonctions.mts";
import { PREDEFINED_COMMENTS } from "./gp-2526.mts";
import { DAY_ACTIVITIES, DAYS } from "./m2-accessibilite-2425.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

export async function migrate(ctx: CourseContext): Promise<void> {
  await runComplements(ctx, {
    predefinedComments: PREDEFINED_COMMENTS,
    m2Days: DAYS.map((d, i) => ({ id: d.id, activities: DAY_ACTIVITIES[i + 1] })),
  });
}
