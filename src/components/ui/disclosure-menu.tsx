"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Menu « Plus ▾ » / « Ajouter ▾ » : un bouton qui ouvre un panneau, refermé par Échap, par un clic
 * à côté ou après un choix. Le contenu reste monté (masqué) : une fenêtre de confirmation ouverte
 * depuis le panneau ne disparaît pas quand le panneau se referme.
 */
export function DisclosureMenu({
  label,
  srLabel,
  className,
  panelClassName,
  children,
}: {
  label: React.ReactNode;
  /** Complément lu par les lecteurs d'écran (« d'actions sur la séance 3 »). */
  srLabel?: string;
  className?: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (root.current?.contains(target)) return;
      // Clic dans une fenêtre ouverte depuis le panneau (portail) : on ne ferme pas.
      if ((target as Element).closest?.("[role=alertdialog],[role=dialog]")) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "border-btn-border hover:bg-muted inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border px-4 text-sm font-semibold",
          className,
        )}
      >
        {label}
        {srLabel ? <span className="sr-only"> {srLabel}</span> : null}
        <ChevronDown aria-hidden className="size-4" />
      </button>
      <div
        id={id}
        hidden={!open}
        onClick={(e) => {
          // Un lien choisi referme le panneau.
          if ((e.target as Element).closest("a")) setOpen(false);
        }}
        className={cn(
          "bg-popover absolute z-20 mt-1 w-64 rounded-xl border p-2 shadow-md",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
