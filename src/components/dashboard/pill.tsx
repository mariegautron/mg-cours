import { cn } from "@/lib/utils";

const TONES = {
  // Pastilles de statut : texte #0E0E11 sur la couleur du statut (jetons --status-*).
  plain: "border-border bg-muted text-foreground",
  ok: "border-transparent bg-status-ready text-status-ink",
  warn: "border-transparent bg-status-todo text-status-ink",
  key: "border-primary text-primary",
  wip: "border-transparent bg-status-published text-status-ink",
  lock: "border-transparent bg-status-blocking text-status-ink",
} as const;

/** Pastille de la maquette : texte toujours écrit en mots, la couleur n'est qu'un renfort. */
export function Pill({
  tone = "plain",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 text-[0.8rem] font-bold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
