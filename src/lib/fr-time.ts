/** Heure à la française, « 15 h 12 » (typographie : espaces autour du « h »), heure de Paris. */
export function frTime(when: Date | string | number = new Date()): string {
  return new Date(when)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    .replace(":", " h ");
}
