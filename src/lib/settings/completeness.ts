import { extractIban } from "@/lib/ynov/invoice";
import { isValidSiret } from "@/lib/settings/bank";
import type { Tables } from "@/types/db";

export interface ProfileCompleteness {
  percent: number;
  missing: string[];
}

/** Reprend les champs requis par `missingInvoiceData` (src/lib/ynov/invoice.ts) pour que le
 * profil soit prêt à facturer avant que la première facture ne le révèle. */
export function profileCompleteness(
  profile: Tables<"teacher_profile"> | null,
): ProfileCompleteness {
  const checks: [boolean, string][] = [
    [!!profile?.legal_name, "Nom / raison sociale"],
    [!!profile?.address, "Adresse"],
    [!!profile?.siret && isValidSiret(profile.siret), "SIRET valide"],
    [!!profile?.vat_exempt || !!profile?.vat_number, "N° de TVA (ou TVA non applicable)"],
    [!!extractIban(profile?.bank_details ?? null), "IBAN valide"],
    [!!profile?.email, "E-mail"],
  ];

  const done = checks.filter(([ok]) => ok).length;
  const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
  return { percent: Math.round((done / checks.length) * 100), missing };
}
