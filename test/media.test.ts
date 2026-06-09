import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "pairwise-media-"));
process.env.DATABASE_PATH = join(tempDir, "pairwise.db");
process.env.MEDIA_PATH = join(tempDir, "media");

let media: typeof import("../src/media.ts");

beforeAll(async () => {
  media = await import("../src/media.ts");
});

describe("parseYouTube", () => {
  test("extracts ids from common YouTube URL shapes", () => {
    expect(media.parseYouTube("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(media.parseYouTube("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(media.parseYouTube("youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  test("accepts bare ids and rejects invalid input", () => {
    expect(media.parseYouTube("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(media.parseYouTube("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(media.parseYouTube("not a video")).toBeNull();
  });
});

describe("saveAudio", () => {
  test("does not preserve unsafe non-audio file extensions", async () => {
    const file = new File(["not really audio"], "clip.html", { type: "audio/mpeg" });

    const rel = await media.saveAudio(file, 1, 99);

    expect(rel).toBe("1/99.mp3");
  });
});

process.on("exit", () => {
  rmSync(tempDir, { recursive: true, force: true });
});
