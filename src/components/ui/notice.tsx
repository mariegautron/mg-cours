import { Info, OctagonAlert, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Alerte à trois niveaux (lot 1) :
 * - `info` : texte gris, sans cadre ;
 * - `warning` : encadré avec icône, rien n'est empêché ;
 * - `blocking` : encadré, l'action est empêchée (ou demande une confirmation explicite).
 */
export function Notice({
  level = "info",
  title,
  className,
  children,
  live = false,
}: {
  level?: "info" | "warning" | "blocking";
  /** Message apparu après une action : annoncé aux lecteurs d'écran. Sinon, texte fixe sans rôle. */
  live?: boolean;
  title?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  if (level === "info") {
    return (
      <p className={cn("text-muted-foreground flex items-start gap-1.5 text-sm", className)}>
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {title ? <strong className="text-foreground">{title} </strong> : null}
          {children}
        </span>
      </p>
    );
  }
  const Icon = level === "blocking" ? OctagonAlert : TriangleAlert;
  return (
    <div
      role={live ? (level === "blocking" ? "alert" : "status") : undefined}
      className={cn(
        "bg-muted flex items-start gap-2 rounded-[10px] border p-3 text-sm",
        level === "blocking" ? "border-status-blocking" : "border-status-todo",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          level === "blocking" ? "text-destructive" : "text-warning",
        )}
      />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
