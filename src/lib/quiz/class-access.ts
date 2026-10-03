/**
 * US-155 : accès au QCM par un lien de classe (QR code) et choix du nom. Fonctions pures.
 */

export function classUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/q/classe/${token}`;
}

export interface ClassName {
  id: string;
  name: string;
}

/** Relit la liste des noms libres renvoyée par la base ; ignore toute entrée mal formée. */
export function parseClassNames(raw: unknown): ClassName[] {
  if (!Array.isArray(raw)) return [];
  const out: ClassName[] = [];
  for (const e of raw) {
    const o = e as Record<string, unknown>;
    if (typeof o?.id === "string" && typeof o.name === "string" && o.name.trim()) {
      out.push({ id: o.id, name: o.name.trim() });
    }
  }
  return out;
}

/** Filtre « je tape mon nom » : insensible aux accents et à la casse. */
export function filterNames(names: readonly ClassName[], query: string): ClassName[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const q = norm(query).trim();
  return q ? names.filter((n) => norm(n.name).includes(q)) : [...names];
}

export type ClaimStatus = "ok" | "taken" | "window_closed" | "invalid" | "unavailable";

export function readClaimStatus(raw: unknown): ClaimStatus {
  const s = (raw as { status?: unknown } | null)?.status;
  return s === "ok" || s === "taken" || s === "window_closed" || s === "invalid"
    ? s
    : "unavailable";
}

export const CLAIM_MESSAGES: Record<Exclude<ClaimStatus, "ok">, string> = {
  taken:
    "Ce nom vient d’être pris. Si c’est bien le vôtre, prévenez votre enseignante : elle peut le libérer.",
  window_closed: "Le QCM n’est pas ouvert en ce moment.",
  invalid: "Ce lien ne fonctionne plus. Demandez le nouveau QR code à votre enseignante.",
  unavailable: "Un souci est survenu. Réessayez dans un instant.",
};

/** Une attribution peut être libérée tant que la copie n'est pas commencée. */
export function canRelease(attemptStatus: string): boolean {
  return attemptStatus === "ready";
}
