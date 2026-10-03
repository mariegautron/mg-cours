import { describe, expect, it } from "vitest";

import { isoToParisLocal, parisLocalToIso, rulesFromJson, validateQuizConfig } from "./config";
import {
  availablePerRule,
  drawQuiz,
  DrawError,
  quizTotalPoints,
  reuseNotice,
  shortages,
} from "./draw";
import { gradeAttempt, gradeQuestion, parseNumber, readAnswer, buildReview } from "./grading";
import { linksCsv, inviteText } from "./links";
import { rngFromSeed, shuffled } from "./rng";
import { generateToken, hashIp, hashToken, isWellFormedToken, quizUrl } from "./token";
import type { BankQuestion, DrawnQuestion, DrawRule } from "./types";
import { familyClosedReason } from "./visibility";

const bankQ = (i: number, over: Partial<BankQuestion> = {}): BankQuestion => ({
  id: `q${i}`,
  category: "Scrum",
  name: `Q${i}`,
  type: "single_choice",
  statement: `Question ${i}`,
  generalFeedback: `Retour ${i}`,
  tags: [],
  numericValue: null,
  numericTolerance: null,
  choices: [
    { text: "A", fraction: 1, feedback: "Oui" },
    { text: "B", fraction: 0, feedback: "" },
    { text: "C", fraction: 0, feedback: "" },
  ],
  ...over,
});

const scrum = Array.from({ length: 12 }, (_, i) => bankQ(i + 1));
const open = Array.from({ length: 4 }, (_, i) =>
  bankQ(100 + i, { category: "Web", type: "open", choices: [] }),
);
const bank = [...scrum, ...open];
const rules: DrawRule[] = [
  { category: "Scrum", tags: [], types: [], count: 5, pointsEach: 1 },
  { category: "Web", tags: [], types: ["open"], count: 2, pointsEach: 3 },
];
const base = { rules, bank, shuffleQuestions: true, shuffleChoices: true };

describe("token", () => {
  it("256 bits, base64url, bien formé, haché en SHA-256 hex, jamais deux fois le même", () => {
    const t = generateToken();
    expect(t).toHaveLength(43);
    expect(isWellFormedToken(t)).toBe(true);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toContain(t);
    expect(new Set(Array.from({ length: 200 }, generateToken)).size).toBe(200);
  });

  it("refuse les jetons mal formés", () => {
    for (const bad of [
      "",
      "abc",
      "x".repeat(42),
      "x".repeat(44),
      `${"a".repeat(42)}!`,
      "../etc/passwd",
    ])
      expect(isWellFormedToken(bad)).toBe(false);
  });

  it("l'IP est salée puis hachée ; l'URL n'a qu'un jeton", () => {
    expect(hashIp("1.2.3.4", "s")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("1.2.3.4", "s")).not.toBe(hashIp("1.2.3.4", "autre"));
    expect(quizUrl("https://x.fr/", "T")).toBe("https://x.fr/q/T");
  });
});

describe("rng", () => {
  it("déterministe par graine, différent d'une graine à l'autre", () => {
    const a = Array.from({ length: 5 }, rngFromSeed("a"));
    expect(Array.from({ length: 5 }, rngFromSeed("a"))).toEqual(a);
    expect(Array.from({ length: 5 }, rngFromSeed("b"))).not.toEqual(a);
  });

  it("le mélange est une permutation", () => {
    const out = shuffled([1, 2, 3, 4, 5, 6], rngFromSeed("z"));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("drawQuiz", () => {
  it("tire le bon nombre par règle, points par règle, total identique pour tou·tes", () => {
    const r = drawQuiz({ ...base, seed: "s1" });
    expect(r.questions).toHaveLength(7);
    expect(r.questions.filter((q) => q.type === "open").every((q) => q.points === 3)).toBe(true);
    expect(r.questions.filter((q) => q.type !== "open").every((q) => q.points === 1)).toBe(true);
    expect(r.totalPoints).toBe(11);
    expect(quizTotalPoints(rules)).toBe(11);
    expect(new Set(r.questions.map((q) => q.question_id)).size).toBe(7);
  });

  it("figé : la même graine redonne exactement le même tirage", () => {
    expect(drawQuiz({ ...base, seed: "s1" })).toEqual(drawQuiz({ ...base, seed: "s1" }));
  });

  it("différent d'un·e étudiant·e à l'autre (graines différentes)", () => {
    const sets = Array.from({ length: 30 }, (_, i) =>
      drawQuiz({ ...base, seed: `etu${i}` })
        .questions.map((q) => q.question_id)
        .join(","),
    );
    expect(new Set(sets).size).toBeGreaterThan(20);
  });

  it("ordre des choix mélangé sans perdre les fractions ; vrai / faux gardé dans l'ordre", () => {
    const tf = bankQ(50, {
      type: "true_false",
      choices: [
        { text: "Vrai", fraction: 1, feedback: "" },
        { text: "Faux", fraction: 0, feedback: "" },
      ],
    });
    const r = drawQuiz({
      ...base,
      bank: [tf, ...scrum],
      rules: [{ category: null, tags: [], types: ["true_false"], count: 1, pointsEach: 1 }],
      seed: "x",
    });
    expect(r.questions[0].choices.map((c) => c.text)).toEqual(["Vrai", "Faux"]);
    const shuffledChoices = Array.from(
      { length: 20 },
      (_, i) =>
        drawQuiz({ ...base, seed: `c${i}` }).questions.find((q) => q.type === "single_choice")!
          .choices,
    );
    for (const choices of shuffledChoices) {
      expect(choices.find((c) => c.text === "A")!.fraction).toBe(1);
      expect(choices.filter((c) => c.fraction > 0)).toHaveLength(1);
    }
    expect(new Set(shuffledChoices.map((c) => c.map((x) => x.text).join(""))).size).toBeGreaterThan(
      1,
    );
  });

  it("filtre par catégorie, tags (tous requis, sans casse) et types", () => {
    const tagged = [
      bankQ(1, { tags: ["Agile", "rôles"] }),
      bankQ(2, { tags: ["agile"] }),
      bankQ(3),
    ];
    const rule: DrawRule = {
      category: null,
      tags: ["AGILE", "Rôles"],
      types: [],
      count: 1,
      pointsEach: 1,
    };
    expect(availablePerRule(tagged, [rule])).toEqual([1]);
    expect(
      drawQuiz({ ...base, bank: tagged, rules: [rule], seed: "t" }).questions[0].question_id,
    ).toBe("q1");
  });

  it("banque trop petite : erreur claire, sans tirage partiel", () => {
    const tooMany: DrawRule[] = [{ category: "Web", tags: [], types: [], count: 9, pointsEach: 1 }];
    expect(shortages(bank, tooMany)).toEqual([
      "Règle 1 : il faut 9 questions, la banque n’en a que 4 qui correspondent.",
    ]);
    expect(() => drawQuiz({ ...base, rules: tooMany, seed: "e" })).toThrow(DrawError);
  });

  it("deux règles sur les mêmes questions : une question ne sort qu'une fois", () => {
    const two: DrawRule[] = [
      { category: "Web", tags: [], types: [], count: 3, pointsEach: 1 },
      { category: "Web", tags: [], types: [], count: 3, pointsEach: 1 },
    ];
    expect(() => drawQuiz({ ...base, rules: two, seed: "d" })).toThrow(
      /ne reste que 1 question sur 3/,
    );
  });

  it("rattrapage : évite les questions déjà vues", () => {
    const seen = new Set(scrum.slice(0, 7).map((q) => q.id));
    for (let i = 0; i < 20; i++) {
      const r = drawQuiz({ ...base, seed: `r${i}`, seen });
      expect(r.reused).toBe(0);
      expect(
        r.questions.filter((q) => q.type !== "open").every((q) => !seen.has(q.question_id)),
      ).toBe(true);
    }
  });

  it("rattrapage : banque trop petite → complète avec des déjà vues et le dit, sans échouer", () => {
    const seen = new Set(scrum.slice(0, 9).map((q) => q.id));
    const r = drawQuiz({ ...base, seed: "small", seen });
    expect(r.questions).toHaveLength(7);
    expect(r.reused).toBe(2);
    expect(reuseNotice(r.reused, r.questions.length)).toBe("2 sur 7 déjà vues");
    expect(reuseNotice(0, 7)).toBeNull();
  });
});

const drawnQ = (over: Partial<DrawnQuestion>): DrawnQuestion => ({
  question_id: "x",
  type: "single_choice",
  statement: "?",
  points: 2,
  general_feedback: "",
  numeric_value: null,
  numeric_tolerance: null,
  choices: [
    { text: "A", fraction: 1, feedback: "" },
    { text: "B", fraction: 0, feedback: "" },
  ],
  ...over,
});

describe("gradeQuestion", () => {
  it("choix unique : bon = tous les points, faux ou plusieurs cases = 0", () => {
    const q = drawnQ({});
    expect(gradeQuestion(q, 1, { choices: [0] }).earned).toBe(2);
    expect(gradeQuestion(q, 1, { choices: [1] }).earned).toBe(0);
    expect(gradeQuestion(q, 1, { choices: [0, 1] }).earned).toBe(0);
    expect(gradeQuestion(q, 1, undefined).earned).toBe(0);
    expect(gradeQuestion(q, 1, { choices: [7] }).earned).toBe(0);
  });

  it("choix multiples : fractions, pénalités, bornée à [0, 1]", () => {
    const q = drawnQ({
      type: "multiple_choice",
      points: 4,
      choices: [
        { text: "A", fraction: 0.5, feedback: "" },
        { text: "B", fraction: 0.5, feedback: "" },
        { text: "C", fraction: -0.5, feedback: "" },
      ],
    });
    expect(gradeQuestion(q, 1, { choices: [0, 1] }).earned).toBe(4);
    expect(gradeQuestion(q, 1, { choices: [0] }).earned).toBe(2);
    expect(gradeQuestion(q, 1, { choices: [0, 2] }).earned).toBe(0);
    expect(gradeQuestion(q, 1, { choices: [2] }).earned).toBe(0);
    expect(gradeQuestion(q, 1, { choices: [0, 1, 2] }).earned).toBe(2);
  });

  it("vrai / faux", () => {
    const q = drawnQ({
      type: "true_false",
      choices: [
        { text: "Vrai", fraction: 0, feedback: "" },
        { text: "Faux", fraction: 1, feedback: "" },
      ],
    });
    expect(gradeQuestion(q, 1, { choices: [1] }).earned).toBe(2);
    expect(gradeQuestion(q, 1, { choices: [0] }).earned).toBe(0);
  });

  it("numérique : tolérance, virgule décimale, illisible = 0", () => {
    const q = drawnQ({
      type: "numerical",
      choices: [],
      numeric_value: 4.5,
      numeric_tolerance: 0.5,
    });
    expect(gradeQuestion(q, 1, { number: "4,5" }).earned).toBe(2);
    expect(gradeQuestion(q, 1, { number: " 5 " }).earned).toBe(2);
    expect(gradeQuestion(q, 1, { number: "5.01" }).earned).toBe(0);
    expect(gradeQuestion(q, 1, { number: "beaucoup" }).earned).toBe(0);
    expect(gradeQuestion(q, 1, { number: "" }).earned).toBe(0);
    expect(parseNumber("1 000,25")).toBe(1000.25);
    expect(parseNumber("1e3")).toBeNull();
  });

  it("réponse libre : en attente, puis note relue bornée au barème", () => {
    const q = drawnQ({ type: "open", choices: [], points: 3 });
    expect(gradeQuestion(q, 1, { text: "…" })).toMatchObject({ earned: null, pending: true });
    expect(gradeQuestion(q, 1, { text: "…" }, 2.5)).toMatchObject({ earned: 2.5, pending: false });
    expect(gradeQuestion(q, 1, { text: "…" }, 99).earned).toBe(3);
    expect(gradeQuestion(q, 1, { text: "…" }, -4).earned).toBe(0);
  });

  it("une réponse mal formée venue du navigateur ne plante pas et vaut 0", () => {
    const q = drawnQ({});
    for (const bad of [
      null,
      42,
      "x",
      [],
      { choices: "0" },
      { choices: [null, {}, 1.5] },
      { text: 1 },
    ])
      expect(gradeQuestion(q, 1, bad).earned).toBe(0);
    expect(readAnswer({ choices: [0, 0, 1] }, q)).toEqual({ choices: [0, 1] });
  });
});

describe("gradeAttempt", () => {
  const drawn = [
    drawnQ({}),
    drawnQ({ type: "open", choices: [], points: 3 }),
    drawnQ({ points: 1 }),
  ];

  it("note partielle tant qu'une réponse libre n'est pas relue ; complète ensuite", () => {
    const answers = { "1": { choices: [0] }, "2": { text: "x" }, "3": { choices: [1] } };
    const partial = gradeAttempt(drawn, answers);
    expect(partial).toMatchObject({ score: 2, autoScore: 2, totalPoints: 6, complete: false });
    const done = gradeAttempt(drawn, answers, { "2": 2 });
    expect(done).toMatchObject({ score: 4, autoScore: 2, complete: true });
  });

  it("le corrigé indique bonnes réponses, ce qui a été coché et les retours", () => {
    const d = [
      drawnQ({
        choices: [
          { text: "A", fraction: 1, feedback: "Oui" },
          { text: "B", fraction: 0, feedback: "Non" },
        ],
        general_feedback: "Retour",
      }),
    ];
    const answers = { "1": { choices: [1] } };
    const review = buildReview(d, gradeAttempt(d, answers).questions, answers);
    expect(review[0]).toMatchObject({
      correct: [0],
      chosen: [1],
      feedback: ["Non"],
      general_feedback: "Retour",
      earned: 0,
      max: 2,
    });
  });
});

describe("visibilité du corrigé", () => {
  it("caché tant qu'un QCM (rattrapage compris) n'est pas clôturé", () => {
    expect(
      familyClosedReason({
        statuses: ["closed", "published"],
        excusedCount: 0,
        hasMakeupQuiz: true,
      }),
    ).toMatch(/1 QCM/);
    expect(
      familyClosedReason({ statuses: ["closed", "draft"], excusedCount: 1, hasMakeupQuiz: true }),
    ).toMatch(/1 QCM/);
  });

  it("caché si des absent·es excusé·es n'ont pas de rattrapage", () => {
    expect(
      familyClosedReason({ statuses: ["closed"], excusedCount: 2, hasMakeupQuiz: false }),
    ).toMatch(/2 absent·es excusé·es/);
  });

  it("visible quand tout est clôturé", () => {
    expect(
      familyClosedReason({ statuses: ["closed"], excusedCount: 0, hasMakeupQuiz: false }),
    ).toBeNull();
    expect(
      familyClosedReason({ statuses: ["closed", "closed"], excusedCount: 2, hasMakeupQuiz: true }),
    ).toBeNull();
  });
});

describe("configuration", () => {
  const ok = {
    title: "QCM 1",
    instructions: "",
    durationMinutes: 30,
    opensAt: null,
    closesAt: null,
    showResults: "after_close" as const,
    shuffleQuestions: true,
    shuffleChoices: true,
    rules,
  };

  it("valide une configuration correcte", () => {
    expect(validateQuizConfig(ok)).toEqual([]);
  });

  it("dit ce qui ne va pas, en tutoyant", () => {
    const errors = validateQuizConfig({
      ...ok,
      title: " ",
      durationMinutes: 900,
      opensAt: "2026-10-12T10:00:00Z",
      closesAt: "2026-10-12T09:00:00Z",
      rules: [{ category: null, tags: [], types: [], count: 0, pointsEach: -1 }],
    });
    expect(errors).toHaveLength(5);
    expect(errors.join(" ")).not.toMatch(/\bvous\b|\bvotre\b/i);
    expect(validateQuizConfig({ ...ok, rules: [] })).toEqual([
      "Ajoute au moins une règle de tirage.",
    ]);
  });

  it("lit les règles du formulaire sans se fier au contenu", () => {
    expect(
      rulesFromJson(
        '[{"category":" Scrum ","tags":["a",1,""],"types":["open","zzz"],"count":"5","pointsEach":"1,5"}]',
      ),
    ).toEqual([{ category: "Scrum", tags: ["a"], types: ["open"], count: 5, pointsEach: 1.5 }]);
    expect(rulesFromJson("pas du json")).toEqual([]);
    expect(rulesFromJson('{"a":1}')).toEqual([]);
  });

  it("dates saisies à Paris, heure d'été comprise", () => {
    expect(parisLocalToIso("2026-10-12T09:30")).toBe("2026-10-12T07:30:00.000Z");
    expect(parisLocalToIso("2026-12-01T09:30")).toBe("2026-12-01T08:30:00.000Z");
    expect(isoToParisLocal("2026-10-12T07:30:00.000Z")).toBe("2026-10-12T09:30");
    expect(parisLocalToIso("n'importe quoi")).toBeNull();
    expect(isoToParisLocal(null)).toBe("");
  });
});

describe("liens personnels", () => {
  it("CSV lisible seul : BOM, « ; », guillemets, formules neutralisées", () => {
    const csv = linksCsv([
      { lastName: "=cmd", firstName: 'Ana "A"', email: null, url: "https://x.fr/q/T" },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Nom";"Prénom";"E-mail";"Lien personnel"');
    expect(csv).toContain(`"'=cmd";"Ana ""A""";"";"https://x.fr/q/T"`);
  });

  it("l'e-mail vouvoie et rappelle que le lien est personnel", () => {
    const text = inviteText({
      firstName: "Ana",
      quizTitle: "QCM 1",
      url: "https://x.fr/q/T",
      opensAt: null,
      closesAt: null,
      durationMinutes: 30,
    });
    expect(text).toContain("Ce lien est personnel : ne le partagez pas.");
    expect(text).toContain("Durée : 30 minutes");
    expect(text).toMatch(/\bvotre\b/i);
    expect(text).not.toMatch(/\bton\b|\btes\b|\bpartage pas\b/i);
  });
});
