// Compléments 9 : nettoyage ciblé des ressources de « Gestion d'un projet IT » (GP 2025-26), pour
// qu'elles servent au Rapprochement du prochain module de gestion de projet (Agile / Scrum).
//  a) titres lisibles (espaces, ponctuation) ; doublons repérés (fusion proposée, rien supprimé) ;
//  b) type vérifié d'après les règles de classement (écarts signalés, vide complété) ;
//  c) état « à construire » pour une ressource vide ;
//  d) tags cohérents (minuscules) enrichis par mots-clés du titre, du contenu et des objectifs ;
//  e) Markdown normalisé (puces, titres, sauts de ligne) pour le découpage en diapositives ;
//  f) questions de la banque liées aux ressources du même thème (resource_question) ;
//  g) corrigés ↔ ressources : paires listées (l'application n'a pas encore de lien).
// Simulation par défaut ; rien n'est supprimé, aucun contenu n'est réécrit hors mise en forme.
import { createHash } from "node:crypto";

import type { Importer } from "../lib/importer.mts";
import type { NotionPage } from "../lib/notion.mts";

import { complete, select } from "./complements-fonctions.mts";

export interface CourseContext {
  imp: Importer;
  page: (id: string) => NotionPage;
  has: (id: string) => boolean;
}

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// ── a) titres ──────────────────────────────────────────────────────────────

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—]\s*/g, (m) => (m.trim() === "-" && !/\s/.test(m) ? "-" : " — "))
    .replace(/\s*[:：]\s*$/, "")
    .replace(/[.\s]+$/, "")
    .trim();
}

// ── d) mots-clés → tags ────────────────────────────────────────────────────

const KEYWORDS: [string, RegExp][] = [
  ["agile", /\bagile|agilit/],
  ["scrum", /\bscrum/],
  ["kanban", /\bkanban/],
  ["safe", /\bsafe\b/],
  ["cadrage", /\bcadrage/],
  ["besoins", /\bbesoin/],
  ["estimation", /\bestim/],
  ["planification", /\bplanif|\bplanning/],
  ["rétrospective", /\bretrospectiv/],
  ["user story", /\buser stor|\bepic/],
  ["backlog", /\bbacklog/],
  ["méthodes", /\bmethode|\bcycle en v|\bwaterfall/],
  ["risques", /\brisque/],
  ["raci", /\braci\b/],
  ["parties prenantes", /\bpartie.? prenante|\bstakeholder|\bcartographie des acteurs/],
  ["swot", /\bswot/],
  ["faisabilité", /\bfaisabilit/],
  ["mvp", /\bmvp\b/],
  ["budget", /\bbudget|\bcout/],
  ["communication", /\bcommunication/],
  ["management", /\bmanag/],
  ["sprint", /\bsprint/],
  ["vélocité", /\bvelocit/],
  ["pilotage", /\bpilot/],
  ["recette", /\brecett|\btests? et recette/],
  ["maintenance", /\bmaintenance/],
  ["indicateurs", /\bkpi\b|\bindicateur|\btableau de bord/],
  ["soutenance", /\bsoutenance|\bpitch/],
];
export const MAX_TAGS = 10;

/** Tags tirés d'un texte (titre, contenu, objectifs). */
export function keywordTags(text: string): string[] {
  const t = fold(text);
  return KEYWORDS.filter(([, re]) => re.test(t)).map(([tag]) => tag);
}

export function mergeTags(existing: string[], extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...existing, ...extra]) {
    const tag = raw.trim().toLocaleLowerCase("fr");
    if (!tag || seen.has(fold(tag))) continue;
    seen.add(fold(tag));
    out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

// ── e) Markdown ────────────────────────────────────────────────────────────

/** Mise en forme seulement (jamais de réécriture du fond) : puces, titres, sauts de ligne, `<br>`. */
export function normalizeMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/^[ \t]*[•·▪●◦][ \t]*/gm, "- ")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\*\*\s*\*\*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── type attendu d'après le titre (règles de classement) ───────────────────

export function expectedKind(r: {
  title: string;
  url: string | null;
  content: string;
}): string | null {
  const t = fold(r.title);
  if (/^corrige/.test(t)) return "answer_key";
  if (/^modele/.test(t)) return "template";
  if (/\bqcm\b|banque de questions/.test(t)) return "question_bank";
  if (/^(brief|santaconnect —|santaconnect -)/.test(t)) return "project";
  if (r.url && r.content.trim().length < 200) return "reference";
  return null;
}

// Lignes lues telles quelles : typage souple, comme `select`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GpResource = Record<string, any> & { objectives: string[] };

async function gpResources(imp: Importer, moduleId: string) {
  const courses = await select(imp, "course", "id, position, learning_objectives", {
    module_id: moduleId,
  });
  const ids = new Set<string>();
  const objectivesOf = new Map<string, string[]>();
  for (const c of courses) {
    const links = await select(imp, "course_resource", "resource_id", { course_id: c.id });
    for (const l of links) {
      ids.add(String(l.resource_id));
      objectivesOf.set(String(l.resource_id), [
        ...(objectivesOf.get(String(l.resource_id)) ?? []),
        ...((c.learning_objectives as string[] | null) ?? []),
      ]);
    }
  }
  const imported = await select(imp, "import_ref", "target_id", { target_table: "resource" });
  for (const ref of imported) {
    const [r] = await select(imp, "resource", "id, category", { id: ref.target_id });
    if (r && /^(Gestion de projet|Agilité)$/.test(String(r.category ?? ""))) ids.add(String(r.id));
  }
  const out: GpResource[] = [];
  for (const id of ids) {
    const [r] = await select(
      imp,
      "resource",
      "id, title, kind, audience, status, category, tags, url, content, files",
      { id },
    );
    if (r) out.push({ ...r, objectives: objectivesOf.get(id) ?? [] });
  }
  return out;
}

export async function migrate({ imp }: CourseContext): Promise<void> {
  const refs = await select(imp, "import_ref", "target_id", { target_table: "module" });
  let moduleId: string | null = null;
  for (const ref of refs) {
    const [m] = await select(imp, "module", "id, ycode", { id: ref.target_id });
    if (m?.ycode === "A2526_0172") moduleId = String(m.id);
  }
  if (!moduleId) {
    imp.warnings.push("Module GP (A2526_0172) introuvable.");
    return;
  }
  const resources = await gpResources(imp, moduleId);
  imp.warnings.push(`${resources.length} ressource(s) de gestion de projet examinée(s).`);

  const stats = { title: 0, kindEmpty: 0, kindGap: 0, status: 0, tags: 0, markdown: 0 };

  for (const r of resources) {
    const patch: Record<string, unknown> = {};
    const notes: string[] = [];

    // a) titre
    const title = normalizeTitle(String(r.title ?? ""));
    if (title && title !== r.title) {
      patch.title = title;
      stats.title++;
      notes.push(`titre « ${String(r.title)} » → « ${title} »`);
    }

    // b) type
    const wanted = expectedKind({ title, url: r.url, content: String(r.content ?? "") });
    if (!r.kind && wanted) {
      patch.kind = wanted;
      stats.kindEmpty++;
      notes.push(`type vide → ${wanted}`);
    } else if (wanted && r.kind !== wanted) {
      stats.kindGap++;
      imp.warnings.push(
        `Type à vérifier : « ${title} » est « ${String(r.kind)} », le titre suggère « ${wanted} » (non modifié).`,
      );
    }

    // c) état
    const hasBody =
      String(r.content ?? "").trim().length >= 80 || r.url || (r.files ?? []).length > 0;
    if (!hasBody && r.status === "ready") {
      patch.status = "progress";
      stats.status++;
      notes.push("ressource vide → à construire");
    }

    // d) tags
    const text = [title, String(r.content ?? "").slice(0, 6000), ...r.objectives].join(" \n ");
    const tags = mergeTags((r.tags as string[] | null) ?? [], [
      "gestion de projet",
      ...keywordTags(text),
    ]);
    if (JSON.stringify(tags) !== JSON.stringify(r.tags ?? [])) {
      patch.tags = tags;
      stats.tags++;
      notes.push(`tags [${((r.tags as string[] | null) ?? []).join(", ")}] → [${tags.join(", ")}]`);
    }

    // e) Markdown
    const md = normalizeMarkdown(String(r.content ?? ""));
    if (r.content && md !== r.content) {
      patch.content = md;
      stats.markdown++;
      notes.push(`Markdown normalisé (${String(r.content).length} → ${md.length} car.)`);
    }

    if (Object.keys(patch).length)
      await complete(
        imp,
        "resource",
        String(r.id),
        patch,
        `${title.slice(0, 55)} : ${notes.join(" ; ")}`,
      );
  }

  // Doublons (rien n'est supprimé) : même titre normalisé, ou même contenu.
  const seenTitle = new Map<string, string>();
  const seenHash = new Map<string, string>();
  for (const r of resources) {
    const key = fold(normalizeTitle(String(r.title ?? "")));
    if (seenTitle.has(key))
      imp.warnings.push(
        `Doublon de titre : « ${String(r.title)} » (fusion proposée avec « ${seenTitle.get(key)} »).`,
      );
    else seenTitle.set(key, String(r.title));
    const body = String(r.content ?? "").trim();
    if (body.length > 200) {
      const h = createHash("sha1").update(fold(body).replace(/\s+/g, " ")).digest("hex");
      if (seenHash.has(h))
        imp.warnings.push(
          `Contenu identique : « ${String(r.title)} » = « ${seenHash.get(h)} » (fusion proposée).`,
        );
      else seenHash.set(h, String(r.title));
    }
  }

  // f) questions ↔ ressources du même thème
  const questions = (await select(imp, "question", "id, name, tags", {})).filter((q) =>
    ((q.tags as string[] | null) ?? []).includes("gp 2025-26"),
  );
  const teaching = resources.filter((r) => ["course", "workshop"].includes(String(r.kind)));
  const tagged = teaching.map((r) => ({
    r,
    tags: new Set(
      mergeTags(
        (r.tags as string[] | null) ?? [],
        keywordTags([r.title, String(r.content ?? "").slice(0, 6000), ...r.objectives].join(" ")),
      ),
    ),
  }));
  let linked = 0;
  let free = 0;
  for (const q of questions) {
    const theme = ((q.tags as string[]) ?? []).filter(
      (t) => !["gestion de projet", "qcm", "gp 2025-26"].includes(t),
    );
    const wanted = new Set(theme.flatMap((t) => keywordTags(t)));
    if (!wanted.size) {
      free++;
      continue;
    }
    const best = tagged
      .map((x) => ({ x, hits: [...wanted].filter((w) => x.tags.has(w)).length }))
      .filter((c) => c.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 2);
    if (!best.length) {
      free++;
      continue;
    }
    for (const { x } of best) {
      linked++;
      await imp.link(
        "resource_question",
        { resource_id: x.r.id, question_id: q.id },
        "resource_id,question_id",
        `« ${String(q.name).slice(0, 40)} » ↔ « ${String(x.r.title).slice(0, 45)} »`,
      );
    }
  }
  imp.warnings.push(
    `Questions GP : ${questions.length} (${linked} liaison(s) proposée(s), ${free} sans ressource évidente).`,
  );

  // g) corrigés ↔ ressources
  for (const k of resources.filter((r) => r.kind === "answer_key")) {
    const base = fold(String(k.title)).replace(/^corrige\s*[—-]?\s*/, "");
    const target = resources
      .filter((r) => r.id !== k.id && ["course", "workshop", "project"].includes(String(r.kind)))
      .map((r) => ({
        r,
        hit: base.split(/\W+/).filter((w) => w.length >= 5 && fold(String(r.title)).includes(w))
          .length,
      }))
      .sort((a, b) => b.hit - a.hit)[0];
    imp.warnings.push(
      target && target.hit >= 2
        ? `Corrigé « ${String(k.title)} » ↔ « ${String(target.r.title)} » (lien à poser dans l'application : pas de champ de liaison).`
        : `Corrigé « ${String(k.title)} » : aucune ressource évidente.`,
    );
  }

  imp.warnings.push(
    `Bilan : ${stats.title} titre(s), ${stats.tags} jeu(x) de tags, ${stats.markdown} contenu(s) Markdown, ${stats.status} ressource(s) à construire, ${stats.kindEmpty} type(s) complété(s), ${stats.kindGap} écart(s) de type signalé(s).`,
  );
}
