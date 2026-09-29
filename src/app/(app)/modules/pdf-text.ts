import { extractText } from "unpdf";

// Les Server Actions de Vercel plafonnent le corps à ~4,5 Mo.
const MAX_BYTES = 4 * 1024 * 1024;

/** Texte d'un PDF déposé (contrôles de taille et de type compris), ou un message d'erreur. */
export async function readPdfText(
  file: FormDataEntryValue | null,
): Promise<{ text: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Choisis un fichier PDF." };
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (4 Mo maximum)." };
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    return { error: "Seuls les fichiers PDF sont lus." };
  }
  try {
    const result = await extractText(new Uint8Array(await file.arrayBuffer()), {
      mergePages: true,
    });
    if (result.text.trim().length < 20) {
      return { error: "Aucun texte trouvé (PDF scanné ?). Saisis les informations à la main." };
    }
    return { text: result.text };
  } catch {
    return { error: "Ce PDF n’a pas pu être lu." };
  }
}
