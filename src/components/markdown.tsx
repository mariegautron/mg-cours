import { parseMarkdown, type InlineRun } from "@/lib/pdf/markdown";

// Pas de `javascript:` ni `data:` dans les liens rendus.
const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6";

function Runs({ runs }: { runs: InlineRun[] }) {
  return runs.map((r, i) =>
    r.code ? (
      <code key={i} className="bg-muted rounded px-1 font-mono text-[0.9em]">
        {r.text}
      </code>
    ) : r.bold ? (
      <strong key={i}>{r.text}</strong>
    ) : r.italic ? (
      <em key={i}>{r.text}</em>
    ) : r.href && SAFE_HREF.test(r.href) ? (
      <a
        key={i}
        href={r.href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {r.text}
      </a>
    ) : (
      r.text
    ),
  );
}

/**
 * Rendu Markdown léger (même parseur que les PDF). `headingLevel` = niveau HTML d'un « # »,
 * pour s'insérer sous le titre de section de la page sans casser la hiérarchie.
 */
export function Markdown({
  source,
  headingLevel = 3,
  resolveImageSrc,
}: {
  source: string;
  headingLevel?: 2 | 3 | 4;
  /** Transforme le `src` d'une image (ex. chemin Storage → URL signée). */
  resolveImageSrc?: (src: string) => string;
}) {
  return (
    <div className="space-y-3 leading-relaxed">
      {parseMarkdown(source).map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = `h${Math.min(headingLevel + block.level - 1, 6)}` as HeadingTag;
            return (
              <Tag
                key={i}
                className={block.level === 1 ? "text-base font-semibold" : "font-medium"}
              >
                <Runs runs={block.runs} />
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i}>
                <Runs runs={block.runs} />
              </p>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={i}
                className={`space-y-1 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Runs runs={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "code":
            return (
              <pre key={i} className="bg-muted overflow-x-auto rounded-md p-3 text-sm">
                <code>{block.text}</code>
              </pre>
            );
          case "image":
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={resolveImageSrc ? resolveImageSrc(block.src) : block.src}
                alt={block.alt}
                loading="lazy"
                className="max-w-full rounded-md"
              />
            );
          case "quote":
            return (
              <blockquote key={i} className="text-muted-foreground border-l-2 pl-3">
                <Runs runs={block.runs} />
              </blockquote>
            );
        }
      })}
    </div>
  );
}
