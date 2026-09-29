import { describe, expect, it } from "vitest";

import {
  checkPhoto,
  describePhotoImport,
  initials,
  isIgnoredZipEntry,
  matchPhotosToStudents,
  photoPath,
  PHOTO_MAX_BYTES,
  sniffPhotoMime,
  studentNumberFromFilename,
} from "./photo";

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
const svg = new Uint8Array(Buffer.from("<svg onload=alert(1)></svg>"));

describe("sniffPhotoMime / checkPhoto", () => {
  it("reconnaît JPEG, PNG, WebP par les octets", () => {
    expect(sniffPhotoMime(jpeg)).toBe("image/jpeg");
    expect(sniffPhotoMime(png)).toBe("image/png");
    expect(sniffPhotoMime(webp)).toBe("image/webp");
  });

  it("refuse SVG, texte, vide et trop gros", () => {
    expect(sniffPhotoMime(svg)).toBeNull();
    expect(checkPhoto(svg)).toEqual({
      ok: false,
      error: "Format non accepté (JPEG, PNG ou WebP).",
    });
    expect(checkPhoto(new Uint8Array())).toMatchObject({ ok: false });
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(jpeg);
    expect(checkPhoto(big)).toEqual({ ok: false, error: "La photo dépasse 2 Mo." });
    expect(checkPhoto(jpeg)).toEqual({ ok: true, mime: "image/jpeg" });
  });
});

describe("photoPath", () => {
  it("un dossier par propriétaire et par étudiant·e", () => {
    expect(photoPath("o", "s", "image/png", "t")).toBe("o/s/t.png");
  });
});

describe("zip", () => {
  it("numéro depuis le nom de fichier", () => {
    expect(studentNumberFromFilename("photos/A12345.JPG")).toBe("a12345");
    expect(studentNumberFromFilename("B7.png")).toBe("b7");
  });

  it("ignore dossiers, fichiers cachés et métadonnées macOS", () => {
    expect(isIgnoredZipEntry("photos/")).toBe(true);
    expect(isIgnoredZipEntry("__MACOSX/photos/._A1.jpg")).toBe(true);
    expect(isIgnoredZipEntry("photos/.DS_Store")).toBe(true);
    expect(isIgnoredZipEntry("photos/A1.jpg")).toBe(false);
  });

  it("rapproche par numéro, signale les inconnus et les numéros ambigus", () => {
    const students = [
      { id: "1", student_number: "A1" },
      { id: "2", student_number: "B2" },
      { id: "3", student_number: "C3" },
      { id: "4", student_number: "c3" },
      { id: "5", student_number: null },
    ];
    const files = [
      { name: "x/a1.jpg", file: 1 },
      { name: "B2.png", file: 2 },
      { name: "C3.jpg", file: 3 },
      { name: "Z9.jpg", file: 4 },
      { name: "B2.jpg", file: 5 },
    ];
    const r = matchPhotosToStudents(files, students);
    expect(r.matched.map((m) => [m.studentId, m.name])).toEqual([
      ["2", "B2.png"],
      ["1", "x/a1.jpg"],
    ]);
    expect(r.unmatched).toEqual(["Z9.jpg"]);
    expect(r.ambiguous).toEqual(["C3.jpg"]);
  });
});

describe("describePhotoImport / initials", () => {
  it("résume", () => {
    expect(describePhotoImport({ added: 12, unmatched: 2, ambiguous: 0, rejected: 1 })).toBe(
      "12 photos ajoutées ; 2 fichiers sans numéro étudiant correspondant ; 1 fichier refusé (format ou taille).",
    );
    expect(describePhotoImport({ added: 1, unmatched: 0, ambiguous: 0, rejected: 0 })).toBe(
      "1 photo ajoutée.",
    );
    expect(initials("élodie", "martin")).toBe("ÉM");
  });
});
