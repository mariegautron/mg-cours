/**
 * Heure à la française, « 9 h 05 » : heure sans zéro, espaces insécables autour du « h »
 * (pas de coupure de ligne), heure de Paris.
 */
export function frTime(when: Date | string | number = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).formatToParts(new Date(when));
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "";
  return `${Number(h)}\u00a0h\u00a0${m}`;
}
