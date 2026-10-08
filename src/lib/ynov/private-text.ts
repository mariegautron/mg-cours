/**
 * Contenu privé des notes de séance : la progression pédagogique est remise à l'école, qui peut la
 * diffuser aux étudiant·es. Rien de ce qui est réservé à l'enseignante ne doit y figurer.
 *
 * Convention (documentée dans l'aide de la page « Progression pédagogique ») :
 * - un bloc `[privé]` … `[/privé]` n'est jamais publié ; `[privé]` en début de ligne retire la ligne ;
 * - les lignes qui parlent de corrigé, de résultat attendu ou de « à faire verbaliser » sont
 *   retirées d'office (avec leurs sous-lignes de liste) : ce sont des éléments de correction.
 */

const BLOCK = /\[priv[ée]\][\s\S]*?\[\/priv[ée]\]/gi;
const LINE_MARKER = /^\s*(?:[-*+]\s+|\d+[.)]\s+)?\[priv[ée]\]/i;
/** Lignes retirées d'office. */
const PRIVATE_LINE =
  /corrig[ée]s?\b|r[ée]sultats?\s+attendus?|r[ée]ponses?\s+attendues?|à\s+faire\s+verbaliser|à\s+verbaliser/i;
/** Termes suspects qu'on ne retire pas mais qu'on signale (le sens dépend du contexte). */
const SUSPECT = /\b(solutions?|bar[èe]mes?|à\s+ne\s+pas\s+(?:montrer|projeter|donner|diffuser))\b/i;

const indentOf = (line: string) => line.length - line.trimStart().length;

/** Texte publiable d'une note, et le nombre de lignes retirées. */
export function publishableText(raw: string | null | undefined): { text: string; removed: number } {
  if (!raw) return { text: "", removed: 0 };
  const withoutBlocks = raw.replace(BLOCK, "");
  const blocksRemoved = withoutBlocks === raw ? 0 : 1;
  const lines = withoutBlocks.split("\n");
  const kept: string[] = [];
  let removed = blocksRemoved;
  let dropIndent: number | null = null;
  for (const line of lines) {
    if (dropIndent !== null) {
      if (line.trim() !== "" && indentOf(line) > dropIndent) {
        removed++;
        continue;
      }
      dropIndent = null;
    }
    if (LINE_MARKER.test(line) || PRIVATE_LINE.test(line)) {
      removed++;
      dropIndent = indentOf(line);
      continue;
    }
    kept.push(line);
  }
  const text = kept
    .join("\n")
    .replace(/\[\/?priv[ée]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, removed };
}

/** Lignes de ce texte (déjà publiable) qui contiennent un terme suspect. */
export function suspectLines(published: string | null | undefined): string[] {
  return (published ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && (SUSPECT.test(l) || PRIVATE_LINE.test(l)));
}
