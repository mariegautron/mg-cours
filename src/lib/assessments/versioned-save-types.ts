/** Résultat d'un enregistrement de champ (partagé entre serveur et navigateur). */
export type SaveFieldResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; version: number; theirs: string }
  | { ok: false; conflict?: false; error: string };
