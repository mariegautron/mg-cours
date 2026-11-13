"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Section repliable commune (lot G) : titre 14 px 600, compteur, ouverte ou fermée mémorisée par
 * page dans ce navigateur (`localStorage`, protégé : sans stockage, l'état par défaut s'applique).
 */
export function Section({
  id,
  title,
  count,
  defaultOpen = true,
  children,
  className,
}: {
  /** Identifiant stable, unique sur la page (sert aussi de clé de mémorisation). */
  id: string;
  title: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const pathname = usePathname();
  const key = `section:${pathname}:${id}`;

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "1" || v === "0") setOpen(v === "1");
    } catch {
      // Stockage indisponible : l'état par défaut reste.
    }
  }, [key]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // Rien à faire.
    }
  }

  return (
    <section aria-labelledby={`${bodyId}-t`} className={cn("space-y-2", className)}>
      <h2 id={`${bodyId}-t`} className="text-sm font-semibold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
          className="hover:text-foreground inline-flex min-h-11 items-center gap-1.5"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform motion-reduce:transition-none",
              !open && "-rotate-90",
            )}
          />
          {title}
          {count !== undefined ? (
            <span className="text-muted-foreground-2 font-normal">{count}</span>
          ) : null}
        </button>
      </h2>
      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
