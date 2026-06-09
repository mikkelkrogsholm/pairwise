import { describe, expect, test } from "bun:test";
import { pickLocale, rich, translator } from "../src/i18n.ts";

describe("pickLocale", () => {
  test("prefers explicit locale over cookie and headers", () => {
    expect(pickLocale("en", "da", "da-DK,da;q=0.9")).toBe("en");
  });

  test("falls back to Accept-Language and then Danish", () => {
    expect(pickLocale(undefined, undefined, "en-US,en;q=0.9")).toBe("en");
    expect(pickLocale(undefined, undefined, "fr-FR,fr;q=0.9")).toBe("da");
  });
});

describe("translator", () => {
  test("interpolates variables", () => {
    expect(translator("en")("vote.count", { n: 12 })).toBe("12 votes");
  });
});

describe("rich", () => {
  test("renders trusted catalog emphasis markers", () => {
    expect(rich("Let people |choose| and *compare*")).toBe(
      "Let people <em>choose</em> and <strong>compare</strong>",
    );
  });
});
