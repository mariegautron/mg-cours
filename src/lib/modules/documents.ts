export const DOCUMENT_KINDS = ["school_expectations", "outline_sent", "slides"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
