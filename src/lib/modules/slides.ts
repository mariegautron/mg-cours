/** Lien de slides d'une séance : seul http(s) est accepté, jamais `javascript:` ni `data:`. */
export function cleanSlidesUrl(
  input: string,
): { ok: true; url: string | null } | { ok: false; error: string } {
  const raw = input.trim();
  if (!raw) return { ok: true, url: null };
  if (raw.length > 500)
    return { ok: false, error: "Le lien est trop long (500 caractères au plus)." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "Ce lien n’est pas valide." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Seuls les liens http et https sont acceptés." };
  }
  return { ok: true, url: parsed.toString() };
}
