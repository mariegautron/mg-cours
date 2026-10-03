import { cn } from "@/lib/utils";

const TONES = {
  plain: "border-border bg-foreground/5",
  ok: "border-mint/45 bg-mint/12 text-mint",
  warn: "border-sun/45 bg-sun/12 text-sun",
  key: "border-primary/55 bg-primary/10 text-primary",
  wip: "border-sky/45 bg-sky/12 text-sky",
  lock: "border-coral/45 bg-coral/12 text-coral",
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
