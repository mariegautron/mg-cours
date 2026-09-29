import { describe, expect, it } from "vitest";

import { normalizeSubmissionUrl, submissionSchema, submissionSummary } from "./submission";

describe("normalizeSubmissionUrl", () => {
  it("vide → null, http(s) accepté", () => {
    expect(normalizeSubmissionUrl("  ")).toBeNull();
    expect(normalizeSubmissionUrl("https://github.com/x/y")).toBe("https://github.com/x/y");
  });
  it("refuse javascript:, data: et le texte libre", () => {
    expect(normalizeSubmissionUrl("javascript:alert(1)")).toBe("invalid");
    expect(normalizeSubmissionUrl("data:text/html,x")).toBe("invalid");
    expect(normalizeSubmissionUrl("mon dépôt")).toBe("invalid");
  });
});

describe("submissionSchema / summary", () => {
  it("date au format ISO", () => {
    expect(submissionSchema.safeParse({ receivedOn: "2026-11-03" }).success).toBe(true);
    expect(submissionSchema.safeParse({ receivedOn: "03/11/2026" }).success).toBe(false);
  });
  it("résumé", () => {
    expect(submissionSummary([{ receivedOn: "2026-11-03" }, { receivedOn: null }])).toBe(
      "1/2 rendu reçu",
    );
    expect(submissionSummary([{ receivedOn: "a" }, { receivedOn: "b" }])).toBe("2/2 rendus reçus");
  });
});
