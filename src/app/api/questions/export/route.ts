import { filterQuestions, readQuestionFilters } from "@/lib/questions/filter";
import { toMoodleXml } from "@/lib/questions/moodle-xml";
import { listQuestions, toQuestionInput } from "@/lib/questions/queries";

export const runtime = "nodejs";

/** Export Moodle XML des questions correspondant aux filtres (toute la banque active sans filtre). */
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const questions = filterQuestions(await listQuestions(), readQuestionFilters(params));
  if (questions.length === 0) return new Response("Aucune question à exporter", { status: 409 });
  return new Response(toMoodleXml(questions.map(toQuestionInput)), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": 'attachment; filename="banque-questions.xml"',
    },
  });
}
