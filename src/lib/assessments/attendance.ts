export const ATTENDANCE_VALUES = ["present", "absent_unexcused", "absent_excused"] as const;
export type Attendance = (typeof ATTENDANCE_VALUES)[number];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Présent·e",
  absent_unexcused: "Absent·e non prévenu·e",
  absent_excused: "Absent·e excusé·e",
};

export const ATTENDANCE_HINTS: Record<Attendance, string> = {
  present: "",
  absent_unexcused: "Note 0 automatique (règle de l’école).",
  absent_excused: "Pas de note, non comptée dans la moyenne ; rattrapage à prévoir.",
};

export function isAttendance(value: unknown): value is Attendance {
  return typeof value === "string" && (ATTENDANCE_VALUES as readonly string[]).includes(value);
}

/** Ajustement individuel d'un·e membre dans une note de groupe (absence ou pondération). */
export interface MemberOverride {
  attendance: Attendance;
  /** Multiplicateur de la note du groupe (1 = inchangée, 0,8 = 80 %). */
  factor: number;
  /** Obligatoire dès que `factor` diffère de 1 ; affichée dans le rendu. */
  justification: string | null;
}

export const DEFAULT_OVERRIDE: MemberOverride = {
  attendance: "present",
  factor: 1,
  justification: null,
};

/** `true` si rien n'est à retenir : aucune ligne à enregistrer pour ce membre. */
export function isDefaultOverride(o: MemberOverride): boolean {
  return o.attendance === "present" && o.factor === 1 && !o.justification;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Note individuelle selon la présence : absent·e non prévenu·e = 0 automatique, absent·e excusé·e = pas
 * de note (hors moyenne tant qu'elle n'est pas remplacée par un rattrapage), présent·e = la note saisie.
 */
export function individualValueFor(attendance: Attendance, value: number | null): number | null {
  if (attendance === "absent_unexcused") return 0;
  if (attendance === "absent_excused") return null;
  return value;
}

/**
 * Note d'un·e membre pour une note de groupe : absent·e non prévenu·e = 0 (sans toucher à la note du
 * groupe), absent·e excusé·e = aucune note, sinon la note du groupe × pondération, plafonnée au barème.
 */
export function groupMemberValue(
  groupValue: number | null,
  maxScore: number,
  override?: MemberOverride | null,
): number | null {
  if (override?.attendance === "absent_unexcused") return 0;
  if (override?.attendance === "absent_excused") return null;
  if (groupValue === null) return null;
  if (!override || override.factor === 1) return groupValue;
  return Math.min(round2(groupValue * override.factor), maxScore);
}

const MAX_PERCENT = 200;

/**
 * Lit les ajustements individuels d'une note de groupe : `member_<id>_attendance`, `member_<id>_factor`
 * (en pourcentage) et `member_<id>_justification`. Une pondération différente de 100 % exige une
 * justification. Seuls les membres du groupe (`members`) sont lus ; les membres sans ajustement sont omis.
 */
export function readMemberOverrides(
  formData: FormData,
  members: readonly { id: string; name: string }[],
): { overrides: Map<string, MemberOverride> } | { error: string } {
  const overrides = new Map<string, MemberOverride>();
  for (const member of members) {
    const rawAttendance = formData.get(`member_${member.id}_attendance`);
    const attendance = isAttendance(rawAttendance) ? rawAttendance : "present";
    const justification =
      String(formData.get(`member_${member.id}_justification`) ?? "")
        .trim()
        .slice(0, 1000) || null;

    let factor = 1;
    const rawFactor = String(formData.get(`member_${member.id}_factor`) ?? "").trim();
    if (attendance === "present" && rawFactor !== "") {
      const percent = Number(rawFactor.replace(",", "."));
      if (!Number.isFinite(percent) || percent < 0 || percent > MAX_PERCENT) {
        return {
          error: `Pondération de ${member.name} : saisissez un pourcentage entre 0 et ${MAX_PERCENT}.`,
        };
      }
      factor = round2(percent / 100);
    }
    if (factor !== 1 && !justification) {
      return { error: `Justification obligatoire pour la pondération de ${member.name}.` };
    }

    const override: MemberOverride = { attendance, factor, justification };
    if (!isDefaultOverride(override)) overrides.set(member.id, override);
  }
  return { overrides };
}
