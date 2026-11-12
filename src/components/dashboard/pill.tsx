import { Check, Circle, CircleDashed, Eye, OctagonAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  // Pastilles de statut : texte #0E0E11 sur la couleur du statut (jetons --status-*).
  plain: "border-border bg-muted text-foreground",
  idle: "border-transparent bg-status-idle text-status-ink",
  ok: "border-transparent bg-status-ready text-status-ink",
  warn: "border-transparent bg-status-todo text-status-ink",
  key: "border-primary text-primary",
  // « En cours », compte à rebours, information : neutre, sans icône (ce n'est pas un statut).
  wip: "border-btn-border bg-transparent text-foreground",
  published: "border-transparent bg-status-published text-status-ink",
  lock: "border-transparent bg-status-blocking text-status-ink",
} as const;

/** Icône de chaque statut : un statut n'est jamais donné par la couleur seule (RGAA 3.1). */
const ICONS = {
  idle: Circle,
  ok: Check,
  warn: CircleDashed,
  published: Eye,
  lock: OctagonAlert,
} as const;

/**
 * Pastille : texte toujours écrit en mots ; pour un statut, une icône et une couleur en renfort.
 * Tons de statut : `idle` pas commencé, `warn` à compléter, `ok` prêt, `published` publié,
 * `lock` bloquant. `wip` et `plain` sont neutres (information, sans icône).
 */
export function Pill({
  tone = "plain",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = tone in ICONS ? ICONS[tone as keyof typeof ICONS] : null;
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 text-[0.8rem] font-bold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} /> : null}
      {children}
    </span>
  );
}

export type StatusState = "idle" | "todo" | "ready" | "published" | "blocking";

const STATE_TONE: Record<StatusState, keyof typeof TONES> = {
  idle: "idle",
  todo: "warn",
  ready: "ok",
  published: "published",
  blocking: "lock",
};

/** Composant Statut (5 états) : une couleur, une icône et 1 à 3 mots, sur une ligne. */
export function Status({
  state,
  className,
  children,
}: {
  state: StatusState;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Pill tone={STATE_TONE[state]} className={className}>
      {children}
    </Pill>
  );
}
