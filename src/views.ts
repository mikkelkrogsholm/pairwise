// Server-rendered HTML. Template-literal views, no build step, no client framework.
import type { Idea, Survey, SurveyAdmin } from "./db.ts";
import { LOCALES, rich, type Translator } from "./i18n.ts";
import { SCORE_METHODS, type ScoreMethod } from "./scoring.ts";

export function esc(s: unknown): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Safe to embed inside a <script> tag (escapes the `</` sequence).
function jsonScript(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

function langSwitcher(t: Translator, locale: string): string {
  if (LOCALES.length < 2) return "";
  return `<select class="lang-select" aria-label="${esc(t("lang.label"))}" onchange="location.href='?lang='+this.value">
    ${LOCALES.map((l) => `<option value="${l.code}" ${l.code === locale ? "selected" : ""}>${esc(l.name)}</option>`).join("")}
  </select>`;
}

function layout(t: Translator, locale: string, opts: { title: string; body: string }): string {
  return `<!doctype html>
<html lang="${esc(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.title)}</title>
  <link rel="stylesheet" href="/styles.css" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='3' y='3' width='17' height='17' rx='5' fill='none' stroke='%2322201c' stroke-width='2.6'/><rect x='12' y='12' width='17' height='17' rx='5' fill='%23bd5536'/></svg>" />
  <meta name="description" content="Pairwise — collect and prioritise ideas through pairwise choices. Self-hosted, open source." />
  <script>(function(){var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;})();</script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/">
      <svg class="brand-mark" width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="17" height="17" rx="5" stroke="currentColor" stroke-width="2.4" />
        <rect x="12" y="12" width="17" height="17" rx="5" fill="var(--accent)" />
      </svg>
      <span class="brand-name">Pairwise</span>
    </a>
    <div class="header-tools">
      ${langSwitcher(t, locale)}
      <button class="theme-toggle" type="button" aria-label="${esc(t("theme.toggle"))}" onclick="(function(){var d=document.documentElement;var n=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=n;localStorage.setItem('theme',n);})()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
        </svg>
      </button>
    </div>
  </header>
  <main class="container">
    ${opts.body}
  </main>
	  <footer class="site-footer">
	    <span>${esc(t("footer.built"))} <a href="https://github.com/allourideas" rel="noreferrer">All Our Ideas</a> · <a href="/method">${esc(t("footer.method"))}</a> · <a href="/privacy">${esc(t("footer.privacy"))}</a></span>
	  </footer>
</body>
</html>`;
}

const MODES = ["text", "image", "audio", "video"] as const;

function scoreMethodSelect(t: Translator, selected: ScoreMethod = "bayesian"): string {
  return `<select name="score_method" class="select-input">
    ${SCORE_METHODS.map(
      (method) => `<option value="${method}" ${method === selected ? "selected" : ""}>${esc(t("score." + method))}</option>`,
    ).join("")}
  </select>`;
}

function fileInputAttrs(t: Translator, kind: "image" | "audio" | "video", multiple = true): string {
  return [
    `data-upload-prompt="${esc(t(`upload.drop.${kind}${multiple ? "s" : ""}`))}"`,
    `data-upload-hint="${esc(t(multiple ? "upload.hint.multiple" : "upload.hint.single"))}"`,
    `data-upload-remove="${esc(t("upload.remove"))}"`,
  ].join(" ");
}

// ── home / create ────────────────────────────────────────────────────────────

export function homePage(t: Translator, locale: string, error?: string): string {
  const seg = MODES.map(
    (m, i) => `<label class="seg-opt">
      <input type="radio" name="mode" value="${m}" ${i === 0 ? "checked" : ""} onchange="pwMode('${m}')" />
      <span class="seg-card">
        <span class="seg-label">${esc(t("mode." + m))}</span>
        <span class="seg-desc">${esc(t("mode." + m + ".desc"))}</span>
      </span>
    </label>`,
  ).join("");

  const body = `
  ${error ? `<div class="banner banner-error">${esc(error)}</div>` : ""}
  <section class="hero">
    <h1>${rich(t("home.hero.title"))}</h1>
    <p class="lead">${rich(t("home.hero.lead"))}</p>
  </section>

  <section class="card create-card">
    <h2>${esc(t("home.create.title"))}</h2>
    <form method="post" action="/surveys" class="form" enctype="multipart/form-data">
      <label class="field">
        <span class="field-label">${esc(t("home.f.title.label"))}</span>
        <input name="title" required maxlength="200" placeholder="${esc(t("home.f.title.ph"))}" />
      </label>

      <label class="field">
        <span class="field-label">${esc(t("home.f.desc.label"))} <span class="muted">${esc(t("home.f.desc.opt"))}</span></span>
        <textarea name="description" rows="2" maxlength="1000" placeholder="${esc(t("home.f.desc.ph"))}"></textarea>
      </label>

      <div class="field">
        <span class="field-label">${esc(t("home.f.mode.label"))}</span>
        <div class="seg" role="radiogroup">${seg}</div>
      </div>

      <div class="mode-group" data-mode="text">
        <label class="field">
          <span class="field-label">${esc(t("home.f.ideas.label"))} <span class="muted">${esc(t("home.f.ideas.hint"))}</span></span>
          <textarea name="ideas" rows="7" placeholder="${esc(t("home.f.ideas.ph"))}"></textarea>
        </label>
      </div>

      <div class="mode-group" data-mode="image" hidden>
        <label class="field">
          <span class="field-label">${esc(t("home.f.images.label"))} <span class="muted">${esc(t("home.f.images.hint"))}</span></span>
          <input type="file" name="media" accept="image/*" multiple class="file-input" ${fileInputAttrs(t, "image")} />
        </label>
        <p class="idea-note">${esc(t("home.f.media.note"))}</p>
      </div>

      <div class="mode-group" data-mode="audio" hidden>
        <label class="field">
          <span class="field-label">${esc(t("home.f.audio.label"))} <span class="muted">${esc(t("home.f.audio.hint"))}</span></span>
          <input type="file" name="media" accept="audio/*" multiple class="file-input" ${fileInputAttrs(t, "audio")} />
        </label>
        <p class="idea-note">${esc(t("home.f.media.note"))}</p>
      </div>

      <div class="mode-group" data-mode="video" hidden>
        <label class="field">
          <span class="field-label">${esc(t("home.f.video.label"))} <span class="muted">${esc(t("home.f.video.hint"))}</span></span>
          <textarea name="youtube" rows="3" placeholder="${esc(t("home.f.video.ph"))}"></textarea>
        </label>
        <label class="field">
          <span class="field-label">${esc(t("home.f.webm.label"))} <span class="muted">${esc(t("home.f.webm.hint"))}</span></span>
          <input type="file" name="media" accept="video/webm,.webm" multiple class="file-input" ${fileInputAttrs(t, "video")} />
        </label>
        <p class="idea-note">${esc(t("home.f.media.note"))}</p>
      </div>

      <fieldset class="toggles">
        <label class="toggle"><input type="checkbox" name="allow_user_ideas" checked /><span>${esc(t("home.toggle.user_ideas"))}</span></label>
        <label class="toggle"><input type="checkbox" name="auto_activate" /><span>${esc(t("home.toggle.auto"))} <span class="muted">${esc(t("home.toggle.auto.hint"))}</span></span></label>
      </fieldset>

      <label class="field">
        <span class="field-label">${esc(t("score.field.label"))}</span>
        ${scoreMethodSelect(t)}
        <span class="field-help">${esc(t("score.field.help"))} <a href="/method">${esc(t("score.field.learn"))}</a></span>
      </label>

      <button class="btn btn-primary" type="submit">${esc(t("home.submit"))}</button>
    </form>
  </section>

  <section class="how">
    <h2>${esc(t("home.how.title"))}</h2>
    <ol class="how-list">
      ${[1, 2, 3]
        .map(
          (n) => `<li class="how-step">
        <span class="how-index">0${n}</span>
        <div class="how-body"><h3>${esc(t(`home.how.${n}.t`))}</h3><p>${esc(t(`home.how.${n}.b`))}</p></div>
      </li>`,
        )
        .join("")}
    </ol>
  </section>

  <script>
    function pwMode(m){document.querySelectorAll('.mode-group').forEach(function(el){el.hidden=el.dataset.mode!==m;});}
    pwMode((document.querySelector('input[name=mode]:checked')||{value:'text'}).value);
  </script>
  <script src="/app.js?v=20260614b"></script>`;
  return layout(t, locale, { title: t("home.create.title") + " · Pairwise", body });
}

// ── method ───────────────────────────────────────────────────────────────────

export function methodPage(t: Translator, locale: string): string {
  const methodRows = SCORE_METHODS.map(
    (method) => `<li class="method-row">
      <div>
        <h3>${esc(t("score." + method))}</h3>
        <p>${esc(t("score." + method + ".desc"))}</p>
      </div>
      <span class="method-tag">${method === "bayesian" ? esc(t("method.recommended")) : esc(t("method.optional"))}</span>
    </li>`,
  ).join("");

  const body = `
  <section class="method-head">
    <h1>${esc(t("method.title"))}</h1>
    <p class="lead">${esc(t("method.lead"))}</p>
  </section>

  <section class="card">
    <h2>${esc(t("method.same.title"))}</h2>
    <p>${esc(t("method.same.body"))}</p>
  </section>

  <section class="card">
    <h2>${esc(t("method.scoring.title"))}</h2>
    <p>${esc(t("method.scoring.body"))}</p>
    <ul class="method-list">${methodRows}</ul>
  </section>

  <section class="card">
    <h2>${esc(t("method.choice.title"))}</h2>
    <p>${esc(t("method.choice.body"))}</p>
  </section>`;

  return layout(t, locale, { title: `${t("method.title")} · Pairwise`, body });
}

// ── privacy ──────────────────────────────────────────────────────────────────

export function privacyPage(t: Translator, locale: string): string {
  const dataItems = [1, 2, 3, 4, 5, 6]
    .map((n) => `<li>${esc(t(`privacy.data.${n}`))}</li>`)
    .join("");
  const sections = [
    ["privacy.summary.title", "privacy.summary.body"],
    ["privacy.controller.title", "privacy.controller.body"],
    ["privacy.data.title", ""],
    ["privacy.cookies.title", "privacy.cookies.body"],
    ["privacy.legal.title", "privacy.legal.body"],
    ["privacy.retention.title", "privacy.retention.body"],
    ["privacy.third.title", "privacy.third.body"],
    ["privacy.rights.title", "privacy.rights.body"],
    ["privacy.note.title", "privacy.note.body"],
  ] as const;

  const body = `
  <section class="method-head">
    <h1>${esc(t("privacy.title"))}</h1>
    <p class="lead">${esc(t("privacy.lead"))}</p>
  </section>
  ${sections
    .map(([title, text]) => {
      const content = title === "privacy.data.title" ? `<ul class="method-list method-list--plain">${dataItems}</ul>` : `<p>${esc(t(text))}</p>`;
      return `<section class="card"><h2>${esc(t(title))}</h2>${content}</section>`;
    })
    .join("")}`;

  return layout(t, locale, { title: `${t("privacy.title")} · Pairwise`, body });
}

// ── created confirmation ─────────────────────────────────────────────────────

export function createdPage(t: Translator, locale: string, survey: Survey, origin: string): string {
  const vote = `${origin}/s/${survey.slug}`;
  const results = `${origin}/s/${survey.slug}/results`;
  const admin = `${origin}/a/${survey.admin_token}`;
  const row = (label: string, url: string, hint: string) => `
    <div class="link-row">
      <div class="link-meta"><span class="link-label">${esc(label)}</span><span class="muted">${esc(hint)}</span></div>
      <div class="link-copy">
        <input class="link-input" readonly value="${esc(url)}" onclick="this.select()" />
        <button class="btn btn-copy" type="button" data-copy="${esc(url)}">${esc(t("action.copy"))}</button>
      </div>
    </div>`;
  const body = `
  <section class="card">
    <div class="success-badge">${esc(t("created.badge"))}</div>
    <h1>${esc(survey.title)}</h1>
    <p class="lead">${esc(t("created.lead"))}</p>
    ${row(t("created.vote.label"), vote, t("created.vote.hint"))}
    ${row(t("created.results.label"), results, t("created.results.hint"))}
    ${row(t("created.admin.label"), admin, t("created.admin.hint"))}
    <div class="actions">
      <a class="btn btn-primary" href="${esc(vote)}">${esc(t("created.start"))}</a>
      <a class="btn" href="${esc(admin)}">${esc(t("created.to_admin"))}</a>
    </div>
  </section>
  <script src="/app.js?v=20260614b"></script>`;
  return layout(t, locale, { title: t("created.badge"), body });
}

// ── vote ─────────────────────────────────────────────────────────────────────

function addIdeaInput(t: Translator, mode: string): string {
  if (mode === "image") return `<input type="file" id="idea-file" accept="image/*" class="file-input" ${fileInputAttrs(t, "image", false)} />`;
  if (mode === "audio") return `<input type="file" id="idea-file" accept="audio/*" class="file-input" ${fileInputAttrs(t, "audio", false)} />`;
  if (mode === "video") return `<input id="idea-url" maxlength="400" placeholder="${esc(t("admin.add.video.ph"))}" />`;
  return `<input id="idea-text" maxlength="280" placeholder="${esc(t("vote.add.ph"))}" />`;
}

export function votePage(t: Translator, locale: string, survey: Survey, canVote: boolean, totalVotes: number): string {
  const isOpen = survey.status === "open";
  const cfg = {
    slug: survey.slug,
    mode: survey.mode,
    canVote,
    i18n: {
      countTpl: t("vote.count"),
      pick: t("vote.pick"),
      done: t("vote.done"),
      limit: t("vote.limit"),
      results: t("vote.results"),
      emptyMedia: t("vote.empty.media"),
      closed: t("vote.closed"),
      addedLive: t("toast.added_live"),
      addedPending: t("toast.added_pending"),
      addFailed: t("toast.add_failed"),
      error: t("toast.error"),
      loadVideo: t("vote.load_video"),
      zoom: t("vote.zoom"),
      zoomImage: t("vote.zoom_image"),
      close: t("action.close"),
      pickImage: t("vote.pick_image"),
    },
  };

  const body = `
  <section class="vote-head">
    <h1>${esc(survey.title)}</h1>
    ${survey.description ? `<p class="lead">${esc(survey.description)}</p>` : ""}
    <p class="vote-sub">${esc(t("vote.sub"))} <span class="counter" id="counter">${esc(t("vote.count", { n: totalVotes }))}</span></p>
  </section>

  ${
    !canVote
      ? `<section class="card empty-state">
           <p>${esc(isOpen ? t("vote.empty") : t("vote.closed"))}</p>
           <a class="btn" href="/s/${esc(survey.slug)}/results">${esc(t("vote.results"))}</a>
         </section>`
      : `<section class="arena" id="arena" data-mode="${esc(survey.mode)}"><div class="arena-loading"></div><div class="arena-loading"></div></section>
         <div class="vote-tools">
           <button class="btn btn-ghost" id="skip-btn" type="button">${esc(t("vote.skip"))}</button>
           <a class="btn btn-ghost" href="/s/${esc(survey.slug)}/results">${esc(t("vote.results"))}</a>
         </div>`
  }

  ${
    survey.allow_user_ideas && isOpen
      ? `<section class="card add-idea">
           <h2>${esc(t("vote.add.title"))}</h2>
           <form id="idea-form" class="idea-form" data-mode="${esc(survey.mode)}">
             ${addIdeaInput(t, survey.mode)}
             <button class="btn btn-primary" type="submit">${esc(t("action.add"))}</button>
           </form>
           <p class="idea-note">${esc(survey.auto_activate ? t("vote.add.note.auto") : t("vote.add.note.moderated"))}</p>
         </section>`
      : ""
  }

  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script>window.__SURVEY__ = ${jsonScript(cfg)};</script>
  <script src="/app.js?v=20260614b"></script>`;

  return layout(t, locale, { title: survey.title, body });
}

// ── media previews (results / admin) ─────────────────────────────────────────

function mediaSrc(idea: Idea, adminToken?: string): string {
  if (!idea.media || !idea.media_kind || idea.media_kind === "youtube") return "";
  return adminToken ? `/a/${esc(adminToken)}/media/${idea.id}` : `/media/${esc(idea.media)}`;
}

function mediaPreview(idea: Idea, adminToken?: string): string {
  if (idea.media_kind === "image" && idea.media)
    return `<img class="thumb" src="${mediaSrc(idea, adminToken)}" alt="${esc(idea.text)}" loading="lazy" />`;
  if (idea.media_kind === "youtube" && idea.media)
    return `<div class="thumb thumb--ic">▶</div>`;
  if (idea.media_kind === "audio") return `<div class="thumb thumb--ic">♪</div>`;
  if (idea.media_kind === "webm") return `<div class="thumb thumb--ic">▶</div>`;
  return "";
}

function ideaLabel(t: Translator, idea: Idea, rank: number): string {
  if (idea.text) return esc(idea.text);
  if (idea.media_kind) return `<span class="muted">${esc(t("mode." + (idea.media_kind === "youtube" || idea.media_kind === "webm" ? "video" : idea.media_kind)))} ${rank}</span>`;
  return "";
}

function displayScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, score));
}

function nonNegativeInt(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function csrfInput(survey: Survey): string {
  return `<input type="hidden" name="csrf" value="${esc(survey.admin_csrf_token)}" />`;
}

function adminAccessPanel(
  t: Translator,
  survey: Survey,
  admins: SurveyAdmin[],
  origin: string,
  revealedAdmin?: SurveyAdmin,
): string {
  const revealedUrl = revealedAdmin ? `${origin}/a/${revealedAdmin.token}` : "";
  const revealed = revealedAdmin
    ? `<div class="link-row admin-access-reveal">
        <div class="link-meta">
          <span class="link-label">${esc(t("admin.access.new"))}: ${esc(revealedAdmin.label)}</span>
          <span class="muted">${esc(t("admin.access.new_hint"))}</span>
        </div>
        <div class="link-copy">
          <input class="link-input" readonly value="${esc(revealedUrl)}" onclick="this.select()" />
          <button class="btn btn-copy" type="button" data-copy="${esc(revealedUrl)}">${esc(t("action.copy"))}</button>
        </div>
      </div>`
    : "";

  const rows = admins
    .map((admin) => {
      const url = `${origin}/a/${admin.token}`;
      const current = admin.id === survey.admin_id;
      return `<li class="admin-access-row">
        <div class="link-meta">
          <span class="link-label">${esc(admin.label)}${current ? ` <span class="muted">${esc(t("admin.access.current"))}</span>` : ""}</span>
          <span class="muted">${esc(t("admin.access.created"))}: ${esc(admin.created_at.slice(0, 10))}</span>
          ${admin.rotated_at ? `<span class="muted">${esc(t("admin.access.rotated"))}: ${esc(admin.rotated_at.slice(0, 10))}</span>` : ""}
          ${admin.last_used_at ? `<span class="muted">${esc(t("admin.access.last_used"))}: ${esc(admin.last_used_at.slice(0, 10))}</span>` : ""}
        </div>
        <div class="link-copy">
          ${
            current
              ? `<input class="link-input" readonly value="${esc(url)}" onclick="this.select()" />
                 <button class="btn btn-copy" type="button" data-copy="${esc(url)}">${esc(t("action.copy"))}</button>`
              : `<form method="post" action="/a/${esc(survey.admin_token)}/admins/${admin.id}/revoke" data-confirm="${esc(t("admin.access.confirm_revoke"))}">
                  ${csrfInput(survey)}
                  <button class="btn btn-danger" type="submit">${esc(t("admin.access.revoke"))}</button>
                </form>`
          }
        </div>
      </li>`;
    })
    .join("");

  return `<section class="card">
    <h2>${esc(t("admin.access.title"))}</h2>
    <p class="field-help">${esc(t("admin.access.help"))}</p>
    ${revealed}
    <ul class="admin-access-list">${rows}</ul>
    <div class="admin-access-actions">
      <form method="post" action="/a/${esc(survey.admin_token)}/admins" class="idea-form idea-form--admin">
        ${csrfInput(survey)}
        <input name="label" maxlength="80" placeholder="${esc(t("admin.access.label_ph"))}" />
        <button class="btn btn-primary" type="submit">${esc(t("admin.access.add"))}</button>
      </form>
      <form method="post" action="/a/${esc(survey.admin_token)}/admins/rotate" data-confirm="${esc(t("admin.access.confirm_rotate"))}">
        ${csrfInput(survey)}
        <button class="btn btn-danger" type="submit">${esc(t("admin.access.rotate"))}</button>
      </form>
    </div>
  </section>`;
}

function lifecyclePanel(t: Translator, survey: Survey): string {
  const option = (status: string) =>
    `<button class="btn ${survey.status === status ? "btn-primary" : ""}" name="status" value="${esc(status)}" type="submit">${esc(t("admin.status." + status))}</button>`;
  return `<section class="card">
    <h2>${esc(t("admin.lifecycle.title"))}</h2>
    <p class="field-help">${esc(t("admin.lifecycle.help"))}</p>
    <form method="post" action="/a/${esc(survey.admin_token)}/status" class="admin-status-actions">
      ${csrfInput(survey)}
      ${option("open")}
      ${option("closed")}
      ${option("archived")}
    </form>
    <form method="post" action="/a/${esc(survey.admin_token)}/delete" data-confirm="${esc(t("admin.lifecycle.confirm_delete"))}">
      ${csrfInput(survey)}
      <button class="btn btn-danger" type="submit">${esc(t("admin.lifecycle.delete"))}</button>
    </form>
  </section>`;
}

// ── results ──────────────────────────────────────────────────────────────────

export function resultsPage(
  t: Translator,
  locale: string,
  survey: Survey,
  ideas: Idea[],
  totalVotes: number,
  scoreMethod: ScoreMethod = survey.score_method,
): string {
  const medals = ["🥇", "🥈", "🥉"];
  const rows = ideas
    .map((idea, i) => {
      const score = displayScore(idea.score).toFixed(1);
      const wins = nonNegativeInt(idea.wins);
      const losses = nonNegativeInt(idea.losses);
      const preview = mediaPreview(idea);
      return `
      <li class="result-row">
        <div class="result-rank">${medals[i] ?? i + 1}</div>
        ${preview}
        <div class="result-main">
          <div class="result-text">${ideaLabel(t, idea, i + 1)}</div>
          <div class="result-bar"><span style="width:${score}%"></span></div>
          <div class="result-meta">
            <span class="result-score">${score}</span>
            <span class="muted">${esc(t("results.meta", { w: wins, l: losses, a: wins + losses }))}</span>
          </div>
        </div>
      </li>`;
    })
    .join("");

  const body = `
  <section class="results-head">
    <h1>${esc(survey.title)}</h1>
    <p class="vote-sub">${esc(t("results.subtitle"))} · <span class="counter">${esc(t("vote.count", { n: totalVotes }))}</span></p>
    <p class="vote-sub">${esc(t("results.method"))}: <a href="/method">${esc(t("score." + scoreMethod))}</a></p>
    <div class="actions">
      ${
        survey.status === "archived"
          ? `<span class="btn btn-disabled" aria-disabled="true">${esc(t("admin.status.archived"))}</span>`
          : `<a class="btn btn-primary" href="/s/${esc(survey.slug)}">${esc(t("results.vote"))}</a>`
      }
      <button class="btn" type="button" onclick="location.reload()">${esc(t("results.refresh"))}</button>
    </div>
  </section>
  <section class="card result-method-card">
    <h2>${esc(t("results.method_title"))}</h2>
    <p>${esc(t("score." + scoreMethod + ".desc"))}</p>
    <a href="/method">${esc(t("score.field.learn"))}</a>
  </section>
  ${ideas.length ? `<ol class="results-list">${rows}</ol>` : `<section class="card empty-state"><p>${esc(t("results.empty"))}</p></section>`}`;

  return layout(t, locale, { title: `${t("results.subtitle")} — ${survey.title}`, body });
}

// ── admin ────────────────────────────────────────────────────────────────────

function adminAddForm(t: Translator, survey: Survey): string {
  let inner: string;
  const token = survey.admin_token;
  const mode = survey.mode;
  if (mode === "image") inner = `<input type="file" name="media" accept="image/*" multiple class="file-input" ${fileInputAttrs(t, "image")} />`;
  else if (mode === "audio") inner = `<input type="file" name="media" accept="audio/*" multiple class="file-input" ${fileInputAttrs(t, "audio")} />`;
  else if (mode === "video")
    inner = `<textarea name="youtube" rows="2" placeholder="${esc(t("admin.add.video.ph"))}"></textarea>
             <input type="file" name="media" accept="video/webm,.webm" multiple class="file-input" ${fileInputAttrs(t, "video")} />`;
  else inner = `<input name="text" maxlength="280" required placeholder="${esc(t("admin.add.ph"))}" />`;
  return `<form method="post" action="/a/${esc(token)}/ideas" class="idea-form idea-form--admin" enctype="multipart/form-data">
    ${csrfInput(survey)}
    ${inner}
    <button class="btn btn-primary" type="submit">${esc(t("action.add"))}</button>
  </form>`;
}

export function adminPage(
  t: Translator,
  locale: string,
  survey: Survey,
  ideas: Idea[],
  stats: { votes: number; skips: number; active: number; pending: number },
  admins: SurveyAdmin[],
  origin: string,
  revealedAdmin?: SurveyAdmin,
): string {
  const token = survey.admin_token;
  const active = ideas.filter((i) => i.active);
  const pending = ideas.filter((i) => !i.active && i.submitted);

  const pendingHtml = pending.length
    ? pending
        .map(
          (idea, i) => `<li class="admin-idea pending">
        ${mediaPreview(idea, token)}
        <span class="admin-idea-text">${ideaLabel(t, idea, i + 1)}</span>
        <span class="admin-idea-actions">
          <form method="post" action="/a/${esc(token)}/ideas/${idea.id}/activate">${csrfInput(survey)}<button class="btn btn-sm btn-primary">${esc(t("admin.approve"))}</button></form>
          <form method="post" action="/a/${esc(token)}/ideas/${idea.id}/delete" data-confirm="${esc(t("admin.confirm.reject"))}">${csrfInput(survey)}<button class="btn btn-sm btn-danger">${esc(t("admin.reject"))}</button></form>
        </span>
      </li>`,
        )
        .join("")
    : `<li class="muted admin-empty">${esc(t("admin.pending.empty"))}</li>`;

  const activeHtml = active.length
    ? active
        .map(
          (idea, i) => `<li class="admin-idea">
        <span class="admin-idea-score">${displayScore(idea.score).toFixed(0)}</span>
        ${mediaPreview(idea, token)}
        <span class="admin-idea-text">${ideaLabel(t, idea, i + 1)}</span>
        <span class="muted admin-idea-stat">${nonNegativeInt(idea.wins)}–${nonNegativeInt(idea.losses)}</span>
        <span class="admin-idea-actions">
          <form method="post" action="/a/${esc(token)}/ideas/${idea.id}/deactivate">${csrfInput(survey)}<button class="btn btn-sm">${esc(t("admin.hide"))}</button></form>
          <form method="post" action="/a/${esc(token)}/ideas/${idea.id}/delete" data-confirm="${esc(t("admin.confirm.delete"))}">${csrfInput(survey)}<button class="btn btn-sm btn-danger">${esc(t("admin.delete"))}</button></form>
        </span>
      </li>`,
        )
        .join("")
    : `<li class="muted admin-empty">${esc(t("admin.active.empty"))}</li>`;

  const body = `
  <section class="admin-head">
    <h1>${esc(t("admin.title"))} · ${esc(survey.title)}</h1>
    <p class="vote-sub">${esc(t("admin.mode_label"))}: ${esc(t("mode." + survey.mode))}</p>
    <p class="vote-sub">${esc(t("admin.lifecycle.status"))}: ${esc(t("admin.status." + survey.status))}</p>
    <div class="stat-grid">
      <div class="stat"><div class="stat-num">${stats.votes}</div><div class="stat-label">${esc(t("admin.stat.votes"))}</div></div>
      <div class="stat"><div class="stat-num">${stats.active}</div><div class="stat-label">${esc(t("admin.stat.active"))}</div></div>
      <div class="stat"><div class="stat-num">${stats.pending}</div><div class="stat-label">${esc(t("admin.stat.pending"))}</div></div>
      <div class="stat"><div class="stat-num">${stats.skips}</div><div class="stat-label">${esc(t("admin.stat.skips"))}</div></div>
    </div>
    <div class="actions">
      <a class="btn btn-primary" href="${esc(origin)}/s/${esc(survey.slug)}">${esc(t("admin.vote_page"))}</a>
      <a class="btn" href="${esc(origin)}/s/${esc(survey.slug)}/results">${esc(t("admin.results"))}</a>
    </div>
  </section>

  ${survey.allow_user_ideas ? `<section class="card"><h2>${esc(t("admin.pending.title"))} (${pending.length})</h2><ul class="admin-list">${pendingHtml}</ul></section>` : ""}

  <section class="card">
    <h2>${esc(t("admin.add.title"))}</h2>
    ${adminAddForm(t, survey)}
  </section>

  ${adminAccessPanel(t, survey, admins, origin, revealedAdmin)}

  ${lifecyclePanel(t, survey)}

  <section class="card">
    <h2>${esc(t("admin.active.title"))} (${active.length})</h2>
    <ul class="admin-list">${activeHtml}</ul>
  </section>

  <section class="card">
    <h2>${esc(t("admin.settings.title"))}</h2>
    <form method="post" action="/a/${esc(token)}/settings" class="form">
      ${csrfInput(survey)}
      <label class="field"><span class="field-label">${esc(t("home.f.title.label"))}</span><input name="title" required maxlength="200" value="${esc(survey.title)}" /></label>
      <label class="field"><span class="field-label">${esc(t("home.f.desc.label"))}</span><textarea name="description" rows="2" maxlength="1000">${esc(survey.description)}</textarea></label>
      <label class="field">
        <span class="field-label">${esc(t("score.field.label"))}</span>
        ${scoreMethodSelect(t, survey.score_method)}
        <span class="field-help">${esc(t("score.field.help"))} <a href="/method">${esc(t("score.field.learn"))}</a></span>
      </label>
      <fieldset class="toggles">
        <label class="toggle"><input type="checkbox" name="allow_user_ideas" ${survey.allow_user_ideas ? "checked" : ""} /><span>${esc(t("home.toggle.user_ideas"))}</span></label>
        <label class="toggle"><input type="checkbox" name="auto_activate" ${survey.auto_activate ? "checked" : ""} /><span>${esc(t("home.toggle.auto"))}</span></label>
      </fieldset>
      <button class="btn btn-primary" type="submit">${esc(t("admin.settings.save"))}</button>
    </form>
  </section>

  <script src="/app.js?v=20260614b"></script>`;

  return layout(t, locale, { title: `${t("admin.title")} — ${survey.title}`, body });
}

export function notFoundPage(t: Translator, locale: string): string {
  return layout(t, locale, {
    title: "404",
    body: `<section class="notfound">
      <div class="big">404</div>
      <p class="lead">${esc(t("nf.lead"))}</p>
      <a class="btn btn-primary" href="/">${esc(t("nf.back"))}</a>
    </section>`,
  });
}
