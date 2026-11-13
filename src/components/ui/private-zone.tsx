import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Zone privée (lot 1) : fond légèrement différent et pastille « Pour toi seule » dans le titre.
 * Rien de ce qui est dedans ne part vers les étudiant·es.
 */
export function PrivateZone({
  title,
  titleId,
  className,
  children,
}: {
  title: React.ReactNode;
  titleId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("bg-private space-y-2 rounded-xl border p-4", className)}
    >
      <h3 id={titleId} className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {title}
        <span className="border-btn-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 text-xs font-semibold">
          <Lock aria-hidden className="size-3" />
          Pour toi seule
        </span>
      </h3>
      {children}
    </section>
  );
}
