import { Hono, type Context } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie, setCookie } from "hono/cookie";
import { createHmac, timingSafeEqual } from "node:crypto";
import { join } from "node:path";

import { choosePair } from "./algorithm.ts";
import {
  addIdea,
  activeIdeaCount,
  adminIdeasFor,
  createSurveyAdmin,
  createAppearance,
  createSurvey,
  deleteIdea,
  deleteSurvey,
  getIdea,
  getIdeaByMedia,
  getSurveyBySlug,
  getSurveyByToken,
  listAllIdeas,
  listSurveyAdmins,
  recordSkip,
  recordVote,
  resultsFor,
  revokeSurveyAdmin,
  rotateSurveyAdmin,
  setIdeaActive,
  submittedMediaIdeaCount,
  surveyStats,
  totalIdeaCount,
  updateIdeaMedia,
  updateSurvey,
  updateSurveyStatus,
  voterAnswerCount,
  voterCookieSecret,
  type Idea,
  type Survey,
  type SurveyMode,
} from "./db.ts";
import {
  MEDIA_PATH,
  UPLOAD_LIMITS,
  deleteMediaFile,
  isAudio,
  isImage,
  isWebm,
  parseYouTube,
  saveAudio,
  saveImage,
  saveWebm,
} from "./media.ts";
import { pickLocale, translator, type Translator } from "./i18n.ts";
import { effectiveScoreMethod, scoreMethodOrDefault } from "./scoring.ts";
import {
  adminPage,
  createdPage,
  homePage,
  methodPage,
  notFoundPage,
  privacyPage,
  resultsPage,
  votePage,
} from "./views.ts";

export const app = new Hono();

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

const MAX_CREATE_BODY = 180 * 1024 * 1024;
const MAX_UPLOAD_BODY = 110 * 1024 * 1024;
const MAX_TEXT_BODY = 256 * 1024;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_IDEA_TEXT_LENGTH = 280;
const MAX_INITIAL_IDEAS = 500;
const MAX_SURVEY_IDEAS = 500;
const MAX_PARTICIPANT_MEDIA_SUBMISSIONS = 50;
const MAX_PARTICIPANT_UPLOAD_BODY = 12 * 1024 * 1024;
const MAX_ANSWERS_PER_VOTER_PER_SURVEY = 250;
const API_RATE_WINDOW_MS = 60_000;
const API_RATE_LIMIT = 180;
const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === "1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const SECURE_COOKIES = process.env.NODE_ENV === "production";
const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN ?? "").replace(/\/+$/, "");

// ── i18n + voter helpers ─────────────────────────────────────────────────────

app.use("*", async (c, next) => {
  await next();
  const q = c.req.query("lang");
  const cookie = getCookie(c, "lang");
  const locale = pickLocale(q, cookie, c.req.header("accept-language"));
  if (q && q === locale && q !== cookie) {
    setCookie(c, "lang", locale, {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "Lax",
      httpOnly: true,
      secure: SECURE_COOKIES,
    });
  }
});

function i18n(c: Context): { locale: string; t: Translator } {
  const q = c.req.query("lang");
  const cookie = getCookie(c, "lang");
  const locale = pickLocale(q, cookie, c.req.header("accept-language"));
  return { locale, t: translator(locale) };
}

function voterCookieName(survey: Survey): string {
  return `pwid_${survey.slug}`;
}

function voterId(c: Context, survey: Survey): string {
  const cookieName = voterCookieName(survey);
  const existing = parseSignedVoterCookie(getCookie(c, cookieName), survey.id);
  if (existing) return existing;

  const id = crypto.randomUUID();
  setCookie(c, cookieName, signedVoterCookie(survey.id, id), {
    httpOnly: true,
    sameSite: "Lax",
    secure: SECURE_COOKIES,
    path: `/api/s/${survey.slug}`,
    maxAge: COOKIE_MAX_AGE,
  });
  return id;
}

const publicOrigin = () => PUBLIC_ORIGIN;

function signedVoterCookie(surveyId: number, id: string): string {
  return `${id}.${signVoterId(surveyId, id)}`;
}

function signVoterId(surveyId: number, id: string): string {
  return createHmac("sha256", voterCookieSecret()).update(`${surveyId}:${id}`).digest("base64url");
}

function parseSignedVoterCookie(raw: string | undefined, surveyId: number): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!id || !signature) return null;
  const expected = signVoterId(surveyId, id);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(actualBuffer, expectedBuffer) ? id : null;
}

// ── form helpers ─────────────────────────────────────────────────────────────

type Field = string | File | (string | File)[] | undefined;
const str = (v: Field): string => (typeof v === "string" ? v.trim() : "");
const lines = (s: string): string[] => s.split("\n").map((l) => l.trim()).filter(Boolean);
function asFiles(v: Field): File[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.filter((x): x is File => x instanceof File && x.size > 0);
}
const within = (f: File, kind: string) => f.size <= (UPLOAD_LIMITS[kind] ?? Infinity);
const participantWithin = (f: File, kind: string) =>
  f.size <= Math.min(UPLOAD_LIMITS[kind] ?? Infinity, kind === "audio" ? 10 * 1024 * 1024 : 5 * 1024 * 1024);

function tooLarge(status = 413) {
  return new Response("Payload too large", { status });
}

async function rejectLargeBody(c: Context, max: number, json = false): Promise<Response | null> {
  if (!c.req.raw.body) return null;
  const contentLength = c.req.header("content-length");
  const hasTransferEncoding = !!c.req.header("transfer-encoding");
  if (contentLength && !hasTransferEncoding) {
    const size = Number(contentLength);
    if (!Number.isFinite(size) || size > max) return json ? c.json({ error: "payload_too_large" }, 413) : tooLarge();
    return null;
  }
  if (!contentLength || hasTransferEncoding) {
    if (max > MAX_TEXT_BODY) {
      return json
        ? c.json({ error: "length_required" }, 411)
        : new Response("Length required", { status: 411 });
    }
  }

  let size = 0;
  const chunks: Uint8Array[] = [];
  const reader = c.req.raw.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) return json ? c.json({ error: "payload_too_large" }, 413) : tooLarge();
    chunks.push(value);
  }
  c.req.raw = new Request(c.req.raw, {
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
    duplex: "half",
  });
  return null;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function clientKey(c: Context): string {
  if (!TRUST_PROXY_HEADERS) return "direct";
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return c.req.header("cf-connecting-ip") ?? forwarded ?? c.req.header("x-real-ip") ?? "local";
}

function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  for (const [bucketKey, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(bucketKey);
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

function rejectRateLimited(c: Context, scope: string): Response | null {
  const key = `${scope}:${clientKey(c)}`;
  return rateLimited(key, API_RATE_LIMIT, API_RATE_WINDOW_MS) ? c.json({ error: "rate_limited" }, 429) : null;
}

// ── media idea ingestion ─────────────────────────────────────────────────────

async function addImageIdea(
  survey: Survey,
  file: File,
  caption: string,
  o: { active: boolean; submitted: boolean },
): Promise<Idea | null> {
  const idea = addIdea(survey.id, { text: caption, active: o.active, submitted: o.submitted, media_kind: "image" });
  try {
    updateIdeaMedia(idea.id, await saveImage(file, survey.id, idea.id), "image");
    return getIdea(idea.id);
  } catch {
    deleteIdea(survey.id, idea.id); // undecodable upload → drop it
    return null;
  }
}
async function addAudioIdea(
  survey: Survey,
  file: File,
  caption: string,
  o: { active: boolean; submitted: boolean },
): Promise<Idea | null> {
  const idea = addIdea(survey.id, { text: caption, active: o.active, submitted: o.submitted, media_kind: "audio" });
  try {
    updateIdeaMedia(idea.id, await saveAudio(file, survey.id, idea.id), "audio");
    return getIdea(idea.id);
  } catch {
    deleteIdea(survey.id, idea.id);
    return null;
  }
}
async function addWebmIdea(
  survey: Survey,
  file: File,
  caption: string,
  o: { active: boolean; submitted: boolean },
): Promise<Idea | null> {
  const idea = addIdea(survey.id, { text: caption, active: o.active, submitted: o.submitted, media_kind: "webm" });
  try {
    updateIdeaMedia(idea.id, await saveWebm(file, survey.id, idea.id), "webm");
    return getIdea(idea.id);
  } catch {
    deleteIdea(survey.id, idea.id);
    return null;
  }
}

// Ingest whatever media a multipart body carries for the survey's mode.
async function ingestMedia(
  survey: Survey,
  body: Record<string, Field>,
  o: { active: boolean; submitted: boolean; limit?: number },
): Promise<number> {
  let added = 0;
  const remaining = () => o.limit === undefined || added < o.limit;
  const files = asFiles(body.media);
  if (survey.mode === "image") {
    for (const f of files) {
      if (!remaining()) break;
      if (isImage(f) && within(f, "image") && (await addImageIdea(survey, f, "", o))) added += 1;
    }
  } else if (survey.mode === "audio") {
    for (const f of files) {
      if (!remaining()) break;
      if (isAudio(f) && within(f, "audio") && (await addAudioIdea(survey, f, "", o))) added += 1;
    }
  } else if (survey.mode === "video") {
    for (const url of lines(str(body.youtube))) {
      if (!remaining()) break;
      const id = parseYouTube(url);
      if (id) {
        addIdea(survey.id, { active: o.active, submitted: o.submitted, media: id, media_kind: "youtube" });
        added += 1;
      }
    }
    for (const f of files) {
      if (!remaining()) break;
      if (isWebm(f) && within(f, "webm") && (await addWebmIdea(survey, f, "", o))) added += 1;
    }
  }
  return added;
}

function mediaCandidateCount(mode: SurveyMode, body: Record<string, Field>): number {
  const files = asFiles(body.media);
  if (mode === "image") return files.filter((file) => isImage(file) && within(file, "image")).length;
  if (mode === "audio") return files.filter((file) => isAudio(file) && within(file, "audio")).length;
  if (mode === "video") {
    return (
      lines(str(body.youtube)).filter((url) => parseYouTube(url)).length +
      files.filter((file) => isWebm(file) && within(file, "webm")).length
    );
  }
  return 0;
}

function surveyHasRoom(survey: Survey): boolean {
  return totalIdeaCount(survey.id) < MAX_SURVEY_IDEAS;
}

function surveyHasParticipantMediaRoom(survey: Survey): boolean {
  return submittedMediaIdeaCount(survey.id) < MAX_PARTICIPANT_MEDIA_SUBMISSIONS;
}

function surveyAcceptsParticipantInput(survey: Survey): boolean {
  return survey.status === "open";
}

async function deleteSurveyWithMedia(survey: Survey): Promise<void> {
  for (const idea of listAllIdeas(survey.id)) {
    if (idea.media && idea.media_kind && idea.media_kind !== "youtube") await deleteMediaFile(idea.media);
  }
  deleteSurvey(survey.id);
}

// ── pair payload (with media) ────────────────────────────────────────────────

function ideaPayload(idea: Idea) {
  const kind = idea.media_kind ?? "text";
  return {
    id: idea.id,
    text: idea.text,
    kind,
    src: idea.media && kind !== "youtube" && kind !== "text" ? `/media/${idea.media}` : null,
    youtube: kind === "youtube" ? idea.media : null,
  };
}
function nextPairPayload(survey: Survey, voter: string) {
  const pair = choosePair(survey.id);
  if (!pair) return null;
  const { lookup } = createAppearance(survey.id, pair.left.id, pair.right.id, voter);
  return { lookup, left: ideaPayload(pair.left), right: ideaPayload(pair.right) };
}

// ── static assets ────────────────────────────────────────────────────────────

app.get("/styles.css", serveStatic({ path: "./public/styles.css" }));
app.get("/app.js", serveStatic({ path: "./public/app.js" }));
app.get("/fonts/*", serveStatic({ root: "./public" }));

function validMediaRel(rel: string): boolean {
  return /^\d+\/[a-zA-Z0-9._-]+$/.test(rel) && !rel.includes("..");
}

function mediaContentType(rel: string): string {
  if (/\.webp$/i.test(rel)) return "image/webp";
  if (/\.webm$/i.test(rel)) return "video/webm";
  if (/\.mp3$/i.test(rel)) return "audio/mpeg";
  if (/\.wav$/i.test(rel)) return "audio/wav";
  if (/\.(ogg|oga|opus)$/i.test(rel)) return "audio/ogg";
  if (/\.(m4a|aac)$/i.test(rel)) return "audio/aac";
  if (/\.flac$/i.test(rel)) return "audio/flac";
  return "application/octet-stream";
}

async function mediaResponse(rel: string): Promise<Response> {
  if (!validMediaRel(rel)) return new Response("Not found", { status: 404 });
  const file = Bun.file(join(MEDIA_PATH, rel));
  if (!(await file.exists())) return new Response("Not found", { status: 404 });
  return new Response(file, { headers: { "content-type": mediaContentType(rel), "cache-control": "private, max-age=3600" } });
}

app.get("/media/:surveyId/:file", async (c) => {
  const rel = `${c.req.param("surveyId")}/${c.req.param("file")}`;
  const idea = validMediaRel(rel) ? getIdeaByMedia(rel) : null;
  if (!idea || idea.active !== 1 || String(idea.survey_id) !== c.req.param("surveyId")) {
    return new Response("Not found", { status: 404 });
  }
  return mediaResponse(rel);
});

// ── home / create ────────────────────────────────────────────────────────────

app.get("/", (c) => {
  const { t, locale } = i18n(c);
  return html(homePage(t, locale));
});

app.get("/method", (c) => {
  const { t, locale } = i18n(c);
  return html(methodPage(t, locale));
});

app.get("/privacy", (c) => {
  const { t, locale } = i18n(c);
  return html(privacyPage(t, locale));
});

app.post("/surveys", async (c) => {
  const { t, locale } = i18n(c);
  const limited = rejectRateLimited(c, "create");
  if (limited) return limited;
  const tooLargeResponse = await rejectLargeBody(c, MAX_CREATE_BODY);
  if (tooLargeResponse) return html(homePage(t, locale, t("err.payload_too_large")), 413);
  const body = (await c.req.parseBody({ all: true })) as Record<string, Field>;
  const title = str(body.title);
  const description = str(body.description);
  const raw = str(body.mode);
  const mode = (["text", "image", "audio", "video"].includes(raw) ? raw : "text") as SurveyMode;
  const score_method = scoreMethodOrDefault(str(body.score_method));
  const allow_user_ideas = !!body.allow_user_ideas;
  const auto_activate = !!body.auto_activate;

  if (!title) return html(homePage(t, locale, t("err.title_required")), 400);
  if (title.length > MAX_TITLE_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
    return html(homePage(t, locale, t("err.text_too_long")), 400);
  }

  if (mode === "text") {
    const ideas = lines(str(body.ideas));
    if (ideas.length < 2) return html(homePage(t, locale, t("err.min_ideas")), 400);
    if (ideas.length > MAX_INITIAL_IDEAS || ideas.some((idea) => idea.length > MAX_IDEA_TEXT_LENGTH)) {
      return html(homePage(t, locale, t("err.ideas_too_large")), 400);
    }
    const survey = createSurvey({ title, description, mode, score_method, ideas, allow_user_ideas, auto_activate });
    return html(createdPage(t, locale, survey, publicOrigin()));
  }

  const candidates = mediaCandidateCount(mode, body);
  if (candidates > MAX_INITIAL_IDEAS) return html(homePage(t, locale, t("err.ideas_too_large")), 400);
  const survey = createSurvey({ title, description, mode, score_method, allow_user_ideas, auto_activate });
  await ingestMedia(survey, body, { active: true, submitted: false, limit: MAX_INITIAL_IDEAS });
  if (activeIdeaCount(survey.id) < 2) {
    await deleteSurveyWithMedia(survey);
    return html(homePage(t, locale, t("err.min_media")), 400);
  }
  return html(createdPage(t, locale, survey, publicOrigin()));
});

// ── public vote + results ────────────────────────────────────────────────────

app.get("/s/:slug", (c) => {
  const { t, locale } = i18n(c);
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return html(notFoundPage(t, locale), 404);
  if (survey.status === "archived") return html(notFoundPage(t, locale), 404);
  const canVote = surveyAcceptsParticipantInput(survey) && activeIdeaCount(survey.id) >= 2;
  return html(votePage(t, locale, survey, canVote, surveyStats(survey.id).votes));
});

app.get("/s/:slug/results", (c) => {
  const { t, locale } = i18n(c);
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return html(notFoundPage(t, locale), 404);
  const ideas = resultsFor(survey.id, survey.score_method);
  const method = effectiveScoreMethod(survey.score_method, ideas.length);
  return html(resultsPage(t, locale, survey, ideas, surveyStats(survey.id).votes, method));
});

// ── voting API ───────────────────────────────────────────────────────────────

app.get("/api/s/:slug/pair", (c) => {
  const limited = rejectRateLimited(c, "pair");
  if (limited) return limited;
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return c.json({ error: "not_found" }, 404);
  if (!surveyAcceptsParticipantInput(survey)) return c.json({ error: "survey_closed" }, 403);
  const voter = voterId(c, survey);
  if (voterAnswerCount(survey.id, voter) >= MAX_ANSWERS_PER_VOTER_PER_SURVEY) return c.json({ error: "answer_limit" }, 429);
  const next = nextPairPayload(survey, voter);
  if (!next) return c.json({ error: "not_enough" }, 200);
  return c.json(next);
});

app.post("/api/s/:slug/vote", async (c) => {
  const limited = rejectRateLimited(c, "vote");
  if (limited) return limited;
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY, true);
  if (tooLargeResponse) return tooLargeResponse;
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return c.json({ error: "not_found" }, 404);
  if (!surveyAcceptsParticipantInput(survey)) return c.json({ error: "survey_closed" }, 403);
  const voter = voterId(c, survey);
  if (voterAnswerCount(survey.id, voter) >= MAX_ANSWERS_PER_VOTER_PER_SURVEY) return c.json({ error: "answer_limit" }, 429);
  const body = (await c.req.json().catch(() => ({}))) as { lookup?: string; winner?: number };
  if (!body.lookup || !body.winner) return c.json({ error: "bad_request" }, 400);
  const result = recordVote(survey.id, body.lookup, Number(body.winner), voter);
  if (!result.ok) return c.json({ ok: false, reason: result.reason, next: null }, 200);
  const next =
    voterAnswerCount(survey.id, voter) >= MAX_ANSWERS_PER_VOTER_PER_SURVEY ? null : nextPairPayload(survey, voter);
  return c.json({ ok: true, totalVotes: result.totalVotes, next });
});

app.post("/api/s/:slug/skip", async (c) => {
  const limited = rejectRateLimited(c, "skip");
  if (limited) return limited;
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY, true);
  if (tooLargeResponse) return tooLargeResponse;
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return c.json({ error: "not_found" }, 404);
  if (!surveyAcceptsParticipantInput(survey)) return c.json({ error: "survey_closed" }, 403);
  const voter = voterId(c, survey);
  if (voterAnswerCount(survey.id, voter) >= MAX_ANSWERS_PER_VOTER_PER_SURVEY) return c.json({ error: "answer_limit" }, 429);
  const body = (await c.req.json().catch(() => ({}))) as { lookup?: string };
  if (!body.lookup) return c.json({ error: "bad_request" }, 400);
  const result = recordSkip(survey.id, body.lookup, voter);
  const next =
    result.ok && voterAnswerCount(survey.id, voter) < MAX_ANSWERS_PER_VOTER_PER_SURVEY
      ? nextPairPayload(survey, voter)
      : null;
  return c.json({ ok: result.ok, next });
});

// participant-submitted ideas (multipart, mode-aware)
app.post("/api/s/:slug/idea", async (c) => {
  const limited = rejectRateLimited(c, "idea");
  if (limited) return limited;
  const survey = getSurveyBySlug(c.req.param("slug"));
  if (!survey) return c.json({ error: "not_found" }, 404);
  if (!surveyAcceptsParticipantInput(survey)) return c.json({ error: "survey_closed" }, 403);
  if (!survey.allow_user_ideas) return c.json({ error: "not_allowed" }, 403);
  const maxBody = survey.mode === "text" || survey.mode === "video" ? MAX_TEXT_BODY : MAX_PARTICIPANT_UPLOAD_BODY;
  const tooLargeResponse = await rejectLargeBody(c, maxBody, true);
  if (tooLargeResponse) return tooLargeResponse;
  if (!surveyHasRoom(survey)) return c.json({ error: "survey_full" }, 409);
  if ((survey.mode === "image" || survey.mode === "audio") && !surveyHasParticipantMediaRoom(survey)) {
    return c.json({ error: "survey_full" }, 409);
  }
  const active = !!survey.auto_activate;
  const opts = { active, submitted: true };
  const body = (await c.req.parseBody({ all: true }).catch(() => ({}))) as Record<string, Field>;

  if (survey.mode === "text") {
    const text = str(body.text);
    if (!text) return c.json({ error: "empty" }, 400);
    if (text.length > MAX_IDEA_TEXT_LENGTH) return c.json({ error: "too_long" }, 400);
    addIdea(survey.id, { text, ...opts });
  } else if (survey.mode === "image") {
    const caption = str(body.text);
    if (caption.length > MAX_IDEA_TEXT_LENGTH) return c.json({ error: "too_long" }, 400);
    const f = asFiles(body.file)[0];
    if (!f || !isImage(f) || !participantWithin(f, "image")) return c.json({ error: "bad_file" }, 400);
    if (!(await addImageIdea(survey, f, caption, opts))) return c.json({ error: "bad_file" }, 400);
  } else if (survey.mode === "audio") {
    const caption = str(body.text);
    if (caption.length > MAX_IDEA_TEXT_LENGTH) return c.json({ error: "too_long" }, 400);
    const f = asFiles(body.file)[0];
    if (!f || !isAudio(f) || !participantWithin(f, "audio")) return c.json({ error: "bad_file" }, 400);
    if (!(await addAudioIdea(survey, f, caption, opts))) return c.json({ error: "bad_file" }, 400);
  } else if (survey.mode === "video") {
    const id = parseYouTube(str(body.url));
    if (!id) return c.json({ error: "bad_url" }, 400);
    addIdea(survey.id, { ...opts, media: id, media_kind: "youtube" });
  }
  return c.json({ ok: true, active });
});

// ── admin ────────────────────────────────────────────────────────────────────

const requireAdmin = (c: Context): Survey | null => getSurveyByToken(c.req.param("token") ?? "");
const adminRedirect = (token: string) =>
  new Response(null, { status: 303, headers: { location: `/a/${token}` } });
const validAdminCsrf = (survey: Survey, body: Record<string, Field>): boolean =>
  str(body.csrf) === survey.admin_csrf_token;

app.get("/a/:token", (c) => {
  const { t, locale } = i18n(c);
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(t, locale), 404);
  return html(
    adminPage(
      t,
      locale,
      survey,
      adminIdeasFor(survey.id, survey.score_method),
      surveyStats(survey.id),
      listSurveyAdmins(survey.id),
      publicOrigin(),
    ),
  );
});

app.get("/a/:token/media/:id", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return new Response("Not found", { status: 404 });
  const idea = getIdea(Number(c.req.param("id")));
  if (!idea || idea.survey_id !== survey.id || !idea.media || !idea.media_kind || idea.media_kind === "youtube") {
    return new Response("Not found", { status: 404 });
  }
  return mediaResponse(idea.media);
});

app.post("/a/:token/ideas", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, survey.mode === "text" ? MAX_TEXT_BODY : MAX_UPLOAD_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody({ all: true })) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  if (!surveyHasRoom(survey)) return new Response("Survey is full", { status: 409 });
  if (survey.mode === "text") {
    const text = str(body.text);
    if (!text || text.length > MAX_IDEA_TEXT_LENGTH) return new Response("Bad request", { status: 400 });
    addIdea(survey.id, { text, active: true, submitted: false });
  } else {
    // admin add uses the same field names as create (media / youtube)
    const room = MAX_SURVEY_IDEAS - totalIdeaCount(survey.id);
    await ingestMedia(survey, body, { active: true, submitted: false, limit: room });
  }
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/ideas/:id/activate", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  setIdeaActive(survey.id, Number(c.req.param("id")), true);
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/ideas/:id/deactivate", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  setIdeaActive(survey.id, Number(c.req.param("id")), false);
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/ideas/:id/delete", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const idea = getIdea(Number(c.req.param("id")));
  if (idea && idea.survey_id === survey.id) {
    if (idea.media && idea.media_kind && idea.media_kind !== "youtube") await deleteMediaFile(idea.media);
    deleteIdea(survey.id, idea.id);
  }
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/settings", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const title = String(body.title ?? survey.title).trim() || survey.title;
  const description = String(body.description ?? "").trim();
  if (title.length > MAX_TITLE_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) return adminRedirect(survey.admin_token);
  updateSurvey(survey.id, {
    title,
    description,
    allow_user_ideas: !!body.allow_user_ideas,
    auto_activate: !!body.auto_activate,
    score_method: scoreMethodOrDefault(String(body.score_method ?? survey.score_method)),
  });
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/status", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const status = str(body.status);
  if (status !== "open" && status !== "closed" && status !== "archived") return new Response("Bad request", { status: 400 });
  updateSurveyStatus(survey.id, status);
  return adminRedirect(survey.admin_token);
});

app.post("/a/:token/delete", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  await deleteSurveyWithMedia(survey);
  return new Response(null, { status: 303, headers: { location: "/" } });
});

app.post("/a/:token/admins", async (c) => {
  const { t, locale } = i18n(c);
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(t, locale), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const label = str(body.label);
  if (label.length > 80) return new Response("Bad request", { status: 400 });
  const revealedAdmin = createSurveyAdmin(survey.id, label);
  return html(
    adminPage(
      t,
      locale,
      survey,
      adminIdeasFor(survey.id, survey.score_method),
      surveyStats(survey.id),
      listSurveyAdmins(survey.id),
      publicOrigin(),
      revealedAdmin,
    ),
  );
});

app.post("/a/:token/admins/rotate", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const rotated = rotateSurveyAdmin(survey.id, survey.admin_token);
  if (!rotated) return new Response("Not found", { status: 404 });
  return adminRedirect(rotated.token);
});

app.post("/a/:token/admins/:id/revoke", async (c) => {
  const survey = requireAdmin(c);
  if (!survey) return html(notFoundPage(translator("da"), "da"), 404);
  const tooLargeResponse = await rejectLargeBody(c, MAX_TEXT_BODY);
  if (tooLargeResponse) return tooLargeResponse;
  const body = (await c.req.parseBody()) as Record<string, Field>;
  if (!validAdminCsrf(survey, body)) return new Response("Forbidden", { status: 403 });
  const adminId = Number(c.req.param("id"));
  const target = listSurveyAdmins(survey.id).find((admin) => admin.id === adminId);
  if (!target || target.id === survey.admin_id) return new Response("Bad request", { status: 400 });
  revokeSurveyAdmin(survey.id, adminId);
  return adminRedirect(survey.admin_token);
});

app.notFound((c) => {
  const { t, locale } = i18n(c);
  return html(notFoundPage(t, locale), 404);
});

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  const server = Bun.serve({ port, fetch: app.fetch });
  console.log(`⚖️  Pairwise running on http://localhost:${server.port}`);
}
