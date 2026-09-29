/**
 * US-66 : trombinoscope. Règles pures : formats et taille, reconnaissance de l'image par ses
 * premiers octets (jamais par l'extension), rapprochement des fichiers d'un zip avec les numéros
 * étudiants.
 */

export const STUDENT_PHOTOS_BUCKET = "student-photos";
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const ZIP_MAX_BYTES = 30 * 1024 * 1024;
export const ZIP_MAX_ENTRIES = 500;

export type PhotoMime = "image/jpeg" | "image/png" | "image/webp";

const EXTENSIONS: Record<PhotoMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Type d'image d'après les premiers octets ; `null` si ce n'est ni JPEG, ni PNG, ni WebP. */
export function sniffPhotoMime(bytes: Uint8Array): PhotoMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function photoExtension(mime: PhotoMime): string {
  return EXTENSIONS[mime];
}

/** Chemin de stockage ; le suffixe aléatoire évite qu'un navigateur garde l'ancienne photo. */
export function photoPath(ownerId: string, studentId: string, mime: PhotoMime, token: string) {
  return `${ownerId}/${studentId}/${token}.${photoExtension(mime)}`;
}

export type PhotoCheck = { ok: true; mime: PhotoMime } | { ok: false; error: string };

/** Vérifie une photo : taille puis type réel. */
export function checkPhoto(bytes: Uint8Array): PhotoCheck {
  if (bytes.length === 0) return { ok: false, error: "Le fichier est vide." };
  if (bytes.length > PHOTO_MAX_BYTES) {
    return { ok: false, error: "La photo dépasse 2 Mo." };
  }
  const mime = sniffPhotoMime(bytes);
  if (!mime) return { ok: false, error: "Format non accepté (JPEG, PNG ou WebP)." };
  return { ok: true, mime };
}

/** Numéro étudiant d'un nom de fichier : « photos/A12345.JPG » → « a12345 ». */
export function studentNumberFromFilename(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? "";
  return base
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase();
}

/** Entrées à ignorer dans un zip : dossiers, fichiers cachés, métadonnées macOS. */
export function isIgnoredZipEntry(path: string): boolean {
  if (path.endsWith("/")) return true;
  if (path.startsWith("__MACOSX/") || path.includes("/__MACOSX/")) return true;
  const base = path.split("/").pop() ?? "";
  return base.startsWith(".") || base === "Thumbs.db";
}

export interface ZipMatch<F> {
  matched: { studentId: string; name: string; file: F }[];
  /** Fichiers dont le nom ne correspond à aucun numéro étudiant. */
  unmatched: string[];
  /** Numéros portés par plusieurs étudiant·es : on n'affecte pas, faute de certitude. */
  ambiguous: string[];
}

/**
 * Rapproche des fichiers (nom → contenu) des étudiant·es par numéro étudiant, sans tenir compte de
 * la casse. Deux fichiers pour un même numéro : le dernier dans l'ordre des noms l'emporte.
 */
export function matchPhotosToStudents<F>(
  files: { name: string; file: F }[],
  students: { id: string; student_number: string | null }[],
): ZipMatch<F> {
  const byNumber = new Map<string, string[]>();
  for (const s of students) {
    const n = s.student_number?.trim().toLowerCase();
    if (n) byNumber.set(n, [...(byNumber.get(n) ?? []), s.id]);
  }

  const chosen = new Map<string, { studentId: string; name: string; file: F }>();
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  for (const f of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const number = studentNumberFromFilename(f.name);
    const ids = byNumber.get(number);
    if (!number || !ids) unmatched.push(f.name);
    else if (ids.length > 1) ambiguous.push(f.name);
    else chosen.set(ids[0], { studentId: ids[0], name: f.name, file: f.file });
  }
  return { matched: [...chosen.values()], unmatched, ambiguous };
}

/** « 12 photos ajoutées ; 2 fichiers sans numéro correspondant. » */
export function describePhotoImport(r: {
  added: number;
  unmatched: number;
  ambiguous: number;
  rejected: number;
}): string {
  const parts = [`${r.added} photo${r.added > 1 ? "s" : ""} ajoutée${r.added > 1 ? "s" : ""}`];
  if (r.unmatched) {
    parts.push(
      `${r.unmatched} fichier${r.unmatched > 1 ? "s" : ""} sans numéro étudiant correspondant`,
    );
  }
  if (r.ambiguous) {
    parts.push(
      `${r.ambiguous} numéro${r.ambiguous > 1 ? "s" : ""} porté${r.ambiguous > 1 ? "s" : ""} par plusieurs étudiant·es`,
    );
  }
  if (r.rejected) {
    parts.push(
      `${r.rejected} fichier${r.rejected > 1 ? "s" : ""} refusé${r.rejected > 1 ? "s" : ""} (format ou taille)`,
    );
  }
  return `${parts.join(" ; ")}.`;
}

/** Initiales d'un nom pour l'avatar de secours. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}
