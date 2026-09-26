/**
 * Mini-parseur Markdown → blocs pour le PDF des cours.
 * Couvre ce qu'on écrit dans les ressources : titres, listes, code, gras/italique, liens.
 * Le reste est rendu comme du texte simple (jamais de perte de contenu).
 */

export type InlineRun = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { type: "paragraph"; runs: InlineRun[] }
  | { type: "list"; ordered: boolean; items: InlineRun[][] }
  | { type: "code"; text: string }
  | { type: "quote"; runs: InlineRun[] };

const INLINE =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|\[[^\]]+\]\([^)]+\))/;

export function parseInline(input: string): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const part of input.split(INLINE)) {
    if (!part) continue;
    if (/^(\*\*|__)[^]+(\*\*|__)$/.test(part) && part.length > 4) {
      runs.push({ text: part.slice(2, -2), bold: true });
    } else if (/^[*_][^]+[*_]$/.test(part) && part.length > 2) {
      runs.push({ text: part.slice(1, -1), italic: true });
    } else if (/^`[^`]+`$/.test(part)) {
      runs.push({ text: part.slice(1, -1), code: true });
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      runs.push({ text: link ? `${link[1]} (${link[2]})` : part });
    }
  }
  return runs;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", runs: parseInline(para.join(" ")) });
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushPara();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, runs: parseInline(heading[2]) });
      continue;
    }

    const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flushPara();
      const ordered = /\d/.test(item[1]);
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === ordered) {
        last.items.push(parseInline(item[2]));
      } else {
        blocks.push({ type: "list", ordered, items: [parseInline(item[2])] });
      }
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushPara();
      blocks.push({ type: "quote", runs: parseInline(quote[1]) });
      continue;
    }

    if (line.trim() === "") flushPara();
    else para.push(line.trim());
  }
  flushPara();
  return blocks;
}
