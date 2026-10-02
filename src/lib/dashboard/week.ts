import { daysBetween } from "./todo";

export interface WeekDay<C> {
  date: string;
  /** « LUN »… « VEN ». */
  label: string;
  /** Numéro du jour dans le mois. */
  day: number;
  isToday: boolean;
  courses: C[];
}

const LABELS = ["LUN", "MAR", "MER", "JEU", "VEN"];

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/**
 * Frise de la semaine, du lundi au vendredi. Le week-end, on montre la semaine qui vient (la
 * semaine écoulée n'a plus rien à dire). `courses` : séances datées, rangées par jour.
 */
export function weekDays<C extends { session_date: string | null }>(
  today: string,
  courses: C[],
): { days: WeekDay<C>[]; nextWeek: boolean } {
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche
  const weekend = dow === 0 || dow === 6;
  const monday = addDays(today, weekend ? (dow === 6 ? 2 : 1) : -(dow - 1));
  return {
    nextWeek: weekend,
    days: LABELS.map((label, i) => {
      const date = addDays(monday, i);
      return {
        date,
        label,
        day: Number(date.slice(8)),
        isToday: date === today,
        courses: courses.filter((c) => c.session_date === date),
      };
    }),
  };
}

/** Premier et dernier jour affichés, pour borner la requête. */
export function weekRange(today: string): { from: string; to: string } {
  const { days } = weekDays(today, []);
  return { from: days[0].date, to: days[4].date };
}

export { daysBetween };
