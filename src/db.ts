// SQLite data layer. Zero external dependencies — uses Bun's built-in `bun:sqlite`.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  effectiveScoreMethod,
  scoreIdeas,
  scoreMethodOrDefault,
  type ScoredIdea,
  type ScoreMethod,
  type VoteOutcome,
} from "./scoring.ts";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/pairwise.db";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      slug             TEXT UNIQUE NOT NULL,
      admin_token      TEXT UNIQUE NOT NULL,
      admin_csrf_token TEXT UNIQUE NOT NULL,
      title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    allow_user_ideas INTEGER NOT NULL DEFAULT 1,
    auto_activate    INTEGER NOT NULL DEFAULT 0,
    mode             TEXT NOT NULL DEFAULT 'text',  -- text | image | audio | video
    score_method     TEXT NOT NULL DEFAULT 'bayesian'
                     CHECK (score_method IN ('bayesian', 'raw', 'bradley_terry')),
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id  INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    text       TEXT NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    wins       INTEGER NOT NULL DEFAULT 0,
    losses     INTEGER NOT NULL DEFAULT 0,
    score      REAL NOT NULL DEFAULT 50.0,
    submitted  INTEGER NOT NULL DEFAULT 0,
    media      TEXT,             -- relative file path, or YouTube id (video)
    media_kind TEXT,             -- image | audio | webm | youtube | null(text)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ideas_survey ON ideas(survey_id, active);

  -- Per-pair vote counts (unordered: a_id < b_id). Drives the catchup weighting.
  CREATE TABLE IF NOT EXISTS pairs (
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    a_id      INTEGER NOT NULL,
    b_id      INTEGER NOT NULL,
    votes     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (survey_id, a_id, b_id)
  );

  -- One impression of a pair shown to one voter. Enables atomic anti-double-vote.
  CREATE TABLE IF NOT EXISTS appearances (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id  INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    lookup     TEXT UNIQUE NOT NULL,
    left_id    INTEGER NOT NULL,
    right_id   INTEGER NOT NULL,
    voter_id   TEXT NOT NULL,
    answered   INTEGER,            -- NULL until answered; 1 once claimed
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_appearances_lookup ON appearances(lookup);

  CREATE TABLE IF NOT EXISTS votes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    survey_id     INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    winner_id     INTEGER,
    loser_id      INTEGER,
    appearance_id INTEGER,
    voter_id      TEXT NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'vote',  -- 'vote' | 'skip'
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_votes_survey ON votes(survey_id);

  CREATE TABLE IF NOT EXISTS app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migrate databases created before multimodal support: add any missing columns.
function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}
ensureColumn("surveys", "mode", "mode TEXT NOT NULL DEFAULT 'text'");
ensureColumn("surveys", "score_method", "score_method TEXT NOT NULL DEFAULT 'bayesian'");
ensureColumn("surveys", "admin_csrf_token", "admin_csrf_token TEXT");
ensureColumn("ideas", "media", "media TEXT");
ensureColumn("ideas", "media_kind", "media_kind TEXT");
ensureColumn("appearances", "voter_id", "voter_id TEXT NOT NULL DEFAULT ''");
ensureColumn("votes", "winner_id", "winner_id INTEGER");
ensureColumn("votes", "loser_id", "loser_id INTEGER");
ensureColumn("votes", "appearance_id", "appearance_id INTEGER");
ensureColumn("votes", "voter_id", "voter_id TEXT NOT NULL DEFAULT ''");
ensureColumn("votes", "kind", "kind TEXT NOT NULL DEFAULT 'vote'");
db.exec("UPDATE surveys SET score_method = 'bayesian' WHERE score_method NOT IN ('bayesian', 'raw', 'bradley_terry');");
db.exec("UPDATE surveys SET mode = 'text' WHERE mode NOT IN ('text', 'image', 'audio', 'video');");
db.exec("UPDATE ideas SET wins = 0 WHERE wins IS NULL OR wins < 0;");
db.exec("UPDATE ideas SET losses = 0 WHERE losses IS NULL OR losses < 0;");
db.exec("UPDATE ideas SET active = CASE WHEN active = 1 THEN 1 ELSE 0 END WHERE active NOT IN (0, 1) OR active IS NULL;");
db.exec("UPDATE ideas SET submitted = CASE WHEN submitted = 1 THEN 1 ELSE 0 END WHERE submitted NOT IN (0, 1) OR submitted IS NULL;");
db.exec("UPDATE ideas SET score = 50 WHERE score IS NULL OR score < 0 OR score > 100;");
db.exec("UPDATE votes SET kind = 'vote' WHERE kind NOT IN ('vote', 'skip') OR kind IS NULL;");
db.exec("UPDATE pairs SET votes = 0 WHERE votes IS NULL OR votes < 0;");

export type SurveyMode = "text" | "image" | "audio" | "video";
export type MediaKind = "image" | "audio" | "webm" | "youtube";

export interface Survey {
  id: number;
  slug: string;
  admin_token: string;
  admin_csrf_token: string;
  title: string;
  description: string;
  allow_user_ideas: number;
  auto_activate: number;
  mode: SurveyMode;
  score_method: ScoreMethod;
  created_at: string;
}

export interface Idea {
  id: number;
  survey_id: number;
  text: string;
  active: number;
  wins: number;
  losses: number;
  score: number;
  submitted: number;
  media: string | null;
  media_kind: MediaKind | null;
  created_at: string;
}

function normalizeSurvey(row: Survey | null): Survey | null {
  if (!row) return null;
  row.score_method = scoreMethodOrDefault(row.score_method);
  row.mode = surveyModeOrDefault(row.mode);
  return row;
}

function surveyModeOrDefault(value: string | null | undefined): SurveyMode {
  return value === "image" || value === "audio" || value === "video" ? value : "text";
}

// ── identifiers ────────────────────────────────────────────────────────────

function hexToken(len = 32): string {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fillMissingAdminCsrfTokens(): void {
  const rows = db
    .query("SELECT id FROM surveys WHERE admin_csrf_token IS NULL OR admin_csrf_token = ''")
    .all() as { id: number }[];
  const update = db.query("UPDATE surveys SET admin_csrf_token = ? WHERE id = ?");
  for (const row of rows) update.run(hexToken(32), row.id);
}

fillMissingAdminCsrfTokens();

export function voterCookieSecret(): string {
  const existing = db.query("SELECT value FROM app_meta WHERE key = 'voter_cookie_secret'").get() as {
    value: string;
  } | null;
  if (existing?.value) return existing.value;

  const secret = hexToken(64);
  db.query("INSERT INTO app_meta (key, value) VALUES ('voter_cookie_secret', ?)").run(secret);
  return secret;
}

function randomSlug(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

// ── surveys ────────────────────────────────────────────────────────────────

export function getSurveyBySlug(slug: string): Survey | null {
  return normalizeSurvey(db.query("SELECT * FROM surveys WHERE slug = ?").get(slug) as Survey | null);
}

export function getSurveyByToken(token: string): Survey | null {
  return normalizeSurvey(db.query("SELECT * FROM surveys WHERE admin_token = ?").get(token) as Survey | null);
}

export function createSurvey(input: {
  title: string;
  description: string;
  mode: SurveyMode;
  score_method?: ScoreMethod;
  ideas?: string[];
  allow_user_ideas: boolean;
  auto_activate: boolean;
}): Survey {
    let slug = randomSlug();
    while (getSurveyBySlug(slug)) slug = randomSlug();
    const token = hexToken(32);
    const csrfToken = hexToken(32);

  const create = db.transaction(() => {
      const { lastInsertRowid } = db
        .query(
          `INSERT INTO surveys (slug, admin_token, admin_csrf_token, title, description, allow_user_ideas, auto_activate, mode, score_method)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          slug,
          token,
          csrfToken,
          input.title,
        input.description,
        input.allow_user_ideas ? 1 : 0,
        input.auto_activate ? 1 : 0,
        input.mode,
        input.score_method ?? "bayesian",
      );
    const surveyId = Number(lastInsertRowid);
    if (input.ideas?.length) {
      const insertIdea = db.query(
        "INSERT INTO ideas (survey_id, text, active, submitted) VALUES (?, ?, 1, 0)",
      );
      for (const text of input.ideas) insertIdea.run(surveyId, text);
    }
    return surveyId;
  });

  const id = create();
  return normalizeSurvey(db.query("SELECT * FROM surveys WHERE id = ?").get(id) as Survey | null)!;
}

export function updateSurvey(
  id: number,
  fields: {
    title: string;
    description: string;
    allow_user_ideas: boolean;
    auto_activate: boolean;
    score_method: ScoreMethod;
  },
): void {
  db.query(
    `UPDATE surveys
     SET title = ?, description = ?, allow_user_ideas = ?, auto_activate = ?, score_method = ?
     WHERE id = ?`,
  ).run(
    fields.title,
    fields.description,
    fields.allow_user_ideas ? 1 : 0,
    fields.auto_activate ? 1 : 0,
    fields.score_method,
    id,
  );
}

export function deleteSurvey(id: number): void {
  db.query("DELETE FROM surveys WHERE id = ?").run(id);
}

// ── ideas ──────────────────────────────────────────────────────────────────

export function listActiveIdeas(surveyId: number): Idea[] {
  return db
    .query("SELECT * FROM ideas WHERE survey_id = ? AND active = 1 ORDER BY id")
    .all(surveyId) as Idea[];
}

export function activeIdeaCount(surveyId: number): number {
  return (
    db.query("SELECT COUNT(*) AS c FROM ideas WHERE survey_id = ? AND active = 1").get(surveyId) as {
      c: number;
    }
  ).c;
}

export function totalIdeaCount(surveyId: number): number {
  return (
    db.query("SELECT COUNT(*) AS c FROM ideas WHERE survey_id = ?").get(surveyId) as {
      c: number;
    }
  ).c;
}

export function listAllIdeas(surveyId: number): Idea[] {
  return db
    .query("SELECT * FROM ideas WHERE survey_id = ? ORDER BY id")
    .all(surveyId) as Idea[];
}

export function getIdea(id: number): Idea | null {
  return db.query("SELECT * FROM ideas WHERE id = ?").get(id) as Idea | null;
}

export function addIdea(
  surveyId: number,
  opts: {
    text?: string;
    active: boolean;
    submitted: boolean;
    media?: string | null;
    media_kind?: MediaKind | null;
  },
): Idea {
  const { lastInsertRowid } = db
    .query(
      "INSERT INTO ideas (survey_id, text, active, submitted, media, media_kind) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      surveyId,
      opts.text ?? "",
      opts.active ? 1 : 0,
      opts.submitted ? 1 : 0,
      opts.media ?? null,
      opts.media_kind ?? null,
    );
  return getIdea(Number(lastInsertRowid))!;
}

export function updateIdeaMedia(id: number, media: string, mediaKind: MediaKind): void {
  db.query("UPDATE ideas SET media = ?, media_kind = ? WHERE id = ?").run(media, mediaKind, id);
}

export function setIdeaActive(surveyId: number, ideaId: number, active: boolean): void {
  db.query("UPDATE ideas SET active = ? WHERE id = ? AND survey_id = ?").run(
    active ? 1 : 0,
    ideaId,
    surveyId,
  );
}

export function deleteIdea(surveyId: number, ideaId: number): void {
  db.query("DELETE FROM ideas WHERE id = ? AND survey_id = ?").run(ideaId, surveyId);
}

export function resultsFor(surveyId: number, method: ScoreMethod = "bayesian"): ScoredIdea[] {
  const ideas = listActiveIdeas(surveyId);
  const activeIds = new Set(ideas.map((idea) => idea.id));
  const stats = new Map(ideas.map((idea) => [idea.id, { wins: 0, losses: 0 }]));
  const outcomes = db
    .query(
      `SELECT winner_id, loser_id, COUNT(*) AS count
       FROM votes
       WHERE survey_id = ? AND kind = 'vote' AND winner_id IS NOT NULL AND loser_id IS NOT NULL
       GROUP BY winner_id, loser_id`,
    )
    .all(surveyId) as VoteOutcome[];

  const activeOutcomes = outcomes.filter((vote) => activeIds.has(vote.winner_id) && activeIds.has(vote.loser_id));
  for (const vote of activeOutcomes) {
    const count = Number.isFinite(vote.count ?? 1) && (vote.count ?? 1) > 0 ? (vote.count ?? 1) : 0;
    stats.get(vote.winner_id)!.wins += count;
    stats.get(vote.loser_id)!.losses += count;
  }

  const scoredIdeas = ideas.map((idea) => {
    const s = stats.get(idea.id)!;
    return { ...idea, wins: s.wins, losses: s.losses };
  });
  const scoreMethod = scoreMethodOrDefault(method);
  const votes = effectiveScoreMethod(scoreMethod, scoredIdeas.length) === "bradley_terry" ? activeOutcomes : [];
  return scoreIdeas(scoredIdeas, scoreMethod, votes);
}

export function adminIdeasFor(surveyId: number, method: ScoreMethod): ScoredIdea[] {
  const ideas = listAllIdeas(surveyId);
  const scoredActive = new Map(resultsFor(surveyId, method).map((idea) => [idea.id, idea.score]));
  return ideas.map((idea) => ({ ...idea, score: scoredActive.get(idea.id) ?? idea.score }));
}

// ── pair vote counts (for the catchup algorithm) ─────────────────────────────

export function getPairVotes(surveyId: number): Map<string, number> {
  const rows = db
    .query("SELECT a_id, b_id, votes FROM pairs WHERE survey_id = ?")
    .all(surveyId) as { a_id: number; b_id: number; votes: number }[];
  const map = new Map<string, number>();
  for (const r of rows) map.set(`${r.a_id}:${r.b_id}`, r.votes);
  return map;
}

export function getPairVote(surveyId: number, leftId: number, rightId: number): number {
  const a = Math.min(leftId, rightId);
  const b = Math.max(leftId, rightId);
  const row = db
    .query("SELECT votes FROM pairs WHERE survey_id = ? AND a_id = ? AND b_id = ?")
    .get(surveyId, a, b) as { votes: number } | null;
  return row?.votes ?? 0;
}

// ── appearances ──────────────────────────────────────────────────────────────

export function createAppearance(
  surveyId: number,
  leftId: number,
  rightId: number,
  voterId: string,
): { id: number; lookup: string } {
  const lookup = hexToken(32);
  const { lastInsertRowid } = db
    .query(
      "INSERT INTO appearances (survey_id, lookup, left_id, right_id, voter_id) VALUES (?, ?, ?, ?, ?)",
    )
    .run(surveyId, lookup, leftId, rightId, voterId);
  return { id: Number(lastInsertRowid), lookup };
}

interface Appearance {
  id: number;
  survey_id: number;
  lookup: string;
  left_id: number;
  right_id: number;
  voter_id: string;
  answered: number | null;
}

function getAppearanceByLookup(lookup: string): Appearance | null {
  return db.query("SELECT * FROM appearances WHERE lookup = ?").get(lookup) as Appearance | null;
}

function appearanceIdeasAreActive(ap: Appearance): boolean {
  const row = db
    .query(
      `SELECT COUNT(*) AS c
       FROM ideas
       WHERE survey_id = ? AND active = 1 AND id IN (?, ?)`,
    )
    .get(ap.survey_id, ap.left_id, ap.right_id) as { c: number };
  return row.c === 2;
}

// ── vote / skip recording ────────────────────────────────────────────────────

export type VoteResult =
  | { ok: true; totalVotes: number }
  | { ok: false; reason: "invalid" | "already_answered" };

/**
 * Record a vote. Atomically claims the appearance (so the same impression can
 * never be counted twice), then updates wins/losses, recomputes the Bayesian
 * score, and bumps the pair vote count used by the catchup selector.
 */
export function recordVote(
  surveyId: number,
  lookup: string,
  winnerId: number,
  voterId: string,
): VoteResult {
  const ap = getAppearanceByLookup(lookup);
  if (!ap || ap.survey_id !== surveyId) return { ok: false, reason: "invalid" };
  if (ap.voter_id !== voterId) return { ok: false, reason: "invalid" };
  if (winnerId !== ap.left_id && winnerId !== ap.right_id) return { ok: false, reason: "invalid" };
  const loserId = winnerId === ap.left_id ? ap.right_id : ap.left_id;

  const tx = db.transaction((): VoteResult => {
    if (!appearanceIdeasAreActive(ap)) return { ok: false, reason: "invalid" };

    // Atomic claim — only one writer can flip answered from NULL → 1.
    const claim = db
      .query("UPDATE appearances SET answered = 1 WHERE id = ? AND answered IS NULL")
      .run(ap.id);
    if (claim.changes !== 1) return { ok: false, reason: "already_answered" };

    db.query(
      "INSERT INTO votes (survey_id, winner_id, loser_id, appearance_id, voter_id, kind) VALUES (?, ?, ?, ?, ?, 'vote')",
    ).run(surveyId, winnerId, loserId, ap.id, voterId);

    db.query("UPDATE ideas SET wins = wins + 1 WHERE id = ?").run(winnerId);
    db.query("UPDATE ideas SET losses = losses + 1 WHERE id = ?").run(loserId);
    // score = (wins + 1) / (wins + losses + 2) * 100  — Beta(1,1) posterior mean.
    db.query(
      "UPDATE ideas SET score = (CAST(wins AS REAL) + 1) / (wins + losses + 2) * 100 WHERE id IN (?, ?)",
    ).run(winnerId, loserId);

    const a = Math.min(winnerId, loserId);
    const b = Math.max(winnerId, loserId);
    db.query(
      `INSERT INTO pairs (survey_id, a_id, b_id, votes) VALUES (?, ?, ?, 1)
       ON CONFLICT(survey_id, a_id, b_id) DO UPDATE SET votes = votes + 1`,
    ).run(surveyId, a, b);

    const { c } = db
      .query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND kind = 'vote'")
      .get(surveyId) as { c: number };
    return { ok: true, totalVotes: c };
  });

  return tx();
}

export function recordSkip(surveyId: number, lookup: string, voterId: string): VoteResult {
  const ap = getAppearanceByLookup(lookup);
  if (!ap || ap.survey_id !== surveyId) return { ok: false, reason: "invalid" };
  if (ap.voter_id !== voterId) return { ok: false, reason: "invalid" };

  const tx = db.transaction((): VoteResult => {
    if (!appearanceIdeasAreActive(ap)) return { ok: false, reason: "invalid" };

    const claim = db
      .query("UPDATE appearances SET answered = 1 WHERE id = ? AND answered IS NULL")
      .run(ap.id);
    if (claim.changes !== 1) return { ok: false, reason: "already_answered" };
    db.query(
      "INSERT INTO votes (survey_id, appearance_id, voter_id, kind) VALUES (?, ?, ?, 'skip')",
    ).run(surveyId, ap.id, voterId);
    const { c } = db
      .query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND kind = 'vote'")
      .get(surveyId) as { c: number };
    return { ok: true, totalVotes: c };
  });

  return tx();
}

// ── stats ─────────────────────────────────────────────────────────────────

export function surveyStats(surveyId: number) {
  const votes = (
    db.query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND kind = 'vote'").get(surveyId) as {
      c: number;
    }
  ).c;
  const skips = (
    db.query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND kind = 'skip'").get(surveyId) as {
      c: number;
    }
  ).c;
  const active = (
    db.query("SELECT COUNT(*) AS c FROM ideas WHERE survey_id = ? AND active = 1").get(surveyId) as {
      c: number;
    }
  ).c;
  const pending = (
    db
      .query("SELECT COUNT(*) AS c FROM ideas WHERE survey_id = ? AND active = 0 AND submitted = 1")
      .get(surveyId) as { c: number }
  ).c;
  return { votes, skips, active, pending };
}

export function voterVoteCount(surveyId: number, voterId: string): number {
  return (
    db.query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND voter_id = ? AND kind = 'vote'").get(
      surveyId,
      voterId,
    ) as { c: number }
  ).c;
}

export function voterAnswerCount(surveyId: number, voterId: string): number {
  return (
    db.query("SELECT COUNT(*) AS c FROM votes WHERE survey_id = ? AND voter_id = ?").get(
      surveyId,
      voterId,
    ) as { c: number }
  ).c;
}
