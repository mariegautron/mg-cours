import { describe, expect, it } from "vitest";

import {
  submissionLines,
  groupByOwner,
  itemTitle,
  linkHost,
  submissionSummary,
  validateFile,
  validateLink,
  type SubmissionItemLike,
} from "./submission-items";

describe("validateLink", () => {
  it("normalise un lien https, ajoute https:// sans schéma", () => {
    expect(validateLink(" https://github.com/ana/projet ")).toEqual({
      ok: true,
      url: "https://github.com/ana/projet",
    });
    expect(validateLink("figma.com/file/abc")).toEqual({
      ok: true,
      url: "https://figma.com/file/abc",
    });
  });
  it("refuse javascript:, data:, vide, trop long, sans domaine", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://x.fr/f"]) {
      expect(validateLink(bad).ok).toBe(false);
    }
    expect(validateLink("   ").ok).toBe(false);
    expect(validateLink("https://a.fr/" + "x".repeat(2000)).ok).toBe(false);
    expect(validateLink("http://localhost").ok).toBe(false);
  });
});

describe("validateFile", () => {
  it("extensions acceptées et taille maximale", () => {
    expect(validateFile({ name: "rendu.pdf", size: 1000 })).toEqual({ ok: true });
    expect(validateFile({ name: "RENDU.ZIP", size: 1000 })).toEqual({ ok: true });
    expect(validateFile({ name: "virus.exe", size: 1000 }).ok).toBe(false);
    expect(validateFile({ name: "gros.pdf", size: 60 * 1024 * 1024 }).ok).toBe(false);
    expect(validateFile({ name: "vide.pdf", size: 0 }).ok).toBe(false);
  });
});

describe("affichage et regroupement", () => {
  const item = (over: Partial<SubmissionItemLike>): SubmissionItemLike => ({
    id: "i",
    student_id: "s1",
    group_id: null,
    kind: "link",
    url: "https://www.github.com/x",
    label: "",
    file_name: null,
    size_bytes: null,
    created_at: "2026-11-02T08:00:00Z",
    ...over,
  });
  it("titre : étiquette, nom de fichier ou domaine", () => {
    expect(itemTitle(item({ label: " Dépôt Git " }))).toBe("Dépôt Git");
    expect(itemTitle(item({}))).toBe("github.com");
    expect(itemTitle(item({ kind: "file", url: null, file_name: "rendu.pdf" }))).toBe("rendu.pdf");
    expect(linkHost("pas un lien")).toBe("pas un lien");
  });
  it("regroupe par personne ou par groupe, du plus ancien au plus récent", () => {
    const g = groupByOwner([
      item({ id: "b", created_at: "2026-11-02T09:00:00Z" }),
      item({ id: "a" }),
      item({ id: "c", student_id: null, group_id: "g1" }),
    ]);
    expect(g.get("s1")?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(g.get("g1")?.map((i) => i.id)).toEqual(["c"]);
  });
  it("résumé", () => {
    expect(submissionSummary(0)).toBe("Aucun rendu");
    expect(submissionSummary(1)).toBe("1 élément");
    expect(submissionSummary(3)).toBe("3 éléments");
  });
});

describe("submissionLines", () => {
  it("lien : son adresse ; fichier : la route de téléchargement ; élément incomplet ignoré", () => {
    const base = { student_id: "s1", group_id: null, label: "", size_bytes: null, created_at: "x" };
    const lines = submissionLines(
      [
        { ...base, id: "l", kind: "link", url: "https://github.com/a", file_name: null },
        { ...base, id: "f", kind: "file", url: null, file_name: "rendu.pdf" },
        { ...base, id: "bad", kind: "link", url: null, file_name: null },
      ],
      "A1",
    );
    expect(lines.map((l) => [l.id, l.href, l.detail])).toEqual([
      ["l", "https://github.com/a", "github.com"],
      ["f", "/api/assessments/A1/submissions/f", "fichier"],
    ]);
  });
});
