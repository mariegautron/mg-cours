import { decodeEntities, htmlToMarkdown, markdownToHtml } from "@/lib/questions/html";
import type { ChoiceInput, QuestionInput, QuestionType } from "@/lib/questions/types";
import { TRUE_FALSE_LABELS } from "@/lib/questions/validate";

/**
 * Import / export du format « Moodle XML » (export standard d'une banque de questions).
 * Types repris : multichoice, truefalse, numerical, essay. Les autres (réponse courte, association,
 * cloze…) sont listés dans `skipped` avec leur nom, jamais importés à moitié.
 */

export interface ParsedBank {
  questions: QuestionInput[];
  skipped: { name: string; reason: string }[];
}

/** Contenu de `<text>` : CDATA tel quel, sinon XML échappé (décodé une fois). */
function textOf(xml: string, tag: string): string {
  const block = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1] ?? "";
  const inner = /<text>([\s\S]*?)<\/text>/.exec(block)?.[1] ?? "";
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(inner);
  return (cdata ? cdata[1] : decodeEntities(inner)).trim();
}

function plain(xml: string, tag: string): string {
  return (new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(xml)?.[1] ?? "").trim();
}

function toMarkdown(html: string): string {
  return htmlToMarkdown(html);
}

/** `$course$/top/Scrum/Rôles` → `Scrum / Rôles`. */
export function categoryFromPath(path: string): string {
  const parts = path
    .trim()
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== "$course$" && p !== "top" && !/^\$.*\$$/.test(p));
  return parts.join(" / ");
}

const num = (s: string, fallback: number) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export function parseMoodleXml(xml: string): ParsedBank {
  const questions: QuestionInput[] = [];
  const skipped: ParsedBank["skipped"] = [];
  let category = "";

  for (const m of xml.matchAll(/<question\s+type="([^"]+)"\s*>([\s\S]*?)<\/question>/g)) {
    const [, moodleType, body] = m;
    if (moodleType === "category") {
      category = categoryFromPath(textOf(body, "category"));
      continue;
    }
    const name = decodeEntities(textOf(body, "name")) || "Sans nom";
    const statement = toMarkdown(textOf(body, "questiontext"));
    const answers = [...body.matchAll(/<answer\s+([^>]*)>([\s\S]*?)<\/answer>/g)].map((a) => ({
      fraction: num(/fraction="([^"]*)"/.exec(a[1])?.[1] ?? "0", 0) / 100,
      text: (/<text>([\s\S]*?)<\/text>/.exec(a[2])?.[1] ?? "").trim(),
      feedback: toMarkdown(textOf(a[2], "feedback")),
      tolerance: plain(a[2], "tolerance"),
    }));
    const answerText = (a: (typeof answers)[number]) => {
      const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(a.text);
      return cdata ? cdata[1].trim() : decodeEntities(a.text);
    };

    const base = {
      category,
      name,
      statement,
      generalFeedback: toMarkdown(textOf(body, "generalfeedback")),
      defaultPoints: num(plain(body, "defaultgrade") || "1", 1),
      tags: [...body.matchAll(/<tag>\s*<text>([^<]*)<\/text>\s*<\/tag>/g)].map((t) =>
        decodeEntities(t[1]).trim(),
      ),
      numericValue: null,
      numericTolerance: null,
    };
    let type: QuestionType;
    let choices: ChoiceInput[] = [];
    let numericValue: number | null = null;
    let numericTolerance: number | null = null;

    if (moodleType === "multichoice") {
      choices = answers.map((a) => ({
        text: toMarkdown(answerText(a)),
        fraction: Math.max(-1, Math.min(1, a.fraction)),
        feedback: a.feedback,
      }));
      const single = plain(body, "single") !== "false";
      type = single ? "single_choice" : "multiple_choice";
    } else if (moodleType === "truefalse") {
      type = "true_false";
      const trueAnswer = answers.find((a) => answerText(a).toLowerCase() === "true");
      choices = TRUE_FALSE_LABELS.map((text, i) => ({
        text,
        fraction: (i === 0) === (trueAnswer?.fraction ?? 0) > 0 ? 1 : 0,
        feedback: "",
      }));
    } else if (moodleType === "numerical") {
      type = "numerical";
      const best = answers.find((a) => a.fraction > 0) ?? answers[0];
      const value = best ? num(answerText(best), NaN) : NaN;
      if (!Number.isFinite(value)) {
        skipped.push({ name, reason: "réponse numérique illisible" });
        continue;
      }
      numericValue = value;
      numericTolerance = best.tolerance ? Math.abs(num(best.tolerance, 0)) : null;
    } else if (moodleType === "essay") {
      type = "open";
    } else {
      skipped.push({ name, reason: `type « ${moodleType} » non repris` });
      continue;
    }
    questions.push({ ...base, type, choices, numericValue, numericTolerance });
  }
  return { questions, skipped };
}

const cdata = (html: string) => `<![CDATA[${html.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
const textEl = (html: string) => `<text>${cdata(html)}</text>`;
const xmlText = (s: string) => `<text>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;

/** Banque → Moodle XML, regroupée par catégorie (réimportable, y compris par Moodle). */
export function toMoodleXml(questions: readonly QuestionInput[]): string {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>', "<quiz>"];
  let current: string | null = null;
  for (const q of questions) {
    if (q.category !== current) {
      current = q.category;
      out.push(
        `<question type="category"><category>${xmlText(`$course$/top/${q.category.replace(/ \/ /g, "/") || "Divers"}`)}</category></question>`,
      );
    }
    const type = {
      single_choice: "multichoice",
      multiple_choice: "multichoice",
      true_false: "truefalse",
      numerical: "numerical",
      open: "essay",
    }[q.type];
    const lines = [
      `<question type="${type}">`,
      `<name>${xmlText(q.name)}</name>`,
      `<questiontext format="html">${textEl(markdownToHtml(q.statement))}</questiontext>`,
      `<generalfeedback format="html">${textEl(markdownToHtml(q.generalFeedback))}</generalfeedback>`,
      `<defaultgrade>${q.defaultPoints}</defaultgrade>`,
    ];
    if (q.tags.length)
      lines.push(`<tags>${q.tags.map((t) => `<tag>${xmlText(t)}</tag>`).join("")}</tags>`);
    if (q.type === "single_choice" || q.type === "multiple_choice") {
      lines.push(
        `<single>${q.type === "single_choice"}</single>`,
        "<shuffleanswers>1</shuffleanswers>",
      );
      for (const c of q.choices)
        lines.push(
          `<answer fraction="${Math.round(c.fraction * 10000) / 100}" format="html">${textEl(markdownToHtml(c.text))}<feedback format="html">${textEl(markdownToHtml(c.feedback))}</feedback></answer>`,
        );
    } else if (q.type === "true_false") {
      const trueIsCorrect = (q.choices[0]?.fraction ?? 0) > 0;
      lines.push(
        `<answer fraction="${trueIsCorrect ? 100 : 0}">${xmlText("true")}</answer>`,
        `<answer fraction="${trueIsCorrect ? 0 : 100}">${xmlText("false")}</answer>`,
      );
    } else if (q.type === "numerical") {
      lines.push(
        `<answer fraction="100">${xmlText(String(q.numericValue))}<tolerance>${q.numericTolerance ?? 0}</tolerance></answer>`,
      );
    }
    lines.push("</question>");
    out.push(lines.join("\n"));
  }
  out.push("</quiz>");
  return out.join("\n");
}
