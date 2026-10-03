import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { localEnv } from "./env";
import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";
import { createAndPublishQuiz, importBank, prepareLinks } from "./quiz-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`) et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
const axe = (page: Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const tokenOf = (path: string) => path.split("/").pop()!;
let ipCounter = 10;

/** Contexte « étudiant·e » : aucun cookie de Marie, sa propre IP (la limite par IP est testée à part). */
async function studentPage(browser: Browser) {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-real-ip": `10.20.${++ipCounter}.${Math.floor(Math.random() * 200) + 1}`,
    },
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  });
  return { context, page: await context.newPage() };
}

async function rpc(name: string, body: object) {
  const env = localEnv();
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    json: (await res.json().catch(() => null)) as Record<string, unknown> | null,
  };
}

test("QCM : tirage individuel, passation, correction, corrigé après clôture", async ({
  page,
  browser,
}) => {
  test.setTimeout(420_000);
  await loginLight(page);
  const suffix = Date.now();
  await importBank(page, suffix);

  await createSimpleGrid(page, `Grille QCM ${suffix}`, [["Structure", 4]]);
  const setup = await createAssessment(page, `Grille QCM ${suffix}`, suffix, {
    firstNames: ["Ana", "Zoé", "Léo"],
  });
  const [ana, zoe, leo] = setup.studentNames;
  await createAndPublishQuiz(page, setup.assessmentUrl, suffix);
  const links = await prepareLinks(page);
  expect(Object.keys(links)).toHaveLength(3);
  expect(page.getByText("Ce lien est personnel : ne le partage pas.").first()).toBeVisible();

  // CSV : fonctionne seul (aucune adresse e-mail, aucun envoi).
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Télécharger le CSV des liens" }).click(),
  ]);
  const csv = await (await import("node:fs/promises")).readFile((await download.path())!, "utf8");
  expect(csv).toContain('"Lien personnel"');
  expect(csv).toContain(links[ana].replace(/^\//, ""));

  // Aucune trace du jeton en clair en base : seul le haché (64 hex) y figure.
  const hashed = await rpc("mg_quiz_session", { p_token_hash: tokenOf(links[ana]) });
  expect(hashed.json?.status).toBe("invalid");

  // ── Étudiante Ana : passation complète ──
  const a = await studentPage(browser);
  const bodies: string[] = [];
  a.page.on("response", async (r) => {
    if (
      r.url().includes("localhost") &&
      /json|text|x-component/.test(r.headers()["content-type"] ?? "")
    )
      bodies.push(await r.text().catch(() => ""));
  });
  await a.page.goto(links[ana]);
  await expect(a.page.getByRole("heading", { name: `Évaluation ${suffix}` })).toBeVisible();
  await expect(a.page.getByText("Ce lien est personnel : ne le partage pas.")).toBeVisible();
  expect((await axe(a.page)).violations).toEqual([]);
  await a.page.getByRole("button", { name: "Commencer" }).click();
  await expect(a.page.getByRole("group", { name: /Question 1 sur 4/ })).toBeVisible();
  expect((await axe(a.page)).violations).toEqual([]);

  // Aucune donnée d'autres étudiant·es, aucun indice de correction dans la page.
  const html = await a.page.content();
  for (const forbidden of [
    zoe,
    leo,
    "Zoé",
    "Léo",
    "is_correct",
    "fraction",
    "SECRET-",
    "general_feedback",
  ])
    expect(html, `« ${forbidden} » ne doit pas être dans la page`).not.toContain(forbidden);

  // Questions à choix unique (l'ordre est mélangé : la réponse libre peut venir n'importe où).
  const singles = a.page
    .getByRole("group", { name: /Question \d sur 4/ })
    .filter({ has: a.page.getByRole("radio") });
  const statements = async (p: Page) =>
    (await p.getByText(/^Énoncé \d+ du lot/).allTextContents()).sort().join("|");
  const anaSet = await statements(a.page);

  // Navigation au clavier dans un groupe de boutons radio.
  const radios = singles.first().getByRole("radio");
  await radios.first().focus();
  await a.page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();

  // Réponses : 2 bonnes sur 3 (2 pts auto), une réponse libre à relire.
  const count = await singles.count();
  expect(count).toBe(3);
  for (let i = 0; i < 3; i++) {
    await singles
      .nth(i)
      .getByRole("radio", { name: i < 2 ? /^Bonne / : /^Mauvaise / })
      .check();
  }
  await a.page.getByRole("textbox", { name: "Ta réponse" }).fill("Ma réponse libre");
  await expect(a.page.getByText(/Tes réponses sont enregistrées \(à/)).toBeVisible({
    timeout: 15_000,
  });

  // Reprise : rechargement, les réponses sont là.
  await a.page.reload();
  await expect(a.page.getByRole("textbox", { name: "Ta réponse" })).toHaveValue("Ma réponse libre");
  await expect(singles.first().getByRole("radio", { name: /^Bonne / })).toBeChecked();

  // Rendre la copie : confirmation avec focus géré.
  await a.page.getByRole("button", { name: "Rendre ma copie" }).click();
  await expect(a.page.getByRole("heading", { name: "Rendre ta copie ?" })).toBeFocused();
  await a.page.getByRole("button", { name: "Oui, rendre ma copie" }).click();
  await expect(a.page.getByText(/Ta copie est rendue/)).toBeVisible();
  await expect(a.page.getByText("Ta copie est en cours de correction")).toBeVisible();
  expect((await axe(a.page)).violations).toEqual([]);
  // Les bonnes réponses ne sont jamais passées par le navigateur avant le corrigé.
  for (const b of bodies) {
    expect(b).not.toContain("SECRET-");
    expect(b).not.toContain("is_correct");
  }

  // ── Marie : copie à relire, note partielle, puis relecture ──
  await page.goto(`${setup.assessmentUrl}/quiz`);
  const row = page.getByRole("row").filter({ hasText: ana });
  await expect(row).toContainText("Rendue : à relire");
  await expect(row).toContainText("2 / 5 (partiel)");
  // Pas de note tant que tout n'est pas corrigé : hors compteur et moyenne.
  await page.goto(`${setup.moduleUrl}/assessments`);
  await expect(page.getByRole("row").filter({ hasText: ana }).getByRole("cell").nth(1)).toHaveText(
    "—",
  );

  await page.goto(`${setup.assessmentUrl}/quiz`);
  await page.getByRole("link", { name: `Relire la copie de ${ana}` }).click();
  await expect(page).toHaveTitle(/.+/);
  expect((await axe(page)).violations).toEqual([]);
  await page.getByLabel("Points donnés (sur 2)").fill("1,5");
  await page.getByRole("button", { name: "Enregistrer la relecture" }).click();
  await expect(page.getByRole("row").filter({ hasText: ana })).toContainText("Corrigée");
  await expect(page.getByRole("row").filter({ hasText: ana })).toContainText("3,5 / 5");
  await page.goto(`${setup.moduleUrl}/assessments`);
  await expect(page.getByRole("row").filter({ hasText: ana }).getByRole("cell").nth(1)).toHaveText(
    "14.00",
  );

  // Ana : note et corrigé pas encore visibles (QCM non clôturé).
  await a.page.reload();
  await expect(
    a.page.getByText("seront visibles ici quand le QCM sera clôturé pour tout le monde"),
  ).toBeVisible();

  // ── Tirage individuel : au moins deux des trois tirages diffèrent (banque de 12, 3 tirées) ──
  const z = await studentPage(browser);
  await z.page.goto(links[zoe]);
  await z.page.getByRole("button", { name: "Commencer" }).click();
  await expect(z.page.getByRole("group", { name: /Question 1 sur 4/ })).toBeVisible();
  const zoeSet = await statements(z.page);
  const l = await studentPage(browser);
  await l.page.goto(links[leo]);
  await l.page.getByRole("button", { name: "Commencer" }).click();
  await expect(l.page.getByRole("group", { name: /Question 1 sur 4/ })).toBeVisible();
  const leoSet = await statements(l.page);
  expect(new Set([anaSet, zoeSet, leoSet]).size).toBeGreaterThanOrEqual(2);
  await a.page.close();
  await z.context.close();
  await l.context.close();

  // ── Clôture : corrigé visible pour Ana (personne d'excusé·e, aucun rattrapage) ──
  await page.goto(`${setup.assessmentUrl}/quiz`);
  await page.getByRole("button", { name: "Clôturer le QCM" }).click();
  await expect(page.getByText("Clôturé", { exact: true })).toBeVisible();
  await expect(page.getByText("Le QCM est clôturé pour tout le monde")).toBeVisible();
  const a2 = await studentPage(browser);
  await a2.page.goto(links[ana]);
  await expect(a2.page.getByText("Ta note : 3,5 / 5")).toBeVisible();
  await expect(a2.page.getByRole("heading", { name: "Corrigé" })).toBeVisible();
  await expect(a2.page.getByText(/Bonne réponse/).first()).toBeVisible();
  expect((await axe(a2.page)).violations).toEqual([]);
  await a2.context.close();
});
