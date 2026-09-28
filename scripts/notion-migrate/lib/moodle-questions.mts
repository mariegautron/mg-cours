// Banque de questions Moodle (questions.xml d'une sauvegarde) → Markdown lisible, avec bonnes
// réponses et retours. En attendant une vraie banque de questions dans MG COURS
// (docs/specs/qcm-banque-questions.md), elle est importée comme ressource.

export interface MoodleQuestion {
  category: string;
  name: string;
  type: string;
  text: string;
  feedback: string;
  points: number;
  answers: { text: string; fraction: number; feedback: string }[];
  tolerance: number | null;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

function tag(xml: string, name: string): string {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  const v = m ? m[1].trim() : "";
  return v === "$@NULL@$" ? "" : v;
}

/** HTML Moodle (échappé dans le XML) → Markdown simple. */
export function htmlToMarkdown(escaped: string): string {
  return decode(escaped)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\s*(b|strong)\s*>([\s\S]*?)<\/\s*(b|strong)\s*>/gi, "**$2**")
    .replace(/<\s*(i|em)\s*>([\s\S]*?)<\/\s*(i|em)\s*>/gi, "*$2*")
    .replace(/<\s*code\s*>([\s\S]*?)<\/\s*code\s*>/gi, "`$1`")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const TYPE_LABELS: Record<string, string> = {
  multichoice: "choix multiple",
  truefalse: "vrai / faux",
  numerical: "numérique",
  essay: "question ouverte",
  shortanswer: "réponse courte",
};

export function parseQuestionBank(xml: string): MoodleQuestion[] {
  const out: MoodleQuestion[] = [];
  const seen = new Set<string>();
  for (const cat of xml.split(/<question_category id="\d+">/).slice(1)) {
    const catName = decode(tag(cat.split("<question_bank_entries>")[0], "name"));
    const category = /^(top|Défaut pour)/i.test(catName) ? "Divers" : catName.replace(/_/g, " ");
    for (const q of cat.split(/<question id="\d+">/).slice(1)) {
      const body = q.split("</question>")[0];
      const name = decode(tag(body, "name"));
      const text = htmlToMarkdown(tag(body, "questiontext"));
      const key = `${name}|${text}`;
      if (!name || seen.has(key)) continue;
      seen.add(key);
      const answers = [...body.matchAll(/<answer id="\d+">([\s\S]*?)<\/answer>/g)].map((a) => ({
        text: htmlToMarkdown(tag(a[1], "answertext")),
        fraction: Number(tag(a[1], "fraction") || 0),
        feedback: htmlToMarkdown(tag(a[1], "feedback")),
      }));
      const tol = /<tolerance>([^<]*)<\/tolerance>/.exec(body)?.[1];
      out.push({
        category,
        name,
        type: tag(body, "qtype"),
        text,
        feedback: htmlToMarkdown(tag(body, "generalfeedback")),
        points: Number(tag(body, "defaultmark") || 1),
        answers,
        tolerance: tol && tol !== "$@NULL@$" ? Number(tol) : null,
      });
    }
  }
  return out;
}

export function questionBankMarkdown(title: string, questions: MoodleQuestion[]): string {
  const byCategory = new Map<string, MoodleQuestion[]>();
  for (const q of questions) byCategory.set(q.category, [...(byCategory.get(q.category) ?? []), q]);
  const parts = [
    `${questions.length} questions issues de la banque Moodle « ${title} », classées par thème. ✅ = bonne réponse.`,
  ];
  for (const [category, qs] of byCategory) {
    parts.push(`## ${category} (${qs.length})`);
    for (const q of qs) {
      const lines = [
        `### ${q.name}`,
        `*${TYPE_LABELS[q.type] ?? q.type} · ${q.points} pt${q.points > 1 ? "s" : ""}*`,
        "",
        q.text,
      ];
      if (q.answers.length) {
        lines.push("");
        for (const a of q.answers) {
          const mark = a.fraction > 0 ? "✅" : "❌";
          const partial =
            a.fraction > 0 && a.fraction < 1 ? ` (${Math.round(a.fraction * 100)} %)` : "";
          const tol = q.type === "numerical" && q.tolerance ? ` (± ${q.tolerance})` : "";
          lines.push(`- ${mark} ${a.text.replace(/\n+/g, " ")}${tol}${partial}`);
          if (a.feedback) lines.push(`  - *${a.feedback.replace(/\n+/g, " ")}*`);
        }
      }
      if (q.feedback) lines.push("", `> ${q.feedback.replace(/\n/g, "\n> ")}`);
      parts.push(lines.join("\n"));
    }
  }
  return parts.join("\n\n");
}

/**
 * Export « XHTML » d'une banque Moodle (quand la sauvegarde .mbz n'est pas disponible) :
 * énoncés et choix, **sans les bonnes réponses** (le format ne les contient pas).
 */
export function xhtmlQuestionBankMarkdown(
  title: string,
  html: string,
): { markdown: string; count: number } {
  const blocks = html.split(/<div class="question">/).slice(1);
  const parts: string[] = [];
  for (const b of blocks) {
    const body = b.split(/<\/div>\s*(?:<!--|$)/)[0];
    const name = htmlToMarkdown(/<h3>([\s\S]*?)<\/h3>/.exec(body)?.[1] ?? "").replace(/\n+/g, " ");
    const text = htmlToMarkdown(
      (/<p class="questiontext">([\s\S]*?)<\/p>\s*(?:<ul|<!--|$)/.exec(body)?.[1] ?? "").replace(
        /<img[^>]*>/g,
        "*(image dans Moodle)*",
      ),
    );
    const type = /export of essay/.test(body)
      ? "question ouverte"
      : /class="match"/.test(body)
        ? "association"
        : /class="truefalse"|type="radio"[^>]*value="(?:true|false)"/i.test(body)
          ? "vrai / faux"
          : /type="checkbox"/.test(body)
            ? "choix multiple"
            : "choix unique";
    const lines = [`### ${name}`, `*${type}*`, "", text];
    if (type === "association") {
      const stems = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) =>
        htmlToMarkdown(m[1]).replace(/\n+/g, " "),
      );
      const options = [
        ...new Set(
          [...body.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)]
            .map((m) => htmlToMarkdown(m[1]).trim())
            .filter((o) => o && !/^choisir/i.test(o)),
        ),
      ];
      if (stems.length) lines.push("", "Éléments :", ...stems.map((s) => `- ${s}`));
      if (options.length) lines.push("", "Propositions :", ...options.map((o) => `- ${o}`));
    } else {
      const choices = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)]
        .map((m) => htmlToMarkdown(m[1]).replace(/\n+/g, " ").trim())
        .filter(Boolean);
      if (choices.length) lines.push("", ...choices.map((c) => `- ○ ${c}`));
    }
    parts.push(lines.join("\n"));
  }
  return {
    count: parts.length,
    markdown: [
      `${parts.length} questions issues de la banque Moodle « ${title} » (export HTML : les bonnes réponses n'y figurent pas).`,
      ...parts,
    ].join("\n\n"),
  };
}
