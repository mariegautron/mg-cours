import { describe, expect, it } from "vitest";

import { resultsEmailSubject, resultsEmailText } from "./results-email";
import type { ResultSheet } from "./results";

const sheet = (over: Partial<ResultSheet> = {}): ResultSheet => ({
  recipients: [{ name: "Lea Test", firstName: "Lea", email: "lea@x.fr" }],
  title: "Évaluation individuelle",
  isGroupGrade: false,
  subject: null,
  theme: null,
  moduleName: "Accessibilité",
  date: null,
  value: 14,
  maxScore: 20,
  valueOn20: 14,
  criteria: [
    {
      label: "Structure",
      points: 4,
      max: 6,
      axis: null,
      reference: null,
      isBonus: false,
      autoValidated: false,
      level: { points: 4, description: "Structure globalement correcte." },
      levels: [],
      comment: "Le header manque.",
    },
  ],
  axes: [],
  overflow: null,
  attendance: "present",
  personalNote: null,
  strengths: "Code propre",
  progress: "Tu as progressé sur les labels.",
  feedback: null,
  comments: [],
  ...over,
});

describe("resultsEmailText", () => {
  it("tutoie, donne la note, le palier, le commentaire du critère, les points forts et les progrès", () => {
    const text = resultsEmailText(sheet(), "Lea");
    expect(text).toContain("Bonjour Lea,");
    expect(text).toContain("Voici ton résultat pour « Évaluation individuelle »");
    expect(text).toContain("Note : 14 / 20");
    expect(text).toContain("- Structure : 4 / 6");
    expect(text).toContain("Palier obtenu : Structure globalement correcte.");
    expect(text).toContain("Le header manque.");
    expect(text).toContain("Tes points forts :\nCode propre");
    expect(text).toContain("Tes progrès :\nTu as progressé sur les labels.");
    expect(text).not.toMatch(/\bvous\b|\bvotre\b|\bvos\b/i);
  });

  it("absence excusée : mention claire, pas de note ni de détail", () => {
    const text = resultsEmailText(
      sheet({ attendance: "absent_excused", value: null, valueOn20: null }),
      "Lea",
    );
    expect(text).toContain("Ton absence est excusée");
    expect(text).toContain("Ta note sera celle du rattrapage");
    expect(text).not.toContain("Note :");
    expect(text).not.toContain("Détail par critère");
  });

  it("absence non prévenue : note 0 expliquée, sans détail par critère", () => {
    const text = resultsEmailText(sheet({ attendance: "absent_unexcused", value: 0 }), "Lea");
    expect(text).toContain("Absence non prévenue");
    expect(text).toContain("Note : 0 / 20");
    expect(text).not.toContain("Détail par critère");
  });

  it("un mot pour la personne, sans changement de note", () => {
    const text = resultsEmailText(
      sheet({ isGroupGrade: true, value: 16, personalNote: "Très investi sur les tests." }),
    );
    expect(text).toContain("Un mot pour toi : Très investi sur les tests.");
    expect(text).not.toContain("Pondération");
  });

  it("absence excusée : garde la note du groupe, ou rattrapage selon la règle de l'école", () => {
    const keeps = resultsEmailText(
      sheet({ isGroupGrade: true, attendance: "absent_excused", value: 16 }),
    );
    expect(keeps).toContain("tu gardes la note du groupe");
    expect(keeps).toContain("Note : 16 / 20");
    const makeup = resultsEmailText(
      sheet({ isGroupGrade: true, attendance: "absent_excused", value: null }),
    );
    expect(makeup).toContain("Ta note sera celle du rattrapage");
  });

  it("le sujet de l'e-mail tutoie aussi", () => {
    expect(resultsEmailSubject({ title: "Oral" })).toBe("Tes résultats — Oral");
  });

  it("jamais de nom d'un·e autre étudiant·e dans le message", () => {
    const text = resultsEmailText(
      sheet({
        isGroupGrade: true,
        recipients: [
          { name: "Lea Test", firstName: "Lea", email: "lea@x.fr" },
          { name: "Noa Autre", firstName: "Noa", email: "noa@x.fr" },
        ],
      }),
      "Lea",
    );
    expect(text).not.toContain("Noa");
  });
});
