import { Check, ExternalLink } from "lucide-react";

import { BoxFrame, NoteFrame } from "@/components/markdown-box";
import { parseMarkdown, type Block, type InlineRun, type ListBlock } from "@/lib/pdf/markdown";
import { plainText, segments, topLevel } from "@/lib/present/boxes";

// Pas de `javascript:` ni `data:` dans les liens rendus.
const SAFE_HREF = /^(https?:|mailto:|\/|#)/i;

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/** `present` : typographie agrandie pour la projection en classe. */
export type MarkdownSize = "default" | "present";

const PRESENT_HEADING = ["text-5xl", "text-4xl", "text-3xl"] as const;

function Runs({ runs }: { runs: InlineRun[] }) {
  return runs.map((r, i) => {
    if ("break" in r) return <br key={i} />;
    return r.code ? (
      <code
        key={i}
        className={`bg-muted rounded px-1 font-mono text-[0.9em] ${r.bold ? "font-bold" : ""}`}
      >
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
      <Gaps key={i} text={r.text} />
    );
  });
}

/** « ___ » dans un texte : un trou à compléter ensemble en classe (diapo « à compléter »). */
function Gaps({ text }: { text: string }) {
  const parts = text.split(/_{3,}/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 ? (
        <span className="border-primary mx-1 inline-block min-w-[6ch] border-b-4 align-baseline">
          <span className="sr-only">(à compléter)</span>
        </span>
      ) : null}
    </span>
  ));
}

function ListView({ block, headingLevel }: { block: ListBlock; headingLevel: 2 | 3 | 4 }) {
  const List = block.ordered ? "ol" : "ul";
  return (
    <List
      {...(block.ordered && block.start ? { start: block.start } : {})}
      className={`space-y-1 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
    >
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
  size,
  id,
  tableLabel,
  showNotes = false,
  fiche,
}: {
  block: Block;
  /** Lecture d'une fiche : hiérarchie marquée, images agrandissables. */
  fiche?: { top: number; part: number; images: ReadonlySet<string> };
  headingLevel: 2 | 3 | 4;
  resolveImageSrc?: (src: string) => string;
  size: MarkdownSize;
  /** Ancre d'un titre (sommaire). */
  id?: string;
  /** Titre qui précède un tableau : sert de légende (sinon « Tableau »). */
  tableLabel?: string;
  /** Notes pour l'enseignante visibles (Aperçu, Lire) ; masquées partout ailleurs. */
  showNotes?: boolean;
}) {
  const present = size === "present";
  switch (block.type) {
    case "note":
      return showNotes ? (
        <aside className="text-muted-foreground border-muted-foreground/40 rounded-md border-l-4 border-dashed px-3 py-1 italic">
          <span className="text-xs font-semibold tracking-wide uppercase not-italic">
            Note · pour toi seule
          </span>
          <span className="block whitespace-pre-wrap">{block.text}</span>
        </aside>
      ) : null;
    case "heading": {
      // En lecture, le plus haut titre de la fiche prend le niveau demandé : aucun niveau sauté.
      const depth = block.level - (fiche ? fiche.top : 1);
      const Tag = `h${Math.min(headingLevel + depth, 6)}` as HeadingTag;
      if (fiche) {
        if (depth === 0) {
          return (
            <Tag
              id={id}
              className="font-heading border-border !mt-12 scroll-mt-20 border-t-2 pt-5 text-[1.375rem] leading-tight font-semibold text-balance first:!mt-0 first:border-t-0 first:pt-0"
            >
              {fiche.part > 0 ? (
                <span className="text-primary block text-xs font-bold tracking-widest uppercase">
                  Partie {fiche.part}
                </span>
              ) : null}
              <Runs runs={block.runs} />
            </Tag>
          );
        }
        return (
          <Tag
            id={id}
            className={`scroll-mt-20 leading-snug font-semibold ${depth === 1 ? "!mt-7 text-[1.0625rem]" : "!mt-4 text-base"}`}
          >
            <Runs runs={block.runs} />
          </Tag>
        );
      }
      const className = present
        ? `font-heading font-semibold leading-tight ${PRESENT_HEADING[Math.min(block.level, 3) - 1]}`
        : block.level === 1
          ? "mt-2 text-base font-semibold"
          : block.level === 2
            ? "mt-2 text-sm font-semibold"
            : "font-semibold";
      return (
        <Tag id={id} className={id ? `${className} scroll-mt-20` : className}>
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
    case "code": {
      const file = /^\s*(?:#|\/\/|--)\s*([\w./-]+\.[a-z]{1,5})\b/.exec(block.text)?.[1];
      const label = [block.lang?.toUpperCase(), file].filter(Boolean).join(" · ");
      return (
        <figure className="bg-muted overflow-hidden rounded-md border">
          {label ? (
            <figcaption className="text-muted-foreground border-b px-3 py-1 font-mono text-xs">
              {label}
            </figcaption>
          ) : null}
          <pre
            tabIndex={0}
            className={`focus-visible:ring-ring overflow-x-auto p-3 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${present ? "text-xl" : "text-sm"}`}
          >
            <code>{block.text}</code>
          </pre>
        </figure>
      );
    }
    case "image": {
      const src = resolveImageSrc ? resolveImageSrc(block.src) : block.src;
      const light = block.src.replace(/(\.[a-z0-9]+)$/i, "-clair$1");
      const hasLight = !!fiche?.images.has(light);
      const lightSrc = hasLight && resolveImageSrc ? resolveImageSrc(light) : null;
      const className = present
        ? "mx-auto max-h-[70vh] max-w-full rounded-md"
        : "mx-auto max-w-full rounded-md";
      const picture = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={block.alt}
            loading="lazy"
            className={lightSrc ? `${className} hidden dark:block` : className}
          />
          {lightSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightSrc}
              alt={block.alt}
              loading="lazy"
              className={`${className} dark:hidden`}
            />
          ) : null}
        </>
      );
      if (!fiche) return picture;
      return (
        <figure className="bg-card space-y-2 rounded-xl border p-2 sm:p-3">
          {picture}
          <figcaption className="text-right">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground focus-visible:ring-ring inline-flex min-h-6 items-center gap-1 rounded text-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
            >
              Ouvrir en grand<span className="sr-only"> (nouvel onglet) : {block.alt}</span>
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </figcaption>
        </figure>
      );
    }
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
          aria-label={tableLabel ?? "Tableau"}
          className="focus-visible:ring-ring overflow-x-auto rounded-md border focus-visible:ring-2 focus-visible:outline-none"
        >
          <table className={present ? "w-full text-xl" : "w-full text-sm"}>
            <caption className="sr-only">{tableLabel ?? "Tableau"}</caption>
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="bg-muted border-b px-3 py-2 text-left font-semibold"
                    style={{ textAlign: block.align[i] ?? "left" }}
                  >
                    <Runs runs={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="even:bg-muted/40 last:[&>*]:border-b-0">
                  {row.map((cell, j) => {
                    // Première colonne en en-tête de ligne, sauf tableau à coin vide.
                    const head = j === 0 && plainText(block.header[0] ?? []).trim() !== "";
                    const Cell = head ? "th" : "td";
                    return (
                      <Cell
                        key={j}
                        {...(head ? { scope: "row" as const } : {})}
                        className={`border-b px-3 py-2 align-top ${head ? "font-semibold" : ""}`}
                        style={{ textAlign: block.align[j] ?? "left" }}
                      >
                        <Runs runs={cell} />
                      </Cell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const inner = (
        <Markdown
          source=""
          blocks={block.blocks}
          headingLevel={headingLevel}
          resolveImageSrc={resolveImageSrc}
          size={size}
        />
      );
      return fiche ? (
        <NoteFrame>{inner}</NoteFrame>
      ) : (
        <div className="bg-muted/50 rounded-md border-l-4 p-3">{inner}</div>
      );
    }
  }
}

/** « Essentiel, ou pour aller plus loin » : deux cartes à la place d'une liste. */
function PriorityCards({ list }: { list: ListBlock }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {list.items.map((item, i) => (
        <li
          key={i}
          className={`bg-card rounded-xl p-4 ${i === 0 ? "border-primary border-2" : "border border-dashed"}`}
        >
          {i === 0 ? <Check aria-hidden className="text-primary mb-1 size-5" /> : null}
          <Runs runs={item.runs} />
        </li>
      ))}
    </ul>
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
  blocks,
  size = "default",
  anchorPrefix,
  showNotes = false,
  variant,
  imageNames,
}: {
  source: string;
  /** `fiche` : lecture d'une fiche (titres hiérarchisés, encadrés, images agrandissables). */
  variant?: "fiche";
  /** Images jointes à la fiche : sert à trouver la version claire d'un schéma (`nom-clair.png`). */
  imageNames?: string[];
  headingLevel?: 2 | 3 | 4;
  /** Transforme le `src` d'une image (ex. chemin Storage → URL signée). */
  resolveImageSrc?: (src: string) => string;
  /** Pour le rendu récursif d'un encadré : blocs déjà découpés, `source` est alors ignoré. */
  blocks?: Block[];
  size?: MarkdownSize;
  /** Donne aux titres de premier niveau l'ancre `${anchorPrefix}-${index du bloc}` (voir `markdownOutline`). */
  anchorPrefix?: string;
  /** Montre les notes « pour toi seule » (Aperçu et Lire de la ressource seulement). */
  showNotes?: boolean;
}) {
  const all = blocks ?? parseMarkdown(source);
  const isFiche = variant === "fiche";
  const top = topLevel(all);
  const images = new Set(imageNames ?? []);
  // Rang de chaque titre de partie ; la première partie est le titre de la fiche, non numéroté.
  const parts = new Map(
    all
      .flatMap((b, i) => (b.type === "heading" && b.level === top ? [i] : []))
      .map((index, rank) => [index, rank]),
  );

  const view = (i: number) => {
    const block = all[i];
    // En lecture, un séparateur placé juste avant un titre ne dit rien de plus que le titre.
    if (isFiche && block.type === "hr" && all[i + 1]?.type === "heading") return null;
    // Légende d'un tableau : le dernier titre rencontré avant lui.
    let tableLabel: string | undefined;
    if (block.type === "table") {
      for (let k = i - 1; k >= 0; k--) {
        const prev = all[k];
        if (prev.type === "heading") {
          tableLabel = plainText(prev.runs).trim();
          break;
        }
      }
    }
    return (
      <BlockView
        key={i}
        block={block}
        headingLevel={headingLevel}
        resolveImageSrc={resolveImageSrc}
        size={size}
        id={anchorPrefix && block.type === "heading" ? `${anchorPrefix}-${i}` : undefined}
        tableLabel={tableLabel || undefined}
        showNotes={showNotes}
        fiche={isFiche ? { top, part: parts.get(i) ?? 0, images } : undefined}
      />
    );
  };

  return (
    <div
      className={
        size === "present"
          ? "space-y-6 text-2xl leading-relaxed"
          : isFiche
            ? "space-y-3 text-base leading-[1.65]"
            : "space-y-3 leading-relaxed"
      }
    >
      {isFiche
        ? segments(all).map((segment) => {
            const [first, ...rest] = segment.indexes;
            if (!segment.box) return view(first);
            if (segment.box === "priority") {
              return (
                <div key={first} className="space-y-3">
                  {view(first)}
                  {rest.map((i) => {
                    const block = all[i];
                    return block.type === "list" ? <PriorityCards key={i} list={block} /> : view(i);
                  })}
                </div>
              );
            }
            return (
              <div key={first} className="!mt-7">
                <BoxFrame kind={segment.box}>
                  <div className="space-y-3 [&>h3]:!mt-0 [&>h4]:!mt-0">
                    {segment.indexes.map(view)}
                  </div>
                </BoxFrame>
              </div>
            );
          })
        : all.map((_, i) => view(i))}
    </div>
  );
}

/**
 * Sommaire d'une fiche, à deux niveaux : les parties (niveau 1) et leurs diapos (niveau 2), avec
 * l'ancre posée par `<Markdown anchorPrefix>`.
 */
export function markdownOutline(source: string, anchorPrefix: string) {
  const blocks = parseMarkdown(source);
  const top = topLevel(blocks);
  return blocks.flatMap((block, i) =>
    block.type === "heading" && block.level <= top + 1
      ? [{ id: `${anchorPrefix}-${i}`, level: block.level - top + 1, text: plainText(block.runs) }]
      : [],
  );
}
