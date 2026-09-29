const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#039;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

/** Décode les entités courantes en une seule passe (jamais deux fois : `&amp;lt;` → `&lt;`). */
export function decodeEntities(s: string): string {
  return s.replace(/&(?:lt|gt|quot|#0?39|apos|nbsp|amp);/g, (m) => ENTITIES[m] ?? m);
}

/** HTML (Moodle) → Markdown simple : paragraphes, listes, gras, italique, code, blocs de code. */
export function htmlToMarkdown(html: string): string {
  return decodeEntities(
    html
      .replace(
        /<pre[^>]*>\s*(?:<code[^>]*>)?([\s\S]*?)(?:<\/code>)?\s*<\/pre>/gi,
        (_, code: string) => {
          const plain = decodeEntities(code.replace(/<[^>]+>/g, "")).replace(/\n$/, "");
          return `\n\n\`\`\`\n${plain}\n\`\`\`\n\n`;
        },
      )
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\s*(b|strong)\s*>([\s\S]*?)<\/\s*(b|strong)\s*>/gi, "**$2**")
      .replace(/<\s*(i|em)\s*>([\s\S]*?)<\/\s*(i|em)\s*>/gi, "*$2*")
      .replace(/<\s*code\s*>([\s\S]*?)<\/\s*code\s*>/gi, "`$1`")
      .replace(/<(?!\/?pre)[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Markdown simple → HTML (export Moodle) : même sous-ensemble que `htmlToMarkdown`. */
export function markdownToHtml(md: string): string {
  const blocks: string[] = [];
  const withoutFences = md.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code: string) => {
    blocks.push(`<pre>${escapeHtml(code.replace(/\n$/, ""))}</pre>`);
    return `\n\n@@BLOCK${blocks.length - 1}@@\n\n`;
  });
  return withoutFences
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const block = /^@@BLOCK(\d+)@@$/.exec(p);
      if (block) return blocks[Number(block[1])];
      const items = p.split("\n");
      const inline = (t: string) =>
        escapeHtml(t)
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\*([^*]+)\*/g, "<em>$1</em>");
      if (items.every((l) => l.startsWith("- ")))
        return `<ul>${items.map((l) => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`;
      return `<p>${items.map(inline).join("<br />")}</p>`;
    })
    .join("\n");
}
