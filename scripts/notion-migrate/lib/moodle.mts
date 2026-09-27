// Lecture d'une sauvegarde de cours Moodle (.mbz = tar.gz de XML), sans données utilisateurs.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface MoodleActivity {
  id: string;
  module: string; // url, resource, assign, folder…
  name: string;
  sectionId: string;
  externalUrl: string | null;
  visible: boolean;
}

export interface MoodleCourse {
  shortname: string;
  fullname: string;
  sections: { id: string; number: number; name: string; sequence: string[] }[];
  activities: Map<string, MoodleActivity>;
  groups: string[];
  /** Contenu brut de `questions.xml` (banque de questions), vide si absent. */
  questionsXml: string;
}

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");

function tag(xml: string, name: string): string {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]).trim() : "";
}

export function readMoodleBackup(mbzPath: string): MoodleCourse {
  const dir = mkdtempSync(join(tmpdir(), "mbz-"));
  execFileSync("tar", ["-xzf", mbzPath, "-C", dir]);

  const course = readFileSync(join(dir, "course/course.xml"), "utf8");

  const sections = readdirSync(join(dir, "sections")).map((s) => {
    const xml = readFileSync(join(dir, "sections", s, "section.xml"), "utf8");
    return {
      id: /<section id="(\d+)"/.exec(xml)?.[1] ?? "",
      number: Number(tag(xml, "number")),
      name: tag(xml, "name"),
      sequence: tag(xml, "sequence").split(",").filter(Boolean),
    };
  });

  const activities = new Map<string, MoodleActivity>();
  for (const a of readdirSync(join(dir, "activities"))) {
    const [module, id] = [a.slice(0, a.lastIndexOf("_")), a.slice(a.lastIndexOf("_") + 1)];
    const moduleXml = readFileSync(join(dir, "activities", a, "module.xml"), "utf8");
    const actFile = join(dir, "activities", a, `${module}.xml`);
    const actXml = existsSync(actFile) ? readFileSync(actFile, "utf8") : "";
    activities.set(id, {
      id,
      module,
      name: tag(actXml, "name"),
      sectionId: tag(moduleXml, "sectionid"),
      externalUrl: module === "url" ? tag(actXml, "externalurl") || null : null,
      visible: tag(moduleXml, "visible") === "1",
    });
  }

  const groupsXml = readFileSync(join(dir, "groups.xml"), "utf8");
  const groups = [...groupsXml.matchAll(/<group id="\d+">[\s\S]*?<name>([\s\S]*?)<\/name>/g)].map(
    (m) => decode(m[1]).trim(),
  );

  return {
    shortname: tag(course, "shortname"),
    fullname: tag(course, "fullname"),
    sections,
    activities,
    groups,
    questionsXml: existsSync(join(dir, "questions.xml"))
      ? readFileSync(join(dir, "questions.xml"), "utf8")
      : "",
  };
}

/** Activités d'une section, dans l'ordre d'affichage Moodle. */
export function sectionActivities(course: MoodleCourse, sectionName: string): MoodleActivity[] {
  const section = course.sections.find((s) => s.name.trim() === sectionName);
  if (!section) throw new Error(`Section Moodle « ${sectionName} » introuvable`);
  return section.sequence.map((id) => course.activities.get(id)).filter((a) => a !== undefined);
}
