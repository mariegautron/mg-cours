import { createHash, randomBytes } from "node:crypto";

import { expect, test, type Browser } from "@playwright/test";

import { localEnv } from "./env";
import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";
import { nextCopy } from "./helpers";
import { createAndPublishQuiz, importBank, prepareLinks } from "./quiz-setup";

// Tests d'abus de la passation anonyme (docs/SECURITY-QCM.md). Nécessitent Supabase local et
// SUPABASE_SERVICE_ROLE_KEY dans .env.local (clé locale de démonstration).
const env = localEnv();
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");
const tokenOf = (path: string) => path.split("/").pop()!;
const randomToken = () => randomBytes(32).toString("base64url");
let ip = 100;

const headers = (key: string) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
});
const anon = headers(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const service = headers(env.SUPABASE_SERVICE_ROLE_KEY);

async function rpc(name: string, body: object, h = anon) {
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    json: (await res.json().catch(() => null)) as Record<string, unknown> | null,
  };
}
const session = (token: string) => rpc("mg_quiz_session", { p_token_hash: sha256(token) });
const save = (token: string, answers: object) =>
  rpc("mg_quiz_save", { p_token_hash: sha256(token), p_answers: answers });
const submit = (token: string) => rpc("mg_quiz_submit", { p_token_hash: sha256(token) });
const start = (token: string) => rpc("mg_quiz_start", { p_token_hash: sha256(token) });

async function patchAttempt(token: string, patch: object) {
  const res = await fetch(`${base}/rest/v1/quiz_attempt?token_hash=eq.${sha256(token)}`, {
    method: "PATCH",
    headers: service,
    body: JSON.stringify(patch),
  });
  expect(res.ok).toBe(true);
}
async function patchQuizOf(token: string, patch: object) {
  const res = await fetch(
    `${base}/rest/v1/quiz_attempt?token_hash=eq.${sha256(token)}&select=quiz_id`,
    { headers: service },
  );
  const [{ quiz_id }] = (await res.json()) as { quiz_id: string }[];
  const r = await fetch(`${base}/rest/v1/quiz?id=eq.${quiz_id}`, {
    method: "PATCH",
    headers: service,
    body: JSON.stringify(patch),
  });
  expect(r.ok).toBe(true);
}

async function student(browser: Browser) {
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-real-ip": `10.30.${++ip % 250}.${Math.floor(Math.random() * 200) + 1}` },
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  });
  return { context, page: await context.newPage() };
}

test("accès anonymes : aucune lecture ni écriture directe, aucune fonction interne", async () => {
  const countOf = async (table: string) =>
    Number(
      (
        await fetch(`${base}/rest/v1/${table}?select=id`, {
          headers: { ...service, Prefer: "count=exact", Range: "0-0" },
        })
      ).headers
        .get("content-range")
        ?.split("/")[1],
    );
  const before = { student: await countOf("student"), quiz_attempt: await countOf("quiz_attempt") };
  for (const table of [
    "quiz_attempt",
    "quiz",
    "quiz_draw_rule",
    "question",
    "question_choice",
    "quiz_ip_failure",
    "grade",
    "student",
  ]) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*`, { headers: anon });
    const body = await res.text();
    // Soit refusé (401/403), soit vide : jamais une ligne.
    expect(res.status === 200 ? body : "[]", `${table} ne doit rien renvoyer à l'anonyme`).toBe(
      "[]",
    );
    const write = await fetch(`${base}/rest/v1/${table}`, {
      method: "POST",
      headers: anon,
      body: "{}",
    });
    expect(write.status, `${table} : écriture anonyme`).toBeGreaterThanOrEqual(400);
    const patch = await fetch(`${base}/rest/v1/${table}?id=not.is.null`, {
      method: "PATCH",
      headers: anon,
      body: "{}",
    });
    expect(patch.status).not.toBe(500);
    const del = await fetch(`${base}/rest/v1/${table}?id=not.is.null`, {
      method: "DELETE",
      headers: anon,
    });
    expect(del.status).not.toBe(500);
  }
  // Rien n'a été supprimé ni modifié par ces tentatives.
  const count = async (table: string) =>
    Number(
      (
        await fetch(`${base}/rest/v1/${table}?select=id`, {
          headers: { ...service, Prefer: "count=exact", Range: "0-0" },
        })
      ).headers
        .get("content-range")
        ?.split("/")[1],
    );
  expect(await count("student")).toBe(before.student);
  expect(await count("quiz_attempt")).toBe(before.quiz_attempt);
  // Fonctions internes : inaccessibles à l'anonyme.
  for (const [fn, body] of [
    ["mg_quiz_view", { p_attempt_id: "00000000-0000-0000-0000-000000000000" }],
    ["mg_quiz_family_closed", { p_quiz_id: "00000000-0000-0000-0000-000000000000" }],
    ["mg_quiz_public_questions", { p_drawn: [] }],
    ["mg_quiz_clean_answers", { p_answers: {}, p_count: 1 }],
    ["mg_quiz_ip_failure", { p_ip_hash: "x", p_limit: 1, p_window_seconds: 1 }],
  ] as const) {
    const r = await rpc(fn, body);
    expect([401, 403, 404], `${fn} ne doit pas être appelable par l'anonyme`).toContain(r.status);
  }
});

test("jetons : mal formés, inconnus, révoqués ; jamais de détail sur l'existence", async () => {
  for (const bad of ["", "abc", "x".repeat(64), "'; drop table quiz_attempt;--"]) {
    const r = await rpc("mg_quiz_session", { p_token_hash: bad });
    expect(r.json).toEqual({ status: "invalid" });
  }
  // Un jeton en clair passé à la place du haché ne fonctionne pas non plus.
  const unknown = randomToken();
  expect((await rpc("mg_quiz_session", { p_token_hash: unknown })).json).toEqual({
    status: "invalid",
  });
  expect((await session(unknown)).json).toEqual({ status: "invalid" });
  expect((await save(unknown, {})).json).toEqual({ status: "invalid" });
  expect((await submit(unknown)).json).toEqual({ status: "invalid" });
  expect((await start(unknown)).json).toEqual({ status: "invalid" });
});

test("passation : fenêtre, retard, débit, révocation, corrigé jamais avant la clôture pour tous", async ({
  page,
  browser,
}) => {
  test.setTimeout(420_000);
  await loginLight(page);
  const suffix = Date.now();
  await importBank(page, suffix);
  await createSimpleGrid(page, `Grille Sec ${suffix}`, [["Structure", 4]]);
  const setup = await createAssessment(page, `Grille Sec ${suffix}`, suffix, {
    firstNames: ["Ana", "Zoé", "Léo"],
  });
  const [ana, zoe, leo] = setup.studentNames;
  const form = (name: string) => page.getByRole("form", { name });

  // Zoé est absente excusée sur l'évaluation d'origine (rattrapage à prévoir).
  await nextCopy(page);
  await nextCopy(page);
  await form(zoe).getByRole("radio", { name: "Absent·e excusé·e" }).check();
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });

  await createAndPublishQuiz(page, setup.assessmentUrl, suffix);
  const links = await prepareLinks(page);
  // Les absent·es déclaré·es n'ont pas de lien vers le QCM d'origine.
  expect(Object.keys(links).sort()).toEqual([ana, leo].sort());
  const tAna = tokenOf(links[ana]);
  const tLeo = tokenOf(links[leo]);

  // Fenêtre d'ouverture : pas encore ouvert → on ne peut pas commencer.
  await patchQuizOf(tAna, {
    opens_at: new Date(Date.now() + 3_600_000).toISOString(),
    closes_at: new Date(Date.now() + 7_200_000).toISOString(),
  });
  expect((await session(tAna)).json?.status).toBe("not_open");
  expect((await start(tAna)).json?.status).toBe("not_open");
  expect((await save(tAna, { "1": { choices: [0] } })).json?.status).toBe("not_started");
  // Fenêtre passée.
  await patchQuizOf(tAna, {
    opens_at: new Date(Date.now() - 7_200_000).toISOString(),
    closes_at: new Date(Date.now() - 3_600_000).toISOString(),
  });
  expect((await session(tAna)).json?.status).toBe("window_closed");
  expect((await start(tAna)).json?.status).toBe("window_closed");
  // Réouverture normale.
  await patchQuizOf(tAna, { opens_at: null, closes_at: null });
  const opened = await session(tAna);
  expect(opened.json?.status).toBe("ready");
  // La vue « prêt » ne contient ni question ni corrigé.
  expect(JSON.stringify(opened.json)).not.toMatch(/statement|choices|fraction|is_correct|SECRET/);

  // Démarrage : le chrono est côté serveur ; la vue ne contient jamais de corrigé.
  const started = await start(tAna);
  expect(started.json?.status).toBe("in_progress");
  const txt = JSON.stringify(started.json);
  expect(txt).not.toMatch(/fraction|is_correct|SECRET|general_feedback|numeric_value|question_id/);
  const questions = started.json?.questions as { choices: { id: number; text: string }[] }[];
  expect(questions).toHaveLength(4);
  expect(Object.keys(questions[0].choices[0] ?? { id: 0, text: "" }).sort()).toEqual([
    "id",
    "text",
  ]);

  // Sauvegarde : entrées hostiles nettoyées (positions hors bornes ignorées), taille plafonnée.
  expect(
    (
      await save(tAna, {
        "1": { choices: [0] },
        "999": { choices: [1] },
        __proto__: { x: 1 },
        "1e3": {},
      })
    ).json?.status,
  ).toBe("ok");
  const huge = { "1": { text: "x".repeat(250_000) } };
  expect((await save(tAna, huge)).json?.status).toBe("bad_request");
  expect((await save(tAna, [] as unknown as object)).json?.status).toBe("bad_request");
  const stored = await (
    await fetch(`${base}/rest/v1/quiz_attempt?token_hash=eq.${sha256(tAna)}&select=answers`, {
      headers: service,
    })
  ).json();
  expect(Object.keys(stored[0].answers)).toEqual(["1"]);

  // Retard : après l'heure limite + marge, les modifications sont conservées à part, jamais perdues.
  await patchAttempt(tAna, { deadline_at: new Date(Date.now() - 300_000).toISOString() });
  const late = await save(tAna, { "1": { choices: [1] } });
  expect(late.json).toMatchObject({ status: "ok", late: true });
  const after = await (
    await fetch(
      `${base}/rest/v1/quiz_attempt?token_hash=eq.${sha256(tAna)}&select=answers,late_answers`,
      { headers: service },
    )
  ).json();
  expect(after[0].answers["1"]).toEqual({ choices: [0] });
  expect(after[0].late_answers["1"]).toEqual({ choices: [1] });
  // La soumission tardive n'est JAMAIS refusée : la copie est rendue et marquée en retard.
  expect((await submit(tAna)).json?.status).toBe("ok");
  expect((await submit(tAna)).json?.status).toBe("already_submitted");
  expect((await save(tAna, { "1": { choices: [2] } })).json?.status).toBe("already_submitted");
  const flagged = await (
    await fetch(
      `${base}/rest/v1/quiz_attempt?token_hash=eq.${sha256(tAna)}&select=submitted_late,status`,
      { headers: service },
    )
  ).json();
  expect(flagged[0]).toEqual({ submitted_late: true, status: "submitted" });

  // Limite par jeton : les LECTURES sont limitées, jamais save / submit.
  const results = [];
  for (let i = 0; i < 125; i++) results.push((await session(tLeo)).json?.status);
  expect(results.slice(0, 120).every((s) => s === "ready")).toBe(true);
  expect(results.slice(120)).toContain("rate_limited");
  expect((await start(tLeo)).json?.status).toBe("in_progress");
  for (let i = 0; i < 130; i++)
    expect((await save(tLeo, { "1": { choices: [0] } })).json?.status).toBe("ok");
  // Rechargement de la page publique par un·e étudiant·e légitime limité·e : message clair, copie intacte.
  const l = await student(browser);
  await l.page.goto(links[leo]);
  await expect(l.page.getByRole("heading", { name: "Un instant" })).toBeVisible();
  await l.context.close();

  // Lien révoqué : plus rien ne fonctionne avec.
  await patchAttempt(tLeo, {
    revoked_at: new Date().toISOString(),
    calls_count: 0,
    calls_window_start: null,
  });
  expect((await session(tLeo)).json?.status).toBe("invalid");
  expect((await save(tLeo, {})).json?.status).toBe("invalid");
  await patchAttempt(tLeo, { revoked_at: null });

  // Corrigé : Ana a rendu, mais Zoé (excusée) n'a pas de rattrapage → corrigé caché même QCM clôturé.
  await page.goto(`${setup.assessmentUrl}/quiz`);
  await page.getByRole("button", { name: "Clôturer le QCM" }).click();
  await expect(page.getByText("Clôturé", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/1 absent·e excusé·e n’ont pas encore de rattrapage|absent·e excusé·e/),
  ).toBeVisible();
  const a = await student(browser);
  await patchAttempt(tAna, { calls_count: 0, calls_window_start: null });
  const view = await session(tAna);
  const results0 = view.json?.results as Record<string, unknown>;
  // La note peut apparaître (copie entièrement corrigée ou relue), jamais le corrigé.
  expect(JSON.stringify(view.json)).not.toMatch(/SECRET|fraction|is_correct|correct"/);
  expect(["pending", "after_close"]).toContain(results0.visibility);
  await a.page.goto(links[ana]);
  await expect(
    a.page.getByText(
      /Ta copie est en cours de correction|seront visibles ici quand le QCM sera clôturé/,
    ),
  ).toBeVisible();
  await a.context.close();

  // Rattrapage : le QCM de rattrapage est cloné ; tant qu'il n'est pas clôturé, le corrigé reste caché.
  await page.goto(setup.assessmentUrl);
  await page.getByRole("button", { name: "Préparer le rattrapage" }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.getByText("Rattrapage", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Publier le QCM" }).click();
  const makeupLinks = await prepareLinks(page);
  expect(Object.keys(makeupLinks)).toEqual([zoe]);
  await page.goto(page.url().replace(/\/quiz.*$/, "/quiz"));
  await page.getByRole("button", { name: "Clôturer le QCM" }).click();
  await expect(page.getByText("Clôturé", { exact: true })).toBeVisible();
  await expect(page.getByText("Le QCM est clôturé pour tout le monde")).toBeVisible();

  // Limite par IP : seuls les essais avec un jeton INVALIDE comptent ; un jeton valide passe toujours,
  // même depuis une IP qui a dépassé la limite (une salle de classe partage une adresse).
  const shared = await browser.newContext({
    extraHTTPHeaders: {
      "x-real-ip": `10.99.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    },
    baseURL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
  });
  const p = await shared.newPage();
  let throttled = false;
  for (let i = 0; i < 34 && !throttled; i++) {
    await p.goto(`/q/${randomToken()}`);
    throttled = await p.getByRole("heading", { name: "Trop d’essais" }).isVisible();
  }
  expect(throttled).toBe(true);
  await p.goto(links[ana]);
  await expect(p.getByRole("heading", { name: "Trop d’essais" })).toHaveCount(0);
  await expect(p.getByText(/Ta copie est rendue/)).toBeVisible();
  // Un jeton mal formé (chemin quelconque) ne provoque aucune erreur serveur.
  const weird = await p.request.get("/q/%27%3B%20drop%20table--");
  expect(weird.status()).toBe(200);
  await shared.close();
});
