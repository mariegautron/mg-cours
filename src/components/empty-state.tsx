import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface EmptyAction {
  label: string;
  href: string;
  variant?: "default" | "outline" | "secondary";
}

/**
 * État vide d'une liste ou d'un écran de données (US-120) : Plume décorative, un titre qui dit ce
 * qui manque, une phrase au tutoiement qui dit pourquoi, et au plus deux boutons (le premier est
 * l'action principale). Ce n'est pas une erreur : jamais de rouge. `compact` pour une carte.
 */
export function EmptyState({
  title,
  description,
  actions = [],
  compact = false,
  className,
}: {
  title: string;
  description: string;
  actions?: EmptyAction[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <Empty
      className={cn(compact && "gap-3 p-4 [&_svg]:size-14", className)}
      mascot={compact ? "happy" : "thinking"}
    >
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions.length ? (
        <EmptyContent className="flex-row flex-wrap justify-center">
          {actions.map((a, i) => (
            <Button
              key={a.href + a.label}
              asChild
              variant={a.variant ?? (i ? "outline" : "default")}
            >
              <Link href={a.href}>{a.label}</Link>
            </Button>
          ))}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
