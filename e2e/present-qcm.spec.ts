import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { localEnv } from "./env";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const env = localEnv();
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });

async function insert<T>(table: string, rows: object[]): Promise<T[]> {
  const res = await rest(table, { method: "POST", body: JSON.stringify(rows) });
  expect(res.ok, await res.clone().text()).toBe(true);
  return res.json();
}

async function createResource(page: Page, title: string, kind: string, content: string) {
  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption(kind);
  await page.getByLabel("Contenu (Markdown)").fill(content);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  return page.url().split("/").pop()!;
}

const axe = async (page: Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze())
    .violations;

test("mini-QCM projetés en fin de séance : question puis correction, volume réglable", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const stamp = Date.now();

  const lesson = `Fiche QCM ${stamp}`;
  const lessonId = await createResource(
    page,
    lesson,
    "course",
    "# Les rôles\n\nTexte de la fiche.",
  );

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`QCM projeté ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre de la séance").fill("Séance quiz");
  await page.getByLabel("Rechercher une ressource").fill(String(stamp));
  await page.getByLabel(lesson).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  await openTab(page, /Séances/);
  const startHref = await page
    .getByRole("link", { name: /^Faire cours : Séance quiz/ })
    .getAttribute("href");
  const startPath = startHref!;
  const href = startPath.replace("/modules/", "/present/modules/").replace(/\/start$/, "");

  // Six questions projetables, plus une ouverte et une de la banque « SCRUM » à ne jamais projeter.
  const [{ owner_id: ownerId }] = (await (
    await rest(`resource?id=eq.${lessonId}&select=owner_id`)
  ).json()) as { owner_id: string }[];
  const mk = (n: number, over: object = {}) => ({
    owner_id: ownerId,
    name: `Q${n}`,
    type: "single_choice",
    statement: `Énoncé unique ${n} ${stamp}`,
    general_feedback: `Revoir la section ${n} ${stamp}`,
    category: "Mini-QCM Test",
    ...over,
  });
  const questions = await insert<{ id: string; name: string }>("question", [
    mk(1),
    mk(2),
    mk(3),
    mk(4),
    mk(5),
    mk(6),
    mk(7, { type: "open" }),
    mk(8, { category: "SCRUM" }),
  ]);
  await insert(
    "question_choice",
    questions.flatMap((q, i) =>
      [0, 1, 2].map((p) => ({
        owner_id: ownerId,
        question_id: q.id,
        position: p,
        text: `Choix ${p} de ${q.name} ${stamp}`,
        is_correct: p === 1,
        fraction: p === 1 ? 1 : 0,
        feedback: p === 1 ? `Parce que ${i + 1} ${stamp}` : "",
      })),
    ),
  );
  await insert(
    "resource_question",
    questions.map((q) => ({ owner_id: ownerId, resource_id: lessonId, question_id: q.id })),
  );

  // « Avant de commencer » : un interrupteur par fiche et le volume de questions.
  await page.goto(startPath);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("group", { name: `Mini-QCM — ${lesson}` })).toBeVisible();
  await expect(page.getByText("6 questions liées")).toBeVisible();
  await page.getByText("3 par fiche", { exact: true }).click();
  await expect(page.getByLabel("3 par fiche")).toBeChecked();
  await expect(page.getByRole("link", { name: /Ouvrir la fenêtre projetée/ })).toHaveAttribute(
    "href",
    /qcm=3/,
  );
  await page.getByText("5 par fiche", { exact: true }).click();
  expect(await axe(page)).toEqual([]);

  // Lecture continue : ni question ni correction, un rappel.
  await page.goto(href);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Document" }).click();
  await expect(page.getByText("Les mini-QCM se projettent en mode Diapositives.")).toBeVisible();
  expect(await page.locator("main").innerText()).not.toContain(`Énoncé unique 1 ${stamp}`);

  // Vue présentatrice : on saute à la première question.
  await page.getByRole("button", { name: "Diapositives" }).click();
  const presenter = await context.newPage();
  await presenter.emulateMedia({ reducedMotion: "reduce" });
  await presenter.goto(`${href}/presenter`);
  await presenter.waitForLoadState("networkidle");
  await presenter.getByLabel("Un titre ou un numéro de diapositive").fill("Question 1 sur 5");
  await presenter.keyboard.press("Enter");

  // Question : énoncé et choix, jamais la bonne réponse ni les retours.
  await expect(page.getByRole("heading", { name: "Question 1 sur 5", exact: true })).toBeVisible();
  await expect(page.getByText(`Énoncé unique 1 ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Choix 2 de Q1 ${stamp}`)).toBeVisible();
  await expect(page.getByText("Une seule réponse")).toBeVisible();
  const questionHtml = await page.locator("main").innerText();
  for (const secret of ["Bonne réponse", `Parce que 1 ${stamp}`, `Revoir la section 1 ${stamp}`]) {
    expect(questionHtml).not.toContain(secret);
  }
  expect(await axe(page)).toEqual([]);

  // Correction : bonne réponse en évidence, retour du choix, retour général.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Question 1 sur 5", exact: true })).toBeVisible();
  await expect(page.getByText("Bonne réponse", { exact: true })).toHaveCount(1);
  await expect(page.getByText("À écarter")).toHaveCount(2);
  await expect(page.getByText(`Parce que 1 ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Revoir la section 1 ${stamp}`)).toBeVisible();
  expect(await axe(page)).toEqual([]);

  // La vue privée suit.
  await expect(
    presenter.getByRole("heading", { name: /Diapositive \d+ sur \d+ : Correction/ }),
  ).toBeVisible();

  // Parcours complet : 5 questions (pas la 6e), jamais l'ouverte ni la banque « SCRUM ».
  const seen: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("ArrowRight");
    seen.push(await page.locator("main").innerText());
  }
  const all = seen.join("\n");
  expect(all).toContain(`Énoncé unique 5 ${stamp}`);
  for (const absent of [6, 7, 8]) expect(all).not.toContain(`Énoncé unique ${absent} ${stamp}`);
  await expect(page.getByRole("heading", { name: /Prochaine séance|Fin du module/ })).toBeVisible();

  // Volume réglé à 3 : la 4e question n'existe plus.
  await page.goto(`${href}?qcm=3`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Diapositives" }).click();
  await presenter.goto(`${href}/presenter?qcm=3`);
  await presenter.waitForLoadState("networkidle");
  await presenter.getByLabel("Un titre ou un numéro de diapositive").fill("Question 3 sur 3");
  await expect(
    presenter.getByRole("button", { name: /Question 3 sur 3 · / }).first(),
  ).toBeVisible();
  await presenter.getByLabel("Un titre ou un numéro de diapositive").fill("Question 4 sur");
  await expect(presenter.getByText("Rien ne porte ce titre dans le déroulé.")).toBeVisible();

  // Fiche « Pour moi » : plus de mini-QCM dans la projection.
  await page.goto(`${href}?hide=qcm:${lessonId}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Sommaire" }).click();
  await expect(page.getByRole("button", { name: `Mini-QCM — ${lesson}` })).toHaveCount(0);
});
