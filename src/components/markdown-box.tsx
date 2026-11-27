import { Bookmark, Info, Lightbulb, Scale, TriangleAlert, type LucideIcon } from "lucide-react";

import type { BoxKind } from "@/lib/present/boxes";

/**
 * Habillage d'un encadré. Chaque type se reconnaît sans la couleur : un mot, une icône et une
 * forme de bordure qui lui sont propres.
 */
const STYLES: Record<
  Exclude<BoxKind, "priority">,
  { label: string; icon: LucideIcon; frame: string; tone: string }
> = {
  trap: {
    label: "Piège à éviter",
    icon: TriangleAlert,
    frame: "border-l-8 border-l-status-blocking-fg border-y border-r",
    tone: "text-status-blocking-fg",
  },
  example: {
    label: "Exemple",
    icon: Lightbulb,
    frame: "border-l-[10px] border-double border-l-status-published-fg border-y border-r",
    tone: "text-status-published-fg",
  },
  recap: {
    label: "À retenir",
    icon: Bookmark,
    frame: "border-2 border-status-ready-fg",
    tone: "text-status-ready-fg",
  },
  grid: {
    label: "La grille",
    icon: Scale,
    frame: "border-t-4 border-t-primary border-x border-b",
    tone: "text-primary",
  },
};

export function BoxFrame({
  kind,
  children,
}: {
  kind: Exclude<BoxKind, "priority">;
  children: React.ReactNode;
}) {
  const { label, icon: Icon, frame, tone } = STYLES[kind];
  return (
    <div className={`bg-card space-y-3 rounded-xl p-4 sm:p-5 ${frame}`}>
      <p className={`flex items-center gap-2 text-xs font-bold tracking-widest uppercase ${tone}`}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {label}
      </p>
      {children}
    </div>
  );
}

export function NoteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border-status-todo-fg space-y-2 rounded-xl border border-dashed p-4">
      <p className="text-status-todo-fg flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
        <Info aria-hidden className="size-4 shrink-0" />À noter
      </p>
      {children}
    </div>
  );
}
