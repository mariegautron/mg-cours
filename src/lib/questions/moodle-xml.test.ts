import { describe, expect, it } from "vitest";

import { categoryFromPath, parseMoodleXml, toMoodleXml } from "./moodle-xml";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
<question type="category"><category><text>$course$/top/Scrum</text></category></question>
<question type="multichoice">
  <name><text>SCRUM03_Roles</text></name>
  <questiontext format="html"><text><![CDATA[<p>Qui est <strong>responsable</strong> du backlog ?</p>]]></text></questiontext>
  <generalfeedback format="html"><text><![CDATA[<p>Le Product Owner.</p>]]></text></generalfeedback>
  <defaultgrade>2.0000000</defaultgrade>
  <single>true</single>
  <answer fraction="100" format="html"><text>Le Product Owner</text><feedback format="html"><text>Oui</text></feedback></answer>
  <answer fraction="0" format="html"><text>Le Scrum Master</text><feedback format="html"><text></text></feedback></answer>
</question>
<question type="multichoice">
  <name><text>SCRUM04_Events</text></name>
  <questiontext format="html"><text>&lt;p&gt;Quels &amp;lt;evenements&amp;gt; ?&lt;/p&gt;</text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1</defaultgrade>
  <single>false</single>
  <answer fraction="50"><text>Daily</text></answer>
  <answer fraction="50"><text>Review</text></answer>
  <answer fraction="-50"><text>Ménage</text></answer>
</question>
<question type="truefalse">
  <name><text>TF1</text></name>
  <questiontext format="html"><text><![CDATA[<p>Le sprint dure au plus un mois.</p>]]></text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1</defaultgrade>
  <answer fraction="100"><text>true</text></answer>
  <answer fraction="0"><text>false</text></answer>
</question>
<question type="numerical">
  <name><text>NUM1</text></name>
  <questiontext format="html"><text><![CDATA[<p>Combien de niveaux de ratio ?</p>]]></text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1</defaultgrade>
  <answer fraction="100"><text>4,5</text><tolerance>0.5</tolerance></answer>
</question>
<question type="essay">
  <name><text>ESSAY1</text></name>
  <questiontext format="html"><text><![CDATA[<p>Explique le RGAA.</p>]]></text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>3</defaultgrade>
</question>
<question type="shortanswer">
  <name><text>SHORT1</text></name>
  <questiontext format="html"><text>x</text></questiontext>
</question>
</quiz>`;

describe("parseMoodleXml", () => {
  const { questions, skipped } = parseMoodleXml(XML);

  it("lit catégorie, nom, énoncé en Markdown, retour général et points", () => {
    expect(questions[0]).toMatchObject({
      category: "Scrum",
      name: "SCRUM03_Roles",
      type: "single_choice",
      statement: "Qui est **responsable** du backlog ?",
      generalFeedback: "Le Product Owner.",
      defaultPoints: 2,
    });
    expect(questions[0].choices.map((c) => [c.text, c.fraction, c.feedback])).toEqual([
      ["Le Product Owner", 1, "Oui"],
      ["Le Scrum Master", 0, ""],
    ]);
  });

  it("choix multiples : fractions conservées, négatives comprises ; XML puis HTML échappés décodés", () => {
    expect(questions[1].type).toBe("multiple_choice");
    expect(questions[1].statement).toBe("Quels <evenements> ?");
    expect(questions[1].choices.map((c) => c.fraction)).toEqual([0.5, 0.5, -0.5]);
  });

  it("vrai / faux : Vrai puis Faux, la bonne réponse suit le XML", () => {
    expect(questions[2].type).toBe("true_false");
    expect(questions[2].choices.map((c) => [c.text, c.fraction])).toEqual([
      ["Vrai", 1],
      ["Faux", 0],
    ]);
  });

  it("numérique : valeur (virgule décimale) et tolérance", () => {
    expect(questions[3]).toMatchObject({
      type: "numerical",
      numericValue: 4.5,
      numericTolerance: 0.5,
    });
  });

  it("réponse libre sans choix", () => {
    expect(questions[4]).toMatchObject({ type: "open", choices: [], defaultPoints: 3 });
  });

  it("liste ce qu'elle ne reprend pas, sans l'importer à moitié", () => {
    expect(questions).toHaveLength(5);
    expect(skipped).toEqual([{ name: "SHORT1", reason: "type « shortanswer » non repris" }]);
  });
});

describe("categoryFromPath", () => {
  it("retire $course$ et top, garde la hiérarchie", () => {
    expect(categoryFromPath("$course$/top/Scrum/Rôles")).toBe("Scrum / Rôles");
    expect(categoryFromPath("$course$/top")).toBe("");
  });
});

describe("export puis import", () => {
  it("redonne les mêmes questions", () => {
    const original = parseMoodleXml(XML).questions;
    const again = parseMoodleXml(toMoodleXml(original));
    expect(again.skipped).toEqual([]);
    expect(again.questions).toEqual(original);
  });

  it("le code et les caractères spéciaux survivent à l'aller-retour", () => {
    const q = {
      category: "Web",
      name: "CODE1",
      type: "open" as const,
      statement: "Que fait `<button>` ?\n\n```\nif (a < b && c) {}\n```",
      generalFeedback: "",
      defaultPoints: 1,
      tags: ["html", "a11y"],
      choices: [],
      numericValue: null,
      numericTolerance: null,
    };
    expect(parseMoodleXml(toMoodleXml([q])).questions).toEqual([q]);
  });
});
