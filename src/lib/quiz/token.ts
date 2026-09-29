import { createHash, randomBytes } from "node:crypto";

/** Jeton personnel : 256 bits aléatoires, en base64url (43 caractères). Jamais stocké en clair. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Empreinte SHA-256 (hex, 64 caractères) : la seule forme connue de la base. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Forme d'un jeton valide : évite tout aller-retour en base pour des chaînes manifestement fausses. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** Empreinte d'une adresse IP, salée (l'IP en clair n'est jamais stockée). */
export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${ip}`).digest("hex");
}

export function quizUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/q/${token}`;
}
