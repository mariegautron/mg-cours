import { Check, Circle, CircleDashed, Eye, OctagonAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  // DA « Atelier » : fond = couleur du statut à 13 %, texte = couleur du statut (sa teinte foncée
  // en thème clair, jetons --status-*-fg, ≥ 4,5:1). Tons neutres : fond --muted, texte gris.
  plain: "bg-muted text-muted-foreground",
  idle: "bg-status-idle/13 text-status-idle-fg",
  ok: "bg-status-ready/13 text-status-ready-fg",
  warn: "bg-status-todo/13 text-status-todo-fg",
  // Ancienne pastille « clé » à contour lavande : neutre (la lavande est réservée à l'action).
  key: "bg-muted text-muted-foreground",
  wip: "bg-muted text-muted-foreground",
  published: "bg-status-published/13 text-status-published-fg",
  lock: "bg-status-blocking/13 text-status-blocking-fg",
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
        "inline-flex h-[22px] items-center gap-1 rounded-sm px-2 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3 shrink-0" /> : null}
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
