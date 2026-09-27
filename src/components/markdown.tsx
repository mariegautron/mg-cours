import { parseMarkdown, type Block, type InlineRun, type ListBlock } from "@/lib/pdf/markdown";

// Pas de `javascript:` ni `data:` dans les liens rendus.
const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function Runs({ runs }: { runs: InlineRun[] }) {
  return runs.map((r, i) => {
    if ("break" in r) return <br key={i} />;
    return r.code ? (
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
    );
  });
}

function ListView({ block, headingLevel }: { block: ListBlock; headingLevel: 2 | 3 | 4 }) {
  const List = block.ordered ? "ol" : "ul";
  return (
    <List className={`space-y-1 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
      {block.items.map((item, j) => (
        <li key={j} className={item.checked !== null ? "list-none" : undefined}>
          {item.checked !== null ? (
            <span>
              <span aria-hidden>{item.checked ? "☑" : "☐"}</span>
              <span className="sr-only">{item.checked ? "fait : " : "à faire : "}</span>{" "}
            </span>
          ) : null}
          <Runs runs={item.runs} />
          {item.children.length ? (
            <div className="mt-1">
              {item.children.map((child, k) => (
                <ListView key={k} block={child} headingLevel={headingLevel} />
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </List>
  );
}

function BlockView({
  block,
  headingLevel,
  resolveImageSrc,
}: {
  block: Block;
  headingLevel: 2 | 3 | 4;
  resolveImageSrc?: (src: string) => string;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${Math.min(headingLevel + block.level - 1, 6)}` as HeadingTag;
      return (
        <Tag className={block.level === 1 ? "text-base font-semibold" : "font-medium"}>
          <Runs runs={block.runs} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          <Runs runs={block.runs} />
        </p>
      );
    case "list":
      return <ListView block={block} headingLevel={headingLevel} />;
    case "code":
      return (
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-sm">
          <code>{block.text}</code>
        </pre>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolveImageSrc ? resolveImageSrc(block.src) : block.src}
          alt={block.alt}
          loading="lazy"
          className="max-w-full rounded-md"
        />
      );
    case "quote":
      return (
        <blockquote className="text-muted-foreground border-l-2 pl-3">
          <Runs runs={block.runs} />
        </blockquote>
      );
    case "hr":
      return <hr className="border-border" />;
    case "table":
      return (
        <div
          tabIndex={0}
          role="region"
          aria-label="Tableau"
          className="focus-visible:ring-ring overflow-x-auto rounded-md border focus-visible:ring-2 focus-visible:outline-none"
        >
          <table className="w-full text-sm">
            <caption className="sr-only">Tableau</caption>
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b px-2 py-1.5 font-medium"
                    style={{ textAlign: block.align[i] ?? "left" }}
                  >
                    <Runs runs={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="border-b px-2 py-1.5"
                      style={{ textAlign: block.align[j] ?? "left" }}
                    >
                      <Runs runs={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className="bg-muted/50 rounded-md border-l-4 p-3">
          <Markdown
            source=""
            blocks={block.blocks}
            headingLevel={headingLevel}
            resolveImageSrc={resolveImageSrc}
          />
        </div>
      );
  }
}

/**
 * Rendu Markdown léger (même parseur que les PDF). `headingLevel` = niveau HTML d'un « # »,
 * pour s'insérer sous le titre de section de la page sans casser la hiérarchie.
 */
export function Markdown({
  source,
  headingLevel = 3,
  resolveImageSrc,
  blocks,
}: {
  source: string;
  headingLevel?: 2 | 3 | 4;
  /** Transforme le `src` d'une image (ex. chemin Storage → URL signée). */
  resolveImageSrc?: (src: string) => string;
  /** Pour le rendu récursif d'un encadré : blocs déjà découpés, `source` est alors ignoré. */
  blocks?: Block[];
}) {
  return (
    <div className="space-y-3 leading-relaxed">
      {(blocks ?? parseMarkdown(source)).map((block, i) => (
        <BlockView
          key={i}
          block={block}
          headingLevel={headingLevel}
          resolveImageSrc={resolveImageSrc}
        />
      ))}
    </div>
  );
}
