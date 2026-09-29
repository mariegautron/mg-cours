import { describe, expect, it } from "vitest";

import { ASSESSMENT_FILE_EXTENSIONS, assessmentFileUrl, downloadHeaders } from "./files";

describe("ASSESSMENT_FILE_EXTENSIONS", () => {
  it.each(["sujet.pdf", "extrait.html", "notes.txt", "projet.zip", "q.docx", "schema.PNG"])(
    "accepte %s",
    (name) => expect(ASSESSMENT_FILE_EXTENSIONS.test(name)).toBe(true),
  );

  it.each(["logo.svg", "script.js", "archive.exe", "sans-extension"])("refuse %s", (name) =>
    expect(ASSESSMENT_FILE_EXTENSIONS.test(name)).toBe(false),
  );
});

describe("downloadHeaders", () => {
  it("force le téléchargement, sans interprétation par le navigateur", () => {
    const h = downloadHeaders("extrait à corriger.html", 120);
    expect(h["Content-Disposition"]).toMatch(/^attachment; filename="/);
    expect(h["Content-Type"]).toBe("application/octet-stream");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Content-Security-Policy"]).toContain("sandbox");
    expect(h["Content-Length"]).toBe("120");
  });

  it("encode les accents et n'injecte jamais de guillemet dans l'en-tête", () => {
    const h = downloadHeaders('énoncé "final".html');
    expect(h["Content-Disposition"]).toContain('filename="enonce _final_.html"');
    expect(h["Content-Disposition"]).toContain(
      "filename*=UTF-8''%C3%A9nonc%C3%A9%20%22final%22.html",
    );
    expect(h["Content-Length"]).toBeUndefined();
  });
});

describe("assessmentFileUrl", () => {
  it("encode le nom", () => {
    expect(assessmentFileUrl("a1", "mon fichier.zip")).toBe(
      "/api/assessments/a1/files/mon%20fichier.zip",
    );
  });
});
