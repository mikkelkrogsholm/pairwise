# Development Guide

Pairwise is a small Bun/Hono/SQLite app with server-rendered HTML and vanilla
client-side JavaScript.

## Setup

```bash
bun install
bun run dev
```

Open `http://localhost:3000`.

## Checks

Run the full local verification suite:

```bash
bun run check
```

This runs:

- TypeScript typecheck,
- ESLint,
- Bun tests.

## Project Structure

```text
src/
  index.ts       Hono routes, request validation, API handlers
  db.ts          SQLite schema, migrations, data access
  algorithm.ts   pair selection and Bayesian score helper
  scoring.ts     Bayesian, raw, and Bradley-Terry scoring
  media.ts       uploads, image conversion, YouTube parsing
  i18n.ts        Danish/English catalogs and translator
  views.ts       server-rendered HTML
public/
  app.js         voting, upload preview, lightbox, copy/confirm helpers
  styles.css     layout and UI styles
  fonts/         self-hosted fonts
test/
  *.test.ts      integration and unit tests
```

## Data Model

Core tables:

- `surveys`
- `ideas`
- `pairs`
- `appearances`
- `votes`
- `survey_admins`
- `app_meta`

Migrations are additive and run in `src/db.ts` at startup. Prefer adding columns
with `ensureColumn()` for simple schema evolution.

## Adding a Language

1. Add a catalog object in `src/i18n.ts`.
2. Add it to `catalogs`.
3. Add a display entry to `LOCALES`.
4. Run `bun run check`.

Keep catalog keys stable. Survey content itself is not translated by the app.

## Adding a Scoring Method

1. Add the method id to `SCORE_METHODS` in `src/scoring.ts`.
2. Add validation/fallback in `scoreMethodOrDefault()`.
3. Implement scoring in `scoreIdeas()`.
4. Add labels and descriptions in `src/i18n.ts`.
5. Confirm `scoreMethodSelect()` and method pages render it.
6. Add tests in `test/scoring.test.ts` and integration tests if needed.

Participants should still see the same pairwise voting flow. A scoring method
should only change ranking calculation.

## Adding a Media Mode

Media modes touch several layers:

- create form in `homePage()`,
- participant add form in `addIdeaInput()`,
- admin add form in `adminAddForm()`,
- ingestion in `src/index.ts`,
- validation/storage in `src/media.ts`,
- voting client rendering in `public/app.js`,
- preview rendering in `mediaPreview()`,
- i18n labels,
- tests.

Keep public media access behind DB checks. Do not expose a raw static directory
for uploaded files.

## Graphify

This repo keeps a graphify output in `graphify-out/`.

For codebase questions, use:

```bash
graphify query "<question>"
```

After code changes:

```bash
graphify update .
```

Dirty `graphify-out` files are expected after updates.

## Testing Guidance

Use integration tests for behaviours that cross route, database, cookie, and
view boundaries:

- admin token create/revoke/rotate,
- lifecycle status,
- media access control,
- cookie scope,
- public API hardening,
- privacy-sensitive third-party loading,
- migrations.

Use unit tests for pure scoring and parsing logic.

