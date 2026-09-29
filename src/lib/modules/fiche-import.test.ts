import { describe, expect, it } from "vitest";

import {
  ficheNotice,
  isPendingFichePath,
  moduleFichePath,
  pendingFichePath,
  readPendingFiche,
} from "./fiche-import";

const UID = "11111111-1111-1111-1111-111111111111";

describe("chemins de la fiche", () => {
  it("dépose en attente puis déplace dans le dossier du module", () => {
    const pending = pendingFichePath(UID, "abc", "fiche.pdf");
    expect(pending).toBe(`${UID}/pending/abc-fiche.pdf`);
    expect(isPendingFichePath(pending, UID)).toBe(true);
    expect(moduleFichePath(UID, "mod1", pending)).toBe(`${UID}/mod1/abc-fiche.pdf`);
  });

  it("refuse le dossier d'une autre personne ou un échappement", () => {
    expect(isPendingFichePath("autre/pending/x.pdf", UID)).toBe(false);
    expect(isPendingFichePath(`${UID}/pending/../autre/x.pdf`, UID)).toBe(false);
    expect(isPendingFichePath(`${UID}/mod1/x.pdf`, UID)).toBe(false);
  });
});

describe("readPendingFiche", () => {
  const ok = { path: `${UID}/pending/a-f.pdf`, name: "f.pdf", size: 10, mime: "application/pdf" };
  it("lit un dépôt valide", () => {
    expect(readPendingFiche(JSON.stringify(ok), UID)).toEqual(ok);
  });
  it("ignore vide, JSON cassé, champs manquants ou chemin étranger", () => {
    expect(readPendingFiche("", UID)).toBeNull();
    expect(readPendingFiche("{", UID)).toBeNull();
    expect(readPendingFiche(JSON.stringify({ path: ok.path }), UID)).toBeNull();
    expect(readPendingFiche(JSON.stringify({ ...ok, path: "x/pending/a.pdf" }), UID)).toBeNull();
  });
});

describe("ficheNotice", () => {
  it("un message par résultat, aucun sinon", () => {
    expect(ficheNotice("read")?.tone).toBe("ok");
    expect(ficheNotice("review")?.text).toContain("à relire");
    expect(ficheNotice("failed")?.text).toContain("n’a pas pu être enregistrée");
    expect(ficheNotice(undefined)).toBeNull();
    expect(ficheNotice("x")).toBeNull();
  });
});
