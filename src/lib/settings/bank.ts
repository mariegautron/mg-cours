import { extractIban } from "@/lib/ynov/invoice";

/** Valide la clé de contrôle Luhn d'un SIRET (14 chiffres). Les établissements La Poste
 * (SIREN 356 000 000) dérogent historiquement à cette règle. */
export function isValidSiret(siret: string): boolean {
  const s = siret.replace(/\s/g, "");
  if (!/^\d{14}$/.test(s)) return false;
  if (s.startsWith("356000000")) return true;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Découpe le RIB stocké (`teacher_profile.bank_details`) en IBAN + BIC pour le formulaire. */
export function parseBankDetails(text: string | null): { iban: string; bic: string } {
  if (!text?.trim()) return { iban: "", bic: "" };
  const iban = extractIban(text);
  const bic = text.match(/BIC\s*:?\s*([A-Za-z0-9]{8,11})\b/i)?.[1]?.toUpperCase() ?? "";
  // RIB libre non reconnu : on le laisse dans le champ IBAN pour ne rien perdre.
  return { iban: iban ? groupIban(iban) : text.trim(), bic };
}

/** Recompose le RIB stocké, lu tel quel sur la facture et par `extractIban`. */
export function formatBankDetails(iban: string, bic: string): string {
  const lines: string[] = [];
  if (iban) lines.push(`IBAN : ${groupIban(iban)}`);
  if (bic) lines.push(`BIC : ${bic.replace(/\s/g, "").toUpperCase()}`);
  return lines.join("\n");
}

/** IBAN affiché par blocs de 4 : FR76 3000 6000 0112 3456 7890 189. */
export function groupIban(iban: string): string {
  return iban
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/(.{4})(?=.)/g, "$1 ");
}

/** SIRET affiché par blocs : 804 426 732 00033. */
export function formatSiret(siret: string): string {
  return /^\d{14}$/.test(siret)
    ? `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`
    : siret;
}
