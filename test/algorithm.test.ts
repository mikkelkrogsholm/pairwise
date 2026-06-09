import { beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = mkdtempSync(join(tmpdir(), "pairwise-algorithm-"));
process.env.DATABASE_PATH = join(tempDir, "pairwise.db");

let algorithm: typeof import("../src/algorithm.ts");
let data: typeof import("../src/db.ts");
let httpApp: typeof import("../src/index.ts").app;

beforeAll(async () => {
  algorithm = await import("../src/algorithm.ts");
  data = await import("../src/db.ts");
  httpApp = (await import("../src/index.ts")).app;
});

describe("scoreOf", () => {
  test("starts new ideas at a neutral score", () => {
    expect(algorithm.scoreOf(0, 0)).toBe(50);
  });

  test("uses a Beta(1,1) posterior mean", () => {
    expect(algorithm.scoreOf(3, 1)).toBeCloseTo((4 / 6) * 100, 8);
  });
});

describe("choosePair", () => {
  test("returns null when a survey has fewer than two active ideas", () => {
    const survey = data.createSurvey({
      title: "One idea",
      description: "",
      mode: "text",
      ideas: ["Only option"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    expect(algorithm.choosePair(survey.id)).toBeNull();
  });

  test("returns a pair from the active ideas", () => {
    const survey = data.createSurvey({
      title: "Two ideas",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    const ideas = data.listActiveIdeas(survey.id);
    const pair = algorithm.choosePair(survey.id);

    expect(pair).not.toBeNull();
    expect([pair!.left.id, pair!.right.id].sort()).toEqual(ideas.map((idea) => idea.id).sort());
  });
});

describe("vote API hardening", () => {
  test("invalid votes do not mint a replacement appearance", async () => {
    const survey = data.createSurvey({
      title: "Invalid vote",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    const before = countRows("appearances", survey.id);
    const response = await httpApp.request(`/api/s/${survey.slug}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lookup: "not-a-token", winner: 1 }),
    });
    const payload = (await response.json()) as { ok: boolean; next: unknown };

    expect(payload.ok).toBe(false);
    expect(payload.next).toBeNull();
    expect(countRows("appearances", survey.id)).toBe(before);
  });

  test("stale appearances cannot vote after an idea is deactivated", async () => {
    const survey = data.createSurvey({
      title: "Stale appearance",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    const pairResponse = await httpApp.request(`/api/s/${survey.slug}/pair`);
    const cookie = voterCookie(pairResponse);
    const pair = (await pairResponse.json()) as {
      lookup: string;
      left: { id: number };
      right: { id: number };
    };
    data.setIdeaActive(survey.id, pair.left.id, false);

    const voteResponse = await httpApp.request(`/api/s/${survey.slug}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ lookup: pair.lookup, winner: pair.left.id }),
    });
    const payload = (await voteResponse.json()) as { ok: boolean; reason: string; next: unknown };

    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe("invalid");
    expect(payload.next).toBeNull();
    expect(countRows("votes", survey.id)).toBe(0);
  });

  test("appearances can only be answered by the voter that received them", async () => {
    const survey = data.createSurvey({
      title: "Voter-bound appearance",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    const pairResponse = await httpApp.request(`/api/s/${survey.slug}/pair`);
    const firstCookie = voterCookie(pairResponse);
    const pair = (await pairResponse.json()) as {
      lookup: string;
      left: { id: number };
    };
    const secondPairResponse = await httpApp.request(`/api/s/${survey.slug}/pair`);
    const secondCookie = voterCookie(secondPairResponse);
    expect(secondCookie).not.toBe(firstCookie);

    const voteResponse = await httpApp.request(`/api/s/${survey.slug}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: secondCookie },
      body: JSON.stringify({ lookup: pair.lookup, winner: pair.left.id }),
    });
    const payload = (await voteResponse.json()) as { ok: boolean; reason: string; next: unknown };

    expect(payload.ok).toBe(false);
    expect(payload.reason).toBe("invalid");
    expect(payload.next).toBeNull();
    expect(countRows("votes", survey.id)).toBe(0);
  });

  test("forged voter cookies are ignored", async () => {
    const survey = data.createSurvey({
      title: "Signed voter cookies",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
});

    const response = await httpApp.request(`/api/s/${survey.slug}/pair`, {
      headers: { cookie: "pwid=attacker.invalid-signature" },
    });
    const cookie = voterCookie(response);
    const voter = signedCookieId(cookie);
    const row = data.db
      .query("SELECT voter_id FROM appearances WHERE survey_id = ? ORDER BY id DESC LIMIT 1")
      .get(survey.id) as { voter_id: string };

    expect(voter).not.toBe("attacker");
    expect(row.voter_id).toBe(voter);
  });

  test("skip cannot bypass the per-voter answer cap", async () => {
    const survey = data.createSurvey({
      title: "Skip cap",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });
    const pairResponse = await httpApp.request(`/api/s/${survey.slug}/pair`);
    const cookie = voterCookie(pairResponse);
    const voter = signedCookieId(cookie);
    const pair = (await pairResponse.json()) as { lookup: string };
    const insert = data.db.query(
      "INSERT INTO votes (survey_id, voter_id, kind) VALUES (?, ?, 'skip')",
    );
    for (let i = 0; i < 250; i++) insert.run(survey.id, voter);

    const response = await httpApp.request(`/api/s/${survey.slug}/skip`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ lookup: pair.lookup }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(payload.error).toBe("answer_limit");
  });
  });

describe("survey scoring integration", () => {
  test("admin ideas use the selected scoring method", () => {
    const survey = data.createSurvey({
      title: "Admin scoring",
      description: "",
      mode: "text",
      score_method: "raw",
      ideas: ["A", "B", "C"],
      allow_user_ideas: true,
      auto_activate: false,
    });
    const ideas = data.listActiveIdeas(survey.id);
    const insertVote = data.db.query(
      "INSERT INTO votes (survey_id, winner_id, loser_id, voter_id, kind) VALUES (?, ?, ?, 'test', 'vote')",
    );
    insertVote.run(survey.id, ideas[0].id, ideas[2].id);
    for (let i = 0; i < 9; i++) insertVote.run(survey.id, ideas[1].id, ideas[2].id);
    insertVote.run(survey.id, ideas[2].id, ideas[1].id);

    const adminIdeas = data.adminIdeasFor(survey.id, "raw");

    expect(adminIdeas.find((idea) => idea.id === ideas[0].id)?.score).toBe(100);
    expect(adminIdeas.find((idea) => idea.id === ideas[1].id)?.score).toBe(90);
  });
});

describe("participant and admin API hardening", () => {
  test("public survey creation is rate-limited and ignores spoofed forwarding headers by default", async () => {
    let response = new Response();
    for (let i = 0; i < 181; i++) {
      response = await httpApp.request("/surveys", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-forwarded-for": `203.0.113.${i}`,
        },
        body: new URLSearchParams({ title: "", ideas: "" }),
      });
    }

    expect(response.status).toBe(429);
    expect((await response.json()) as { error: string }).toEqual({ error: "rate_limited" });
  });

  test("invalid image uploads return an error and do not add an idea", async () => {
    const survey = data.createSurvey({
      title: "Bad image",
      description: "",
      mode: "image",
      allow_user_ideas: true,
      auto_activate: true,
    });
    const body = new FormData();
    body.set("file", new File(["not image data"], "bad.jpg", { type: "image/jpeg" }));

    const response = await httpApp.request(`/api/s/${survey.slug}/idea`, {
      method: "POST",
      headers: { "content-length": "1000" },
      body,
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("bad_file");
    expect(data.totalIdeaCount(survey.id)).toBe(0);
  });

  test("media captions use the same length limit as text ideas", async () => {
    const survey = data.createSurvey({
      title: "Long caption",
      description: "",
      mode: "image",
      allow_user_ideas: true,
      auto_activate: true,
    });
    const body = new FormData();
    body.set("text", "x".repeat(281));
    body.set("file", new File(["not decoded because caption fails first"], "bad.jpg", { type: "image/jpeg" }));

    const response = await httpApp.request(`/api/s/${survey.slug}/idea`, {
      method: "POST",
      headers: { "content-length": "1000" },
      body,
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("too_long");
    expect(data.totalIdeaCount(survey.id)).toBe(0);
  });

  test("admin mutations require the survey csrf token", async () => {
    const survey = data.createSurvey({
      title: "CSRF",
      description: "",
      mode: "text",
      ideas: ["A", "B"],
      allow_user_ideas: true,
      auto_activate: false,
    });

    const response = await httpApp.request(`/a/${survey.admin_token}/settings`, {
      method: "POST",
      body: new URLSearchParams({ title: "Changed without csrf" }),
    });

    expect(response.status).toBe(403);
    expect(data.getSurveyByToken(survey.admin_token)?.title).toBe("CSRF");
  });
});

describe("privacy page", () => {
  test("renders the GDPR privacy page in Danish and English", async () => {
    const daResponse = await httpApp.request("/privacy");
    const da = await daResponse.text();
    const enResponse = await httpApp.request("/privacy?lang=en");
    const en = await enResponse.text();

    expect(daResponse.status).toBe(200);
    expect(da).toContain("Privatliv og GDPR");
    expect(da).toContain("pseudonyme");
    expect(enResponse.status).toBe(200);
    expect(en).toContain("Privacy and GDPR");
    expect(en).toContain("pseudonymous");
  });
});

describe("database migrations", () => {
  test("old votes tables are migrated before stats queries run", () => {
    const legacyDir = mkdtempSync(join(tmpdir(), "pairwise-legacy-"));
    const dbPath = join(legacyDir, "pairwise.db");
    const legacy = new Database(dbPath, { create: true });
    legacy.exec(`
      CREATE TABLE surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        admin_token TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        allow_user_ideas INTEGER NOT NULL DEFAULT 1,
        auto_activate INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'text',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE ideas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        score REAL NOT NULL DEFAULT 50.0,
        submitted INTEGER NOT NULL DEFAULT 0,
        media TEXT,
        media_kind TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
        CREATE TABLE votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER NOT NULL,
        winner_id INTEGER,
        loser_id INTEGER,
        voter_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      CREATE TABLE pairs (
        survey_id INTEGER NOT NULL,
        a_id INTEGER NOT NULL,
        b_id INTEGER NOT NULL,
        votes INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (survey_id, a_id, b_id)
      );
        INSERT INTO surveys (id, slug, admin_token, title) VALUES (1, 'legacy', 'admin', 'Legacy');
        INSERT INTO ideas (id, survey_id, text, wins, losses) VALUES (1, 1, 'A', 1, 0), (2, 1, 'B', 0, 1);
        INSERT INTO votes (survey_id, winner_id, loser_id, voter_id) VALUES (1, 1, 2, 'voter');
      INSERT INTO pairs (survey_id, a_id, b_id, votes) VALUES (1, 1, 2, -2);
      `);
    legacy.close();

    const script = `
        import { db, surveyStats } from "./src/db.ts";
        const cols = db.query("PRAGMA table_info(votes)").all().map((c) => c.name);
        const csrf = db.query("SELECT admin_csrf_token AS token FROM surveys WHERE id = 1").get();
      const pair = db.query("SELECT votes FROM pairs WHERE survey_id = 1 AND a_id = 1 AND b_id = 2").get();
        console.log(JSON.stringify({ cols, stats: surveyStats(1), csrf, pair }));
      `;
    const output = execFileSync(process.execPath, ["-e", script], {
      cwd: join(import.meta.dir, ".."),
      env: { ...process.env, DATABASE_PATH: dbPath },
      encoding: "utf8",
    });
    const migrated = JSON.parse(output) as {
        cols: string[];
        stats: { votes: number; skips: number };
        csrf: { token: string };
      pair: { votes: number };
      };

    expect(migrated.cols).toContain("kind");
    expect(migrated.cols).toContain("appearance_id");
      expect(migrated.stats).toMatchObject({ votes: 1, skips: 0 });
      expect(migrated.csrf.token).toHaveLength(32);
    expect(migrated.pair.votes).toBe(0);

    rmSync(legacyDir, { recursive: true, force: true });
  });
});

function countRows(table: "appearances" | "votes", surveyId: number): number {
  return (data.db.query(`SELECT COUNT(*) AS c FROM ${table} WHERE survey_id = ?`).get(surveyId) as { c: number }).c;
}

function voterCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  expect(cookie).toStartWith("pwid=");
  return cookie!;
}

function signedCookieId(cookie: string): string {
  return cookie.replace(/^pwid=/, "").slice(0, cookie.replace(/^pwid=/, "").lastIndexOf("."));
}

process.on("exit", () => {
  rmSync(tempDir, { recursive: true, force: true });
});
