/**
 * Mise en forme Markdown d'une zone de texte (barre Gras, Italique, Titre, Liste, Citation, Lien).
 * Fonctions pures : elles reçoivent le texte et la sélection, et rendent le nouveau texte avec la
 * sélection à replacer.
 */
export type MarkdownFormat = "bold" | "italic" | "heading" | "list" | "quote" | "link";

export interface FormatResult {
  value: string;
  start: number;
  end: number;
}

function wrap(
  value: string,
  start: number,
  end: number,
  mark: string,
  placeholder: string,
): FormatResult {
  const selected = value.slice(start, end);
  const text = selected || placeholder;
  const before = value.slice(0, start);
  const after = value.slice(end);
  // Déjà entouré : on retire la mise en forme.
  if (selected && before.endsWith(mark) && after.startsWith(mark)) {
    return {
      value: before.slice(0, -mark.length) + selected + after.slice(mark.length),
      start: start - mark.length,
      end: end - mark.length,
    };
  }
  const next = `${before}${mark}${text}${mark}${after}`;
  return { value: next, start: start + mark.length, end: start + mark.length + text.length };
}

/** Préfixe chaque ligne touchée par la sélection (titre, liste, citation) ; un second appui le retire. */
function prefixLines(value: string, start: number, end: number, prefix: string): FormatResult {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const toIndex = value.indexOf("\n", end);
  const to = toIndex === -1 ? value.length : toIndex;
  const lines = value.slice(from, to).split("\n");
  const all = lines.every((l) => l.startsWith(prefix));
  const changed = lines
    .map((l) => (all ? l.slice(prefix.length) : l.startsWith(prefix) ? l : `${prefix}${l}`))
    .join("\n");
  const delta = changed.length - (to - from);
  return { value: value.slice(0, from) + changed + value.slice(to), start: from, end: to + delta };
}

export function applyFormat(
  value: string,
  start: number,
  end: number,
  format: MarkdownFormat,
): FormatResult {
  switch (format) {
    case "bold":
      return wrap(value, start, end, "**", "texte en gras");
    case "italic":
      return wrap(value, start, end, "*", "texte en italique");
    case "heading":
      return prefixLines(value, start, end, "### ");
    case "list":
      return prefixLines(value, start, end, "- ");
    case "quote":
      return prefixLines(value, start, end, "> ");
    case "link": {
      const selected = value.slice(start, end) || "texte du lien";
      const url = "https://";
      const next = `${value.slice(0, start)}[${selected}](${url})${value.slice(end)}`;
      const urlStart = start + selected.length + 3;
      return { value: next, start: urlStart, end: urlStart + url.length };
    }
  }
}
