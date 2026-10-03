import { describe, expect, it } from "vitest";

import { averageScore, questionStats } from "./stats";

const q = (id: string, points = 1) => ({ question_id: id, statement: `Question ${id}`, points });

describe("questionStats", () => {
  it("classe les questions de la plus ratée à la mieux réussie", () => {
    const stats = questionStats([
      { drawn: [q("a"), q("b")], earned: [1, 0] },
      { drawn: [q("a"), q("b")], earned: [0, 0] },
      { drawn: [q("b")], earned: [1] },
    ]);
    expect(stats.map((s) => [s.questionId, s.percent])).toEqual([
      ["b", 33],
      ["a", 50],
    ]);
  });
  it("ignore les points pas encore corrigés", () => {
    const stats = questionStats([{ drawn: [q("a", 2)], earned: [null] }]);
    expect(stats[0]).toMatchObject({ percent: null, answered: 0 });
  });
});

describe("averageScore", () => {
  it("moyenne des notes présentes", () => {
    expect(averageScore([10, null, 15])).toBe(12.5);
    expect(averageScore([null])).toBeNull();
  });
});
