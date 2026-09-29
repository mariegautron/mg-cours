import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { zipSync } from "fflate";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("US-66 : photo par étudiant·e, import zip par numéro, suppression, jamais publique", async ({
  page,
  request,
}) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();

  const create = async (first: string, last: string, number: string) => {
    await page.goto("/students/new");
    await page.getByLabel("Prénom").fill(first);
    await page.getByLabel("Nom", { exact: true }).fill(last);
    await page.getByLabel("Numéro étudiant").fill(number);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL("**/students");
    await page.goto(`/students?q=${encodeURIComponent(last)}`);
    await page.getByRole("link", { name: `${first} ${last}` }).click();
    await expect(page.getByRole("heading", { name: `${first} ${last}`, level: 1 })).toBeVisible();
    return page.url();
  };
  const anaUrl = await create("Ana", `Photo${stamp}`, `P${stamp}A`);
  await create("Ben", `Photo${stamp}`, `P${stamp}B`);

  // Une par une, depuis la fiche.
  await page.goto(anaUrl);
  await page.getByLabel("Ajouter une photo").setInputFiles({
    name: "ana.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await page.getByRole("button", { name: "Enregistrer la photo" }).click();
  await expect(page.getByText("Photo enregistrée.")).toBeVisible();
  const img = page.getByRole("img", { name: `Ana Photo${stamp}` });
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // Refus d'un faux format (texte renommé en .png).
  await page.getByLabel("Remplacer la photo").setInputFiles({
    name: "faux.png",
    mimeType: "image/png",
    buffer: Buffer.from("pas une image"),
  });
  await page.getByRole("button", { name: "Enregistrer la photo" }).click();
  await expect(page.getByText("Format non accepté (JPEG, PNG ou WebP).")).toBeVisible();

  // Jamais public : sans session, la route redirige vers la connexion.
  const anaId = anaUrl.split("/").pop()!;
  const anonymous = await request.get(`/api/students/${anaId}/photo`, { maxRedirects: 0 });
  expect([301, 302, 307, 308, 401]).toContain(anonymous.status());
  expect(anonymous.headers()["location"] ?? "").not.toContain("student-photos");

  // Zip nommé par numéro : Ben reconnu, un fichier inconnu signalé.
  await page.goto("/students/photos");
  const zip = Buffer.from(
    zipSync({
      [`P${stamp}B.png`]: new Uint8Array(PNG),
      "inconnu.png": new Uint8Array(PNG),
    }),
  );
  await page.getByLabel("Fichier zip de photos").setInputFiles({
    name: "photos.zip",
    mimeType: "application/zip",
    buffer: zip,
  });
  await page.getByRole("button", { name: "Importer les photos" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 photo ajoutée ; 1 fichier sans numéro étudiant correspondant.",
  );

  // Liste : photos avec le nom en texte alternatif ; audit d'accessibilité.
  await page.goto(`/students?q=Photo${stamp}`);
  await expect(page.getByRole("img", { name: `Ana Photo${stamp}` })).toBeVisible();
  await expect(page.getByRole("img", { name: `Ben Photo${stamp}` })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Suppression.
  await page.goto(anaUrl);
  await page.getByRole("button", { name: "Supprimer la photo" }).click();
  await expect(page.getByRole("img", { name: `Ana Photo${stamp}` })).toHaveCount(0);
  await expect(page.getByLabel("Ajouter une photo")).toBeVisible();
});
