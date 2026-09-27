/**
 * Mini-parseur Markdown → blocs, partagé par le rendu web (`src/components/markdown.tsx`) et les
 * PDF (`src/lib/pdf/markdown-view.tsx`). Couvre ce qu'on écrit dans les ressources, les sujets
 * d'évaluation et ce qui vient d'un export Notion : titres, listes (imbriquées, cases à cocher),
 * tableaux, citations, code, séparateurs, encadrés `<aside>`, gras/italique/code/liens/images.
 * Le reste (HTML non reconnu) est affiché tel quel comme du texte, jamais interprété.
 */

export type InlineRun =
  | { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string }
  | { break: true };

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ListItem {
  runs: InlineRun[];
  /** `null` = puce normale, `true`/`false` = case à cocher « fait »/« à faire ». */
  checked: boolean | null;
  /** Sous-liste(s) imbriquée(s) sous ce point, dans l'ordre. */
  children: ListBlock[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}

export type TableAlign = "left" | "center" | "right" | null;

export type Block =
  | { type: "heading"; level: HeadingLevel; runs: InlineRun[] }
  | { type: "paragraph"; runs: InlineRun[] }
  | ListBlock
  | { type: "code"; text: string }
  | { type: "quote"; runs: InlineRun[] }
  | { type: "image"; alt: string; src: string }
  | { type: "hr" }
  | { type: "table"; align: TableAlign[]; header: InlineRun[][]; rows: InlineRun[][][] }
  | { type: "callout"; blocks: Block[] };

const INLINE =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|<br\s*\/?>)/i;

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

export function parseInline(input: string): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const part of input.split(INLINE)) {
    if (!part) continue;
    if (/^<br\s*\/?>$/i.test(part)) {
      runs.push({ break: true });
    } else if (/^(\*\*|__)[^]+(\*\*|__)$/.test(part) && part.length > 4) {
      runs.push({ text: part.slice(2, -2), bold: true });
    } else if (/^[*_][^]+[*_]$/.test(part) && part.length > 2) {
      runs.push({ text: part.slice(1, -1), italic: true });
    } else if (/^`[^`]+`$/.test(part)) {
      runs.push({ text: part.slice(1, -1), code: true });
    } else if (/^!\[[^\]]*\]\([^)]+\)$/.test(part)) {
      // Image au milieu d'un texte : on garde son texte alternatif.
      const alt = part.slice(2, part.indexOf("]"));
      if (alt) runs.push({ text: alt });
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      runs.push(link ? { text: link[1], href: link[2] } : { text: part });
    }
  }
  return runs;
}

/** Découpe une ligne de tableau en cellules brutes (`\|` échappé conservé comme `|` littéral). */
function splitTableRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function parseTableAlign(delimiterRow: string): TableAlign[] {
  return splitTableRow(delimiterRow).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return null;
  });
}

/** Normalise l'indentation (tabulations → 4 espaces) pour détecter le niveau d'une liste imbriquée. */
function indentWidth(spaces: string): number {
  return spaces.replace(/\t/g, "    ").length;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  // Pile d'imbrication de listes en cours : plus l'indentation est grande, plus on est profond.
  let listStack: { indent: number; list: ListBlock }[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", runs: parseInline(para.join(" ")) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\t/g, "    ");

    if (/^```/.test(line)) {
      flushPara();
      listStack = [];
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (/^<aside>\s*$/i.test(line.trim())) {
      flushPara();
      listStack = [];
      const inner: string[] = [];
      i++;
      while (i < lines.length && !/^<\/aside>\s*$/i.test(lines[i].trim())) inner.push(lines[i++]);
      blocks.push({ type: "callout", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      listStack = [];
      const level = heading[1].length as HeadingLevel;
      blocks.push({ type: "heading", level, runs: parseInline(heading[2]) });
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushPara();
      listStack = [];
      blocks.push({ type: "hr" });
      continue;
    }

    // Tableau GFM : ligne d'en-tête suivie d'une ligne de délimitation (`| --- | :---: |`).
    if (line.includes("|") && i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1])) {
      flushPara();
      listStack = [];
      const align = parseTableAlign(lines[i + 1]);
      const header = splitTableRow(line).map(parseInline);
      const rows: InlineRun[][][] = [];
      i++; // ligne de délimitation
      while (i + 1 < lines.length && lines[i + 1].includes("|") && lines[i + 1].trim() !== "") {
        i++;
        rows.push(splitTableRow(lines[i]).map(parseInline));
      }
      blocks.push({ type: "table", align, header, rows });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      flushPara();
      const indent = indentWidth(item[1]);
      const ordered = /\d/.test(item[2]);
      const checked = item[3] ? item[3].toLowerCase() === "x" : null;
      const newItem: ListItem = { runs: parseInline(item[4]), checked, children: [] };

      while (listStack.length && indent < listStack[listStack.length - 1].indent) {
        listStack.pop();
      }
      const top = listStack[listStack.length - 1];

      if (!top) {
        const last = blocks[blocks.length - 1];
        if (last?.type === "list" && last.ordered === ordered) {
          last.items.push(newItem);
          listStack.push({ indent, list: last });
        } else {
          const list: ListBlock = { type: "list", ordered, items: [newItem] };
          blocks.push(list);
          listStack.push({ indent, list });
        }
      } else if (indent === top.indent && top.list.ordered === ordered) {
        top.list.items.push(newItem);
      } else {
        // Indentation plus profonde (ou même niveau mais type de liste différent) : nouvelle
        // sous-liste sous le dernier point du niveau parent.
        const parentItems =
          indent === top.indent ? listStack[listStack.length - 2]?.list.items : top.list.items;
        const parentItem = parentItems?.[parentItems.length - 1];
        if (indent === top.indent) listStack.pop();
        const list: ListBlock = { type: "list", ordered, items: [newItem] };
        if (parentItem) parentItem.children.push(list);
        else blocks.push(list); // pas de parent trouvé : on ne perd pas le contenu
        listStack.push({ indent, list });
      }
      continue;
    }

    const image = IMAGE_LINE.exec(line.trim());
    if (image) {
      flushPara();
      listStack = [];
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushPara();
      listStack = [];
      blocks.push({ type: "quote", runs: parseInline(quote[1]) });
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      continue;
    }
    listStack = [];
    para.push(line.trim());
  }
  flushPara();
  return blocks;
}
