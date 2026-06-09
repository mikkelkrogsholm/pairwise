// Media handling for image / audio / video surveys.
// Files live on disk under MEDIA_PATH (inside the data volume), one folder per
// survey: <MEDIA_PATH>/<surveyId>/<ideaId>.<ext>. Images are converted to WebP
// and downscaled with Bun's built-in image API; audio and WebM are stored as-is.

import { mkdirSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/pairwise.db";
export const MEDIA_PATH = process.env.MEDIA_PATH ?? join(dirname(DB_PATH), "media");
mkdirSync(MEDIA_PATH, { recursive: true });

const MAX_IMAGE_DIM = 1280;
const IMAGE_QUALITY = 80;

export const UPLOAD_LIMITS: Record<string, number> = {
  image: 15 * 1024 * 1024,
  audio: 30 * 1024 * 1024,
  webm: 100 * 1024 * 1024,
};

function surveyDir(surveyId: number): string {
  const dir = join(MEDIA_PATH, String(surveyId));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionOf(file: File): string {
  const name = file.name ?? "";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
}

function audioExt(file: File): string {
  const ext = extensionOf(file);
  if (/^(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/.test(ext)) return ext;
  const type = (file.type || "").toLowerCase();
  if (type.includes("wav")) return "wav";
  if (type.includes("ogg") || type.includes("opus")) return "ogg";
  if (type.includes("aac")) return "aac";
  if (type.includes("flac")) return "flac";
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  return "mp3";
}

/** Decode → downscale (never upscale) → encode WebP. Returns the relative path. */
export async function saveImage(file: File, surveyId: number, ideaId: number): Promise<string> {
  const buf = await file.arrayBuffer();
  const img = new Bun.Image(buf);
  const meta = await img.metadata();
  const maxDim = Math.max(meta.width, meta.height);
  const scale = Math.min(1, MAX_IMAGE_DIM / maxDim);
  const targetWidth = Math.max(1, Math.round(meta.width * scale));
  const out = await img.resize(targetWidth).webp({ quality: IMAGE_QUALITY }).toBuffer();
  surveyDir(surveyId);
  const rel = `${surveyId}/${ideaId}.webp`;
  await Bun.write(join(MEDIA_PATH, rel), out);
  return rel;
}

/** Store an audio file as-is. Returns the relative path. */
export async function saveAudio(file: File, surveyId: number, ideaId: number): Promise<string> {
  surveyDir(surveyId);
  const rel = `${surveyId}/${ideaId}.${audioExt(file)}`;
  await Bun.write(join(MEDIA_PATH, rel), file);
  return rel;
}

/** Store a WebM video as-is. Returns the relative path. */
export async function saveWebm(file: File, surveyId: number, ideaId: number): Promise<string> {
  surveyDir(surveyId);
  const rel = `${surveyId}/${ideaId}.webm`;
  await Bun.write(join(MEDIA_PATH, rel), file);
  return rel;
}

export async function deleteMediaFile(rel: string | null | undefined): Promise<void> {
  if (!rel || rel.includes("..")) return;
  try {
    await unlink(join(MEDIA_PATH, rel));
  } catch {
    /* already gone */
  }
}

export function isImage(file: File): boolean {
  return (file.type || "").startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|avif)$/i.test(file.name ?? "");
}
export function isAudio(file: File): boolean {
  return (file.type || "").startsWith("audio/") || /^(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i.test(extensionOf(file));
}
export function isWebm(file: File): boolean {
  return (file.type || "") === "video/webm" || /\.webm$/i.test(file.name ?? "");
}

/** Extract an 11-char YouTube id from any common URL form (or a bare id). */
export function parseYouTube(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const idLike = (s: string | null): string | null => {
    if (!s) return null;
    const m = s.match(/[a-zA-Z0-9_-]{11}/);
    return m ? m[0] : null;
  };
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return idLike(u.pathname.slice(1));
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return idLike(u.searchParams.get("v"));
      const m = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?#]+)/);
      if (m) return idLike(m[1]);
    }
  } catch {
    /* fall through to bare-id check */
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null;
}
