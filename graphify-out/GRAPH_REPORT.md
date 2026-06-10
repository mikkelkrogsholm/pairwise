# Graph Report - pairwise-ideas  (2026-06-10)

## Corpus Check
- 34 files · ~74,332 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 380 nodes · 623 edges · 30 communities (21 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bde65cbb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `esc()` - 20 edges
2. `ingestMedia()` - 12 edges
3. `layout()` - 11 edges
4. `compilerOptions` - 11 edges
5. `What You Must Do When Invoked` - 11 edges
6. `⚖️ Pairwise` - 11 edges
7. `Deployment Guide` - 11 edges
8. `/graphify` - 10 edges
9. `Development Guide` - 10 edges
10. `choose()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `idea()` --calls--> `bayesianScore()`  [EXTRACTED]
  test/scoring.test.ts → src/scoring.ts
- `ChosenPair` --references--> `Idea`  [EXTRACTED]
  src/algorithm.ts → src/db.ts
- `nextPairPayload()` --calls--> `choosePair()`  [EXTRACTED]
  src/index.ts → src/algorithm.ts
- `normalizeSurvey()` --calls--> `scoreMethodOrDefault()`  [EXTRACTED]
  src/db.ts → src/scoring.ts
- `requireAdmin()` --calls--> `getSurveyByToken()`  [EXTRACTED]
  src/index.ts → src/db.ts

## Import Cycles
- None detected.

## Communities (30 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (54): addIdea(), adminIdeasFor(), createAppearance(), deleteIdea(), deleteSurvey(), getIdea(), listAllIdeas(), submittedMediaIdeaCount() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (41): activeIdeaCount(), Appearance, createSurvey(), createSurveyAdmin(), db, fillMissingAdminCsrfTokens(), getAppearanceByLookup(), getIdeaByMedia() (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): dependencies, hono, description, devDependencies, bun-types, eslint, @eslint/js, typescript (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (26): Survey, rich(), ScoreMethod, addIdeaInput(), adminAccessPanel(), adminAddForm(), adminPage(), createdPage() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): Comparison modes, Configuration, Differences from the original, Documentation, How to use it, Languages, License, Local dev (Bun) (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (16): advance(), api(), buildArena(), buildChoice(), choose(), closeImageLightbox(), el(), enhanceFileInput() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (21): choosePair(), chooseSampledPair(), ChosenPair, getPairVote(), getPairVotes(), Idea, listActiveIdeas(), resultsFor() (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 12 - "Community 12"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 13 - "Community 13"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (9): Catalog, catalogs, da, en, isLocale(), LOCALES, pickLocale(), translator (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (13): Admin Tokens, CSRF, Host Header Handling, Implemented Protections, Known Limits, Media Access, Operational Recommendations, Security Notes (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.17
Nodes (11): Backups, Deployment Guide, Docker Compose, Environment Variables, Health Check, HTTPS and Cookies, Plain Docker, Reverse Proxy (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): Adding a Language, Adding a Media Mode, Adding a Scoring Method, Checks, Data Model, Development Guide, Graphify, Project Structure (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): Cookies and Consent Posture, Data Inventory, Data Subject Requests, Design Goal, Legal Basis, Privacy and GDPR Notes, Retention and Deletion, Third Parties (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): Admin Guide, Deleting a Survey, First Admin, Moderation, Multiple Admins, Revoking Admins, Rotating the Current Admin Link, Survey Lifecycle

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): Choosing a Method, Interpreting Scores, Methods and Scoring, Pair Selection: Catchup, Pairwise Voting Flow, Score Method: Bayesian Win Rate, Score Method: Bradley-Terry, Score Method: Raw Win Rate

## Knowledge Gaps
- **149 isolated node(s):** `version`, `configurations`, `PreToolUse`, `commonGlobals`, `browserGlobals` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `adminPage()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Idea` connect `Community 8` to `Community 0`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `PreToolUse` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06605222734254992 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._