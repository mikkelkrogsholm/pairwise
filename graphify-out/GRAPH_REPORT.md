# Graph Report - pairwise-ideas  (2026-06-09)

## Corpus Check
- 28 files · ~23,524 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 271 nodes · 466 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `esc()` - 16 edges
2. `ingestMedia()` - 12 edges
3. `layout()` - 11 edges
4. `compilerOptions` - 11 edges
5. `What You Must Do When Invoked` - 11 edges
6. `/graphify` - 10 edges
7. `⚖️ Pairwise` - 9 edges
8. `scripts` - 7 edges
9. `choose()` - 7 edges
10. `Idea` - 7 edges

## Surprising Connections (you probably didn't know these)
- `idea()` --calls--> `bayesianScore()`  [EXTRACTED]
  test/scoring.test.ts → src/scoring.ts
- `ChosenPair` --references--> `Idea`  [EXTRACTED]
  src/algorithm.ts → src/db.ts
- `normalizeSurvey()` --calls--> `scoreMethodOrDefault()`  [EXTRACTED]
  src/db.ts → src/scoring.ts
- `signVoterId()` --calls--> `voterCookieSecret()`  [EXTRACTED]
  src/index.ts → src/db.ts
- `deleteSurveyWithMedia()` --calls--> `listAllIdeas()`  [EXTRACTED]
  src/index.ts → src/db.ts

## Import Cycles
- None detected.

## Communities (24 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (41): addIdea(), deleteIdea(), deleteSurvey(), getIdea(), totalIdeaCount(), updateIdeaMedia(), addAudioIdea(), addImageIdea() (+33 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (38): choosePair(), chooseSampledPair(), ChosenPair, activeIdeaCount(), adminIdeasFor(), Appearance, createAppearance(), createSurvey() (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): dependencies, hono, description, devDependencies, bun-types, eslint, @eslint/js, typescript (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (20): rich(), addIdeaInput(), adminAddForm(), adminPage(), createdPage(), csrfInput(), esc(), homePage() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (12): Comparison modes, Configuration, Differences from the original, How to use it, Languages, License, Local dev (Bun), ⚖️ Pairwise (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): compilerOptions, allowImportingTsExtensions, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.42
Nodes (10): advance(), api(), buildArena(), buildChoice(), choose(), el(), fmtCount(), kbd() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (14): resultsFor(), bayesianScore(), bradleyTerryScores(), effectiveScoreMethod(), isScoreMethod(), nonNegative(), rawWinRateScore(), SCORE_METHODS (+6 more)

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

## Knowledge Gaps
- **93 isolated node(s):** `version`, `configurations`, `PreToolUse`, `commonGlobals`, `browserGlobals` (+88 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Idea` connect `Community 1` to `Community 0`, `Community 8`, `Community 4`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `version`, `configurations`, `PreToolUse` to the rest of the system?**
  _93 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09308510638297872 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07308970099667775 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._