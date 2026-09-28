/** US-59: Planning a la creation du module.
 * Parseur pur pour les creneaux de planning (formats FR toleres).
 * Une ligne par creneau -> seances vides creees d'un coup, numerotees.
 * 1re seance -> J-15 pour le calcul de l'echeance.
 */

/** Format de date FR : DD/MM/YYYY, DD/MM, DD-MM-YYYY, etc. */
export type DateString = string;

/** Format d'heure : HH:MM, HHhMM, HH h MM, etc. */
export type TimeString = string;

/** Une seance parsee depuis une ligne de planning. */
export interface ParsedSession {
  date: DateString;
  startTime: TimeString | null;
  endTime: TimeString | null;
  position: number;
}

/** Resultat du parsing : liste de seances ou erreur. */
export interface ParseResult {
  sessions: ParsedSession[];
  errors: string[];
}

/** Normalise une date FR en ISO (YYYY-MM-DD).
 * Accepte : DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD-MM-YY, DD.MM.YYYY
 */
export function normalizeDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();

  // DD/MM/YYYY ou DD/MM/YY
  const slashMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD-MM-YYYY ou DD-MM-YY
  const dashMatch = trimmed.match(/^(\d{1,2})[.-](\d{1,2})[.-](\d{2,4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD.MM.YYYY
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // DD/MM (sans annee) - on suppose annee courante
  const shortMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (shortMatch) {
    const [, day, month] = shortMatch;
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

/** Normalise une heure FR en HH:MM.
 * Accepte : HH:MM, HHhMM, HH h MM, HHh, HH h
 */
export function normalizeTime(timeStr: string): string | null {
  const trimmed = timeStr.trim().toLowerCase();

  // HH:MM
  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    const [, hours, minutes] = colonMatch;
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  // HHhMM ou HHh
  const hMatch = trimmed.match(/^(\d{1,2})h(\d{2})?$/);
  if (hMatch) {
    const [, hours, minutes = "00"] = hMatch;
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  // HH h MM ou HH h
  const spaceMatch = trimmed.match(/^(\d{1,2})\s+h\s+(\d{2})?$/);
  if (spaceMatch) {
    const [, hours, minutes = "00"] = spaceMatch;
    return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
  }

  // HH (seulement)
  const simpleMatch = trimmed.match(/^(\d{1,2})$/);
  if (simpleMatch) {
    const [, hours] = simpleMatch;
    return `${hours.padStart(2, "0")}:00`;
  }

  return null;
}

/** Parse une ligne de planning.
 * Formats attendus :
 * - Date HeureDebut-HeureFin
 * - Date HeureDebut HeureFin
 * - Date, HeureDebut-HeureFin
 * - Date HeureDebut
 * 
 * Exemples :
 * - "01/10/2026 10:00-12:00"
 * - "01/10 10h-12h"
 * - "01/10/2026, 10:00 12:00"
 * - "01-10-2026 10h00-12h00"
 */
export function parseScheduleLine(line: string, position: number): ParsedSession | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Nettoyer la ligne : remplacer les virgules par des espaces
  const cleaned = trimmed.replace(/,/g, " ");

  // Essayer de trouver la date d'abord
  // Formats de date : DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD.MM.YYYY
  const dateMatch = cleaned.match(/^(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})\s*/);
  if (!dateMatch) return null;

  const dateStr = dateMatch[1];
  const date = normalizeDate(dateStr);
  if (!date) return null;

  // Extraire la partie apres la date
  const afterDate = cleaned.slice(dateMatch[0].length).trim();
  if (!afterDate) {
    return { date, startTime: null, endTime: null, position };
  }

  // Parser les heures
  let startTime: TimeString | null = null;
  let endTime: TimeString | null = null;

  // Cas 1 : format "10h-12h" ou "10:00-12:00"
  const rangeMatch = afterDate.match(/^([\d:h]+)-([\d:h]+)$/);
  if (rangeMatch) {
    startTime = normalizeTime(rangeMatch[1]);
    endTime = normalizeTime(rangeMatch[2]);
  } else {
    // Cas 2 : format "10:00 12:00" (espace) ou "10h 12h"
    const parts = afterDate.split(/\s+/);
    if (parts.length === 2) {
      startTime = normalizeTime(parts[0]);
      endTime = normalizeTime(parts[1]);
    } else if (parts.length === 1) {
      // Cas 3 : une seule heure
      startTime = normalizeTime(parts[0]);
    }
  }

  return {
    date,
    startTime,
    endTime,
    position,
  };
}

/** Parse un texte de planning (plusieurs lignes).
 * Retourne la liste des seances parsees et les erreurs eventuelles.
 */
export function parseSchedule(text: string): ParseResult {
  const lines = text.split("\n");
  const sessions: ParsedSession[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const session = parseScheduleLine(line, i + 1);
    if (session) {
      sessions.push(session);
    } else {
      errors.push(`Ligne ${i + 1} : "${line}" - format invalide`);
    }
  }

  return { sessions, errors };
}

/** Valide que les seances sont dans l'ordre chronologique. */
export function validateSessionOrder(sessions: ParsedSession[]): string | null {
  for (let i = 1; i < sessions.length; i++) {
    const prevDate = sessions[i - 1].date;
    const currDate = sessions[i].date;

    if (currDate < prevDate) {
      return `Les seances ne sont pas dans l'ordre chronologique (ligne ${i + 1})`;
    }

    if (currDate === prevDate) {
      const prevEnd = sessions[i - 1].endTime;
      const currStart = sessions[i].startTime;

      if (prevEnd && currStart && currStart < prevEnd) {
        return `Chevauchement de seances le ${currDate} (ligne ${i + 1})`;
      }
    }
  }

  return null;
}
