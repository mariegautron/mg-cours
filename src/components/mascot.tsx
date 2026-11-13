import { cn } from "@/lib/utils";

/**
 * Humeurs de Margot. Les anciennes valeurs (« happy », « thinking », « party », « alert ») restent
 * acceptées pour ne rien casser : « party » est la version contente, « sleepy » la version endormie.
 */
export type MascotMood = "happy" | "thinking" | "party" | "alert" | "sleepy";

type Look = {
  eyeRy: number;
  pupilR: number;
  wingRot: number;
  /** Couleur de la case de marelle sous Margot (jetons de statut). */
  caseColor: string;
  caseNumber: string;
  label: string;
};

const LOOKS: Record<"contente" | "pensive" | "endormie" | "alerte", Look> = {
  contente: {
    eyeRy: 7,
    pupilR: 3.5,
    wingRot: -14,
    caseColor: "var(--status-ready)",
    caseNumber: "3",
    label: "Margot, la pie de Marelle, contente : tout est prêt",
  },
  pensive: {
    eyeRy: 5,
    pupilR: 3,
    wingRot: 0,
    caseColor: "var(--status-todo)",
    caseNumber: "2",
    label: "Margot, la pie de Marelle, pensive : il manque quelque chose",
  },
  endormie: {
    eyeRy: 1.2,
    pupilR: 0,
    wingRot: 4,
    caseColor: "var(--status-idle)",
    caseNumber: "1",
    label: "Margot, la pie de Marelle, endormie : rien ici pour l'instant",
  },
  alerte: {
    eyeRy: 8,
    pupilR: 2.5,
    wingRot: -32,
    caseColor: "var(--status-blocking)",
    caseNumber: "4",
    label: "Margot, la pie de Marelle, en alerte : attention",
  },
};

function lookOf(mood: MascotMood) {
  if (mood === "thinking") return { key: "pensive" as const, look: LOOKS.pensive };
  if (mood === "alert") return { key: "alerte" as const, look: LOOKS.alerte };
  if (mood === "sleepy") return { key: "endormie" as const, look: LOOKS.endormie };
  return { key: "contente" as const, look: LOOKS.contente };
}

/**
 * « Margot », la pie de Marelle : l'unique composant mascotte de l'appli (une image, une taille,
 * un texte alternatif). Pour changer son dessin, c'est ici et nulle part ailleurs.
 *
 * Décorative par défaut (aria-hidden) : le texte voisin dit toujours la même chose. Quand elle
 * porte une information, passer `informative` : elle prend alors `role="img"` et un texte
 * alternatif « Margot, la pie de Marelle… ».
 * Couleurs : jetons du thème (contour = texte, aile = accent, case = statut). L'animation
 * `animate-float` est coupée par prefers-reduced-motion (globals.css).
 */
export function Mascot({
  mood = "happy",
  className,
  float = false,
  informative = false,
}: {
  mood?: MascotMood;
  className?: string;
  float?: boolean;
  informative?: boolean;
}) {
  const { key, look } = lookOf(mood);
  const a11y = informative
    ? ({ role: "img", "aria-label": look.label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <svg
      viewBox="0 0 160 160"
      focusable="false"
      {...a11y}
      className={cn("size-28", float && "animate-float", className)}
    >
      <rect
        x="22"
        y="116"
        width="96"
        height="34"
        rx="10"
        fill={look.caseColor}
        stroke="var(--margot-outline)"
        strokeWidth="3"
      />
      <text
        x="34"
        y="141"
        fontFamily="var(--font-heading), sans-serif"
        fontWeight="800"
        fontSize="20"
        fill="#14141F"
      >
        {look.caseNumber}
      </text>
      <path
        d="M64 98 L16 122 L24 132 L74 108 Z"
        fill="var(--margot-wing)"
        stroke="var(--margot-outline)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <line
        x1="80"
        y1="108"
        x2="78"
        y2="118"
        stroke="var(--margot-outline)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="92"
        y1="108"
        x2="94"
        y2="118"
        stroke="var(--margot-outline)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse
        cx="88"
        cy="88"
        rx="31"
        ry="24"
        fill="#14141F"
        stroke="var(--margot-outline)"
        strokeWidth="3"
      />
      <ellipse
        cx="97"
        cy="96"
        rx="18"
        ry="13"
        fill="#FFFFFF"
        stroke="var(--margot-outline)"
        strokeWidth="2.5"
      />
      <g transform={`rotate(${look.wingRot} 84 84)`}>
        <path
          d="M60 80 Q86 64 108 84 Q88 100 62 94 Z"
          fill="var(--margot-wing)"
          stroke="var(--margot-outline)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M70 85 Q86 78 99 86"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <circle
        cx="110"
        cy="58"
        r="19"
        fill="#14141F"
        stroke="var(--margot-outline)"
        strokeWidth="3"
      />
      <path
        d="M126 54 L146 60 L126 66 Z"
        fill="var(--status-todo)"
        stroke="var(--margot-outline)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="114" cy="53" rx="7" ry={look.eyeRy} fill="#FFFFFF" />
      {look.pupilR > 0 ? <circle cx="116" cy="53" r={look.pupilR} fill="#14141F" /> : null}
      {key === "endormie" ? (
        <text
          x="128"
          y="34"
          fontFamily="var(--font-heading), sans-serif"
          fontWeight="800"
          fontSize="16"
          fill="var(--margot-outline)"
        >
          z z
        </text>
      ) : null}
      {key === "alerte" ? (
        <text
          x="134"
          y="38"
          fontFamily="var(--font-heading), sans-serif"
          fontWeight="800"
          fontSize="26"
          fill="var(--status-blocking)"
        >
          !
        </text>
      ) : null}
      {key === "pensive" ? (
        <text
          x="132"
          y="38"
          fontFamily="var(--font-heading), sans-serif"
          fontWeight="800"
          fontSize="24"
          fill="var(--margot-wing)"
        >
          ?
        </text>
      ) : null}
      {key === "contente" ? (
        <path
          d="M132 24 l4 8 l8 -12"
          fill="none"
          stroke="var(--status-ready)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

/** Marque compacte (logo) : la tête de Margot, à côté du mot « marelle ». Décorative. */
export function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      style={style}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8", className)}
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="var(--card)"
        stroke="var(--margot-outline)"
        strokeWidth="1.5"
      />
      <path
        d="M6 21 Q14 14 22 20 Q15 25 7 24 Z"
        fill="var(--margot-wing)"
        stroke="var(--margot-outline)"
        strokeWidth="1.2"
      />
      <circle
        cx="18"
        cy="13"
        r="6.5"
        fill="#14141F"
        stroke="var(--margot-outline)"
        strokeWidth="1.2"
      />
      <path
        d="M24 11.5 L29 13 L24 14.5 Z"
        fill="var(--status-todo)"
        stroke="var(--margot-outline)"
        strokeWidth="1"
      />
      <circle cx="19.5" cy="11.5" r="2" fill="#FFFFFF" />
      <circle cx="20" cy="11.5" r="1" fill="#14141F" />
    </svg>
  );
}

/** Logo complet : tête de Margot + « marelle » en minuscules (Bricolage Grotesque 800). */
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn("flex items-center", size === "lg" ? "gap-3" : "gap-2.5", className)}>
      <LogoMark className={size === "lg" ? "size-10" : undefined} />
      <span
        className={cn(
          "title-display leading-none lowercase",
          size === "lg" ? "text-3xl" : "text-xl",
        )}
      >
        Marelle
      </span>
    </span>
  );
}
