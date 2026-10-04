"use client";

import { useRef, useState } from "react";
import { Bold, Heading, Italic, Link2, List, Quote } from "lucide-react";

import { Markdown } from "@/components/markdown";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyFormat, type MarkdownFormat } from "@/lib/markdown-format";
import { cn } from "@/lib/utils";

const TOOLS: { format: MarkdownFormat; label: string; Icon: typeof Bold }[] = [
  { format: "bold", label: "Gras", Icon: Bold },
  { format: "italic", label: "Italique", Icon: Italic },
  { format: "heading", label: "Titre", Icon: Heading },
  { format: "list", label: "Liste", Icon: List },
  { format: "quote", label: "Citation", Icon: Quote },
  { format: "link", label: "Lien", Icon: Link2 },
];

/**
 * Zone de texte Markdown lisible : barre de mise en forme (Gras, Italique, Titre, Liste, Citation,
 * Lien), onglets « Écrire / Aperçu » qui RENDENT le Markdown, et aperçu côté à côté dès 1280 px.
 */
export function MarkdownField({
  id,
  label,
  value,
  onChange,
  rows = 6,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const format = (f: MarkdownFormat) => {
    const el = ref.current;
    if (!el) return;
    const result = applyFormat(value, el.selectionStart, el.selectionEnd, f);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div
          role="tablist"
          aria-label="Écrire ou prévisualiser"
          className="bg-muted flex rounded-md p-0.5 xl:hidden"
        >
          {(
            [
              ["write", "Écrire"],
              ["preview", "Aperçu"],
            ] as const
          ).map(([v, text]) => (
            <button
              key={v}
              type="button"
              role="tab"
              id={`${id}-tab-${v}`}
              aria-selected={tab === v}
              aria-controls={`${id}-panel-${v}`}
              onClick={() => setTab(v)}
              className={cn(
                "focus-visible:ring-ring min-h-9 rounded px-3 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none",
                tab === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
              )}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap gap-1.5">
        {TOOLS.map(({ format: f, label: text, Icon }) => (
          <button
            key={f}
            type="button"
            onClick={() => format(f)}
            className="hover:bg-muted focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <Icon aria-hidden className="size-4" />
            {text}
            <span className="sr-only"> : mettre en forme le texte</span>
          </button>
        ))}
      </div>
      <div className="xl:grid xl:grid-cols-2 xl:gap-4">
        <div
          id={`${id}-panel-write`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-write`}
          className={cn(tab !== "write" && "max-xl:hidden")}
        >
          <Textarea
            id={id}
            ref={ref}
            rows={rows}
            value={value}
            className="font-mono text-sm"
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <div
          id={`${id}-panel-preview`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-preview`}
          tabIndex={0}
          className={cn(
            "bg-card min-h-24 rounded-md border p-3 text-sm",
            tab !== "preview" && "max-xl:hidden",
          )}
        >
          {value.trim() ? (
            <Markdown source={value} />
          ) : (
            <p className="text-muted-foreground">Rien à afficher pour l’instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
