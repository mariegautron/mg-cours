import { cn } from "@/lib/utils";

export type MascotMood = "happy" | "thinking" | "party" | "alert";

/**
 * « Plume », la chouette de MG COURS. Illustration décorative (aria-hidden) : elle ne porte
 * jamais d'information seule — le texte voisin dit toujours la même chose.
 * Couleurs héritées des tokens du thème (clair/sombre) ; l'animation `animate-float`
 * est neutralisée par prefers-reduced-motion.
 */
export function Mascot({
  mood = "happy",
  className,
  float = true,
}: {
  mood?: MascotMood;
  className?: string;
  float?: boolean;
}) {
  const pupil =
    mood === "thinking"
      ? { dx: 3, dy: -3 }
      : mood === "alert"
        ? { dx: 0, dy: 0 }
        : { dx: 0, dy: 1 };
  const pupilR = mood === "alert" ? 3.5 : 6;

  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      className={cn("size-28", float && "animate-float", className)}
    >
      {/* ombre */}
      <ellipse cx="60" cy="112" rx="26" ry="4" fill="currentColor" opacity="0.12" />
      {/* pieds */}
      <ellipse cx="48" cy="107" rx="8" ry="4" fill="var(--sun)" />
      <ellipse cx="72" cy="107" rx="8" ry="4" fill="var(--sun)" />
      {/* aigrettes */}
      <path d="M30 34 L40 14 L52 30 Z" fill="var(--violet)" />
      <path d="M90 34 L80 14 L68 30 Z" fill="var(--violet)" />
      {/* corps */}
      <ellipse cx="60" cy="66" rx="40" ry="42" fill="var(--violet)" />
      <ellipse cx="60" cy="78" rx="25" ry="27" fill="var(--card)" opacity="0.92" />
      {/* ailes */}
      <ellipse cx="22" cy="72" rx="8" ry="18" fill="var(--violet)" transform="rotate(12 22 72)" />
      <ellipse cx="98" cy="72" rx="8" ry="18" fill="var(--violet)" transform="rotate(-12 98 72)" />
      {/* joues */}
      <circle cx="34" cy="70" r="5" fill="var(--coral)" opacity="0.55" />
      <circle cx="86" cy="70" r="5" fill="var(--coral)" opacity="0.55" />
      {/* yeux */}
      <circle cx="44" cy="54" r="14" fill="#fff" />
      <circle cx="76" cy="54" r="14" fill="#fff" />
      <circle cx={44 + pupil.dx} cy={55 + pupil.dy} r={pupilR} fill="#1b1533" />
      <circle cx={76 + pupil.dx} cy={55 + pupil.dy} r={pupilR} fill="#1b1533" />
      <circle cx={46 + pupil.dx} cy={52 + pupil.dy} r="2" fill="#fff" />
      <circle cx={78 + pupil.dx} cy={52 + pupil.dy} r="2" fill="#fff" />
      {/* bec */}
      <path d="M60 62 L53 73 L67 73 Z" fill="var(--sun)" />
      {/* toque de diplômée */}
      <path d="M28 24 L60 10 L92 24 L60 38 Z" fill="#1b1533" />
      <path d="M44 32 V42 Q60 50 76 42 V32 L60 38 Z" fill="#2a2150" />
      <path d="M92 24 V38" stroke="var(--sun)" strokeWidth="2" />
      <circle cx="92" cy="40" r="3" fill="var(--sun)" />

      {mood === "thinking" ? (
        <text
          x="92"
          y="18"
          fontSize="22"
          fontWeight="700"
          fill="var(--sky)"
          fontFamily="sans-serif"
        >
          ?
        </text>
      ) : null}
      {mood === "alert" ? (
        <text
          x="96"
          y="20"
          fontSize="24"
          fontWeight="700"
          fill="var(--coral)"
          fontFamily="sans-serif"
        >
          !
        </text>
      ) : null}
      {mood === "party" ? (
        <g>
          <circle cx="16" cy="20" r="3" fill="var(--coral)" />
          <circle cx="104" cy="14" r="3" fill="var(--mint)" />
          <rect
            x="8"
            y="46"
            width="6"
            height="3"
            rx="1"
            fill="var(--sun)"
            transform="rotate(30 8 46)"
          />
          <rect
            x="108"
            y="40"
            width="6"
            height="3"
            rx="1"
            fill="var(--sky)"
            transform="rotate(-25 108 40)"
          />
          <circle cx="112" cy="70" r="2.5" fill="var(--violet)" />
        </g>
      ) : null}
    </svg>
  );
}

/** Marque compacte pour la barre latérale. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--violet)" />
      <path d="M6 12 L16 7 L26 12 L16 17 Z" fill="#1b1533" />
      <circle cx="12" cy="21" r="3.6" fill="#fff" />
      <circle cx="20" cy="21" r="3.6" fill="#fff" />
      <circle cx="12.4" cy="21.4" r="1.6" fill="#1b1533" />
      <circle cx="20.4" cy="21.4" r="1.6" fill="#1b1533" />
      <path d="M16 22.5 L14.4 25.2 L17.6 25.2 Z" fill="var(--sun)" />
    </svg>
  );
}
