// Client-side voting interaction. No framework. Builds the arena DOM per media
// kind (text / image / audio / video) so the same flow drives every mode.

(function () {
  // Copy buttons (created / confirmation page).
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(btn.getAttribute("data-copy")).then(function () {
        var old = btn.textContent;
        btn.textContent = "✓";
        setTimeout(function () { btn.textContent = old; }, 1400);
      });
    });
  });

  var cfg = window.__SURVEY__;
  if (!cfg || !cfg.canVote) return;
  var I = cfg.i18n;

  var arena = document.getElementById("arena");
  var counter = document.getElementById("counter");
  var skipBtn = document.getElementById("skip-btn");
  var toast = document.getElementById("toast");
  if (!arena) return;

  var current = null;
  var busy = false;
  var sideEls = { left: null, right: null };

  function api(path, opts) {
    return fetch("/api/s/" + cfg.slug + path, opts).then(function (r) { return r.json(); });
  }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function fmtCount(n) { return I.countTpl.replace("{n}", n); }
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  function kbd(side) { var k = el("span", "kbd-hint"); k.textContent = side === "left" ? "←" : "→"; return k; }

  function buildChoice(side, idea) {
    var pick = function () { choose(side); };

    if (idea.kind === "text" || idea.kind === "image") {
      var btn = el("button", "choice choice--" + idea.kind);
      btn.type = "button";
      if (idea.kind === "image") {
        var img = el("img", "choice-media");
        img.src = idea.src; img.alt = idea.text || ""; img.loading = "eager";
        btn.appendChild(img);
        if (idea.text) { var c = el("span", "choice-cap"); c.textContent = idea.text; btn.appendChild(c); }
      } else {
        var tx = el("span", "choice-text"); tx.textContent = idea.text; btn.appendChild(tx);
      }
      btn.appendChild(kbd(side));
      btn.addEventListener("click", pick);
      return btn;
    }

    // audio / webm / youtube — interactive media, so a non-button card + explicit pick.
    var card = el("div", "choice choice--media");
    var media;
    if (idea.kind === "audio") {
      media = el("audio", "choice-media no-pick");
      media.controls = true; media.preload = "none"; media.src = idea.src;
    } else if (idea.kind === "webm") {
      media = el("video", "choice-media no-pick");
      media.controls = true; media.preload = "metadata"; media.playsInline = true; media.src = idea.src;
    } else {
      media = el("iframe", "choice-media no-pick");
      media.src = "https://www.youtube-nocookie.com/embed/" + idea.youtube;
      media.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      media.setAttribute("allowfullscreen", "");
      media.loading = "lazy";
    }
    card.appendChild(media);
    if (idea.text) { var cap = el("span", "choice-cap"); cap.textContent = idea.text; card.appendChild(cap); }
    var pb = el("button", "choice-pick"); pb.type = "button"; pb.textContent = I.pick;
    card.appendChild(pb);
    card.addEventListener("click", function (e) { if (e.target.closest(".no-pick")) return; pick(); });
    return card;
  }

  function buildArena(pair) {
    current = pair;
    arena.innerHTML = "";
    sideEls.left = buildChoice("left", pair.left);
    var vs = el("div", "vs"); vs.setAttribute("aria-hidden", "true"); vs.textContent = "vs";
    sideEls.right = buildChoice("right", pair.right);
    arena.appendChild(sideEls.left);
    arena.appendChild(vs);
    arena.appendChild(sideEls.right);
    arena.classList.remove("swapping");
    busy = false;
  }

  function renderDone() {
    arena.classList.remove("swapping");
    arena.innerHTML =
      '<div class="card empty-state" style="grid-column:1/-1"><p>' + I.done +
      '</p><a class="btn btn-primary" href="/s/' + cfg.slug + '/results">' + I.results + "</a></div>";
  }

  function advance(next) {
    if (!next || !next.lookup) { renderDone(); return; }
    arena.classList.add("swapping");
    setTimeout(function () { buildArena(next); }, 180);
  }

  function choose(side) {
    if (busy || !current) return;
    busy = true;
    var winnerId = current[side].id;
    sideEls[side].classList.add("chosen");
    sideEls[side === "left" ? "right" : "left"].classList.add("rejected");
    api("/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lookup: current.lookup, winner: winnerId }),
    })
      .then(function (res) {
        if (typeof res.totalVotes === "number" && counter) counter.textContent = fmtCount(res.totalVotes);
        setTimeout(function () { advance(res.next); }, 120);
      })
      .catch(function () { busy = false; showToast(I.error); buildArena(current); });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", function () {
      if (busy || !current) return;
      busy = true;
      api("/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lookup: current.lookup }),
      }).then(function (res) { advance(res.next); }).catch(function () { busy = false; });
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); choose("left"); }
    else if (e.key === "ArrowRight") { e.preventDefault(); choose("right"); }
    else if ((e.key === "s" || e.key === " ") && skipBtn) { e.preventDefault(); skipBtn.click(); }
  });

  // add-idea form (mode-aware, sends multipart so files work)
  var ideaForm = document.getElementById("idea-form");
  if (ideaForm) {
    ideaForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var mode = ideaForm.dataset.mode;
      var fd = new FormData();
      if (mode === "image" || mode === "audio") {
        var f = document.getElementById("idea-file");
        if (!f || !f.files.length) return;
        fd.append("file", f.files[0]);
      } else if (mode === "video") {
        var u = document.getElementById("idea-url");
        if (!u || !u.value.trim()) return;
        fd.append("url", u.value.trim());
      } else {
        var tx = document.getElementById("idea-text");
        if (!tx || !tx.value.trim()) return;
        fd.append("text", tx.value.trim());
      }
      fetch("/api/s/" + cfg.slug + "/idea", { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.ok) { ideaForm.reset(); showToast(res.active ? I.addedLive : I.addedPending); }
          else showToast(I.addFailed);
        })
        .catch(function () { showToast(I.addFailed); });
    });
  }

  // load the first pair
  api("/pair").then(function (res) {
    if (res.error === "not_enough" || !res.lookup) {
      arena.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><p>' + I.emptyMedia + "</p></div>";
      return;
    }
    buildArena(res);
  });
})();
