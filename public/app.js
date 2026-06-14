// Client-side voting interaction. No framework. Builds the arena DOM per media
// kind (text / image / audio / video) so the same flow drives every mode.

(function () {
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function formatFileSize(bytes) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + " MB";
  }

  function fileKind(file) {
    if (file.type.indexOf("image/") === 0) return "image";
    if (file.type.indexOf("audio/") === 0) return "audio";
    if (file.type.indexOf("video/") === 0 || /\.webm$/i.test(file.name)) return "video";
    return "file";
  }

  function inputPrompt(input) {
    if (input.dataset.uploadPrompt) return input.dataset.uploadPrompt;
    var accept = input.getAttribute("accept") || "";
    var noun = "files";
    if (accept.indexOf("image") !== -1) noun = "images";
    else if (accept.indexOf("audio") !== -1) noun = "audio";
    else if (accept.indexOf("video") !== -1 || accept.indexOf("webm") !== -1) noun = "videos";
    if (!input.multiple) noun = noun.replace(/s$/, "");
    return "Drop " + noun + " here";
  }

  function setInputFiles(input, files) {
    if (!window.DataTransfer) return false;
    var transfer = new window.DataTransfer();
    files.forEach(function (file) { transfer.items.add(file); });
    input.files = transfer.files;
    return true;
  }

  function enhanceFileInput(input) {
    if (input.dataset.uploadEnhanced === "true") return;
    input.dataset.uploadEnhanced = "true";

    var upload = el("div", "file-upload");
    var dropzone = el("div", "file-dropzone");
    var prompt = el("span", "file-dropzone-prompt");
    var hint = el("span", "file-dropzone-hint");
    var preview = el("ul", "file-preview-list");
    var state = { urls: [] };

    dropzone.setAttribute("role", "button");
    dropzone.setAttribute("tabindex", "0");
    dropzone.setAttribute("aria-label", inputPrompt(input));
    input.setAttribute("tabindex", "-1");
    prompt.textContent = inputPrompt(input);
    hint.textContent = input.dataset.uploadHint || (input.multiple ? "Choose or drop multiple files" : "Choose or drop one file");

    input.parentNode.insertBefore(upload, input);
    upload.appendChild(dropzone);
    dropzone.appendChild(input);
    dropzone.appendChild(prompt);
    dropzone.appendChild(hint);
    upload.appendChild(preview);

    function filesFromInput() {
      return Array.prototype.slice.call(input.files || []);
    }

    function clearObjectUrls() {
      state.urls.forEach(function (url) { URL.revokeObjectURL(url); });
      state.urls = [];
    }

    function renderPreview() {
      var files = filesFromInput();
      clearObjectUrls();
      preview.innerHTML = "";
      upload.classList.toggle("has-files", files.length > 0);

      files.forEach(function (file, index) {
        var item = el("li", "file-preview-item");
        var thumb = el("span", "file-preview-thumb file-preview-thumb--" + fileKind(file));
        var meta = el("span", "file-preview-meta");
        var name = el("span", "file-preview-name");
        var size = el("span", "file-preview-size");
        var remove = el("button", "file-preview-remove");
        var url;

        if (fileKind(file) === "image") {
          url = URL.createObjectURL(file);
          state.urls.push(url);
          var img = el("img");
          img.alt = "";
          img.src = url;
          thumb.appendChild(img);
        } else if (fileKind(file) === "video") {
          url = URL.createObjectURL(file);
          state.urls.push(url);
          var video = el("video");
          video.muted = true;
          video.playsInline = true;
          video.preload = "metadata";
          video.src = url;
          thumb.appendChild(video);
        } else {
          thumb.textContent = fileKind(file) === "audio" ? "♪" : "·";
        }

        name.textContent = file.name;
        size.textContent = formatFileSize(file.size);
        meta.appendChild(name);
        meta.appendChild(size);

        remove.type = "button";
        var removeLabel = input.dataset.uploadRemove || "Remove";
        remove.textContent = removeLabel;
        remove.setAttribute("aria-label", removeLabel + " " + file.name);
        remove.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          var next = filesFromInput().filter(function (_, i) { return i !== index; });
          if (setInputFiles(input, next)) renderPreview();
        });

        item.appendChild(thumb);
        item.appendChild(meta);
        item.appendChild(remove);
        preview.appendChild(item);
      });
    }

    function addFiles(fileList) {
      var next = Array.prototype.slice.call(fileList || []);
      if (!next.length) return;
      if (input.multiple) next = filesFromInput().concat(next);
      else next = [next[0]];
      if (setInputFiles(input, next)) renderPreview();
    }

    input.addEventListener("change", renderPreview);
    dropzone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    ["dragenter", "dragover"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (e) {
        e.preventDefault();
        dropzone.classList.add("is-dragover");
      });
    });
    dropzone.addEventListener("dragleave", function (e) {
      if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
      addFiles(e.dataTransfer.files);
    });

    if (input.form) {
      input.form.addEventListener("reset", function () {
        setTimeout(renderPreview, 0);
      });
    }

    renderPreview();
  }

  document.querySelectorAll('input[type="file"].file-input').forEach(enhanceFileInput);

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

  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (!window.confirm(form.getAttribute("data-confirm") || "")) e.preventDefault();
    });
  });

  var cfg = window.__SURVEY__;
  if (!cfg) return;
  var I = cfg.i18n;

  var arena = document.getElementById("arena");
  var counter = document.getElementById("counter");
  var skipBtn = document.getElementById("skip-btn");
  var toast = document.getElementById("toast");

  var current = null;
  var busy = false;
  var sideEls = { left: null, right: null };
  var lightbox = null;
  var lightboxTrigger = null;

  function api(path, opts) {
    return fetch("/api/s/" + cfg.slug + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) {
          var err = new Error(body.error || "request_failed");
          err.status = r.status;
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }
  function fmtCount(n) { return I.countTpl.replace("{n}", n); }
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }
  function kbd(side) { var k = el("span", "kbd-hint"); k.textContent = side === "left" ? "←" : "→"; return k; }

  function closeImageLightbox() {
    if (!lightbox) return;
    var trigger = lightboxTrigger;
    lightbox.remove();
    lightbox = null;
    lightboxTrigger = null;
    document.body.classList.remove("lightbox-open");
    if (trigger && typeof trigger.focus === "function") trigger.focus();
  }

  function openImageLightbox(side, idea, trigger) {
    closeImageLightbox();
    lightboxTrigger = trigger || document.activeElement;
    lightbox = el("div", "image-lightbox");
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", I.zoomImage || "Zoom image");

    var panel = el("div", "image-lightbox-panel");
    var close = el("button", "image-lightbox-close");
    close.type = "button";
    close.setAttribute("aria-label", I.close || "Close");
    close.textContent = "x";

    var img = el("img", "image-lightbox-img");
    img.src = idea.src;
    img.alt = idea.text || "";

    var footer = el("div", "image-lightbox-footer");
    if (idea.text) {
      var cap = el("div", "image-lightbox-caption");
      cap.textContent = idea.text;
      footer.appendChild(cap);
    }
    var pick = el("button", "btn btn-primary image-lightbox-pick");
    pick.type = "button";
    pick.textContent = I.pickImage || I.pick;
    footer.appendChild(pick);

    panel.appendChild(close);
    panel.appendChild(img);
    panel.appendChild(footer);
    lightbox.appendChild(panel);
    document.body.appendChild(lightbox);
    document.body.classList.add("lightbox-open");

    close.addEventListener("click", closeImageLightbox);
    pick.addEventListener("click", function () { closeImageLightbox(); choose(side); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeImageLightbox(); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeImageLightbox(); return; }
      if (e.key !== "Tab") return;
      var focusable = Array.prototype.slice.call(lightbox.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    close.focus();
  }

  function renderClosed() {
    current = null;
    busy = false;
    if (arena) {
      arena.classList.remove("swapping");
      arena.innerHTML =
        '<div class="card empty-state" style="grid-column:1/-1"><p>' + (I.closed || I.done) +
        '</p><a class="btn btn-primary" href="/s/' + cfg.slug + '/results">' + I.results + "</a></div>";
    }
    if (skipBtn) skipBtn.disabled = true;
  }

  function renderLimit() {
    current = null;
    busy = false;
    if (arena) {
      arena.classList.remove("swapping");
      arena.innerHTML =
        '<div class="card empty-state" style="grid-column:1/-1"><p>' + (I.limit || I.done) +
        '</p><a class="btn btn-primary" href="/s/' + cfg.slug + '/results">' + I.results + "</a></div>";
    }
    if (skipBtn) skipBtn.disabled = true;
  }

  function handleApiError(err) {
    if (err && err.body && err.body.error === "survey_closed") { renderClosed(); return; }
    if (err && err.body && err.body.error === "answer_limit") { renderLimit(); return; }
    busy = false;
    showToast(I.error);
  }

  function buildChoice(side, idea) {
    var pick = function () { choose(side); };

    if (idea.kind === "text") {
      var btn = el("button", "choice choice--" + idea.kind);
      btn.type = "button";
      var tx = el("span", "choice-text"); tx.textContent = idea.text; btn.appendChild(tx);
      btn.appendChild(kbd(side));
      btn.addEventListener("click", pick);
      return btn;
    }

    if (idea.kind === "image") {
      var imageCard = el("div", "choice choice--image");
      var img = el("img", "choice-media");
      img.src = idea.src; img.alt = idea.text || ""; img.loading = "eager";
      var zoom = el("button", "choice-zoom no-pick");
      zoom.type = "button";
      zoom.textContent = I.zoom || "Zoom";
      zoom.title = I.zoomImage || "Zoom image";
      zoom.setAttribute("aria-label", I.zoomImage || "Zoom image");
      var pickBtn = el("button", "choice-pick");
      pickBtn.type = "button";
      pickBtn.textContent = I.pick;
      imageCard.appendChild(img);
      imageCard.appendChild(zoom);
      if (idea.text) { var c = el("span", "choice-cap"); c.textContent = idea.text; imageCard.appendChild(c); }
      imageCard.appendChild(kbd(side));
      imageCard.appendChild(pickBtn);
      zoom.addEventListener("click", function (e) { e.stopPropagation(); openImageLightbox(side, idea, e.currentTarget); });
      imageCard.addEventListener("click", function (e) { if (e.target.closest(".no-pick")) return; pick(); });
      return imageCard;
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
      media = el("button", "choice-media choice-youtube-load no-pick");
      media.type = "button";
      media.textContent = I.loadVideo || "Load video";
      media.addEventListener("click", function () {
        var frame = el("iframe", "choice-media no-pick");
        frame.src = "https://www.youtube-nocookie.com/embed/" + idea.youtube;
        frame.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        frame.setAttribute("allowfullscreen", "");
        frame.loading = "lazy";
        media.replaceWith(frame);
      });
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
      .catch(function (err) {
        if (err && err.body && err.body.error === "survey_closed") { renderClosed(); return; }
        busy = false; showToast(I.error); buildArena(current);
      });
  }

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

  if (!cfg.canVote || !arena) return;

  if (skipBtn) {
    skipBtn.addEventListener("click", function () {
      if (busy || !current) return;
      busy = true;
      api("/skip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lookup: current.lookup }),
      }).then(function (res) { advance(res.next); }).catch(handleApiError);
    });
  }

  function isInteractiveTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT|BUTTON|AUDIO|VIDEO|IFRAME)$/.test(target.tagName);
  }

  document.addEventListener("keydown", function (e) {
    if (lightbox && e.key === "Escape") { e.preventDefault(); closeImageLightbox(); return; }
    if (lightbox) return;
    if (isInteractiveTarget(e.target)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); choose("left"); }
    else if (e.key === "ArrowRight") { e.preventDefault(); choose("right"); }
    else if ((e.key === "s" || e.key === " ") && skipBtn) { e.preventDefault(); skipBtn.click(); }
  });

  // load the first pair
  api("/pair").then(function (res) {
    if (res.error === "survey_closed") { renderClosed(); return; }
    if (res.error === "not_enough" || !res.lookup) {
      arena.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><p>' + I.emptyMedia + "</p></div>";
      return;
    }
    buildArena(res);
  }).catch(handleApiError);
})();
