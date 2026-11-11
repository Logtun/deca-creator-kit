(function () {
  "use strict";
  var APPS = window.KIT_APPS, PLAT = window.KIT_PLATFORMS, C = window.KitCalc;
  var $ = function (id) { return document.getElementById(id); };
  var state = { app: null, p: "tiktok" };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ---------- copy ---------- */
  function copyText(text, btn) {
    function done() {
      btn.textContent = "Copied"; btn.classList.add("done");
      setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1400);
    }
    function fallback() {
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); t.setSelectionRange(0, text.length);
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t); done();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }
  function copyRow(list, text, label) {
    var li = el("li");
    li.appendChild(el("span", "", text));
    var b = el("button", "copy", "Copy");
    b.type = "button"; b.setAttribute("aria-label", "Copy " + label);
    b.addEventListener("click", function () { copyText(b.dataset.full || text, b); });
    li.appendChild(b); list.appendChild(li);
    return b;
  }

  /* ---------- tabs ---------- */
  var tabs = [].slice.call(document.querySelectorAll('[role="tab"]'));
  function showTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.tab === name;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $("panel-" + t.dataset.tab).hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showTab(t.dataset.tab); writeHash(); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      showTab(n.dataset.tab, true); writeHash();
    });
  });

  /* ---------- app picker ---------- */
  var appsBox = $("apps");
  APPS.forEach(function (a) {
    var b = el("button", "app");
    b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false"); b.dataset.id = a.id;
    b.appendChild(el("b", "", a.name));
    b.appendChild(el("span", "", a.line));
    b.addEventListener("click", function () { pickApp(a.id, true); writeHash(); });
    appsBox.appendChild(b);
  });

  function pickApp(id, scroll) {
    var a = APPS.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    state.app = a;
    [].forEach.call(appsBox.children, function (b) { b.setAttribute("aria-checked", b.dataset.id === id ? "true" : "false"); });
    $("kit").hidden = false;
    $("kit-kind").textContent = a.kind;
    $("kit-name").textContent = a.name;
    $("kit-line").textContent = a.line;
    var links = $("kit-links"); links.textContent = "";
    a.links.forEach(function (l) {
      var x = el("a", "", l[0]); x.href = l[1]; x.target = "_blank"; x.rel = "noopener"; links.appendChild(x);
    });
    var hooks = $("hooks"); hooks.textContent = "";
    a.hooks.forEach(function (h, i) { copyRow(hooks, h, "hook " + (i + 1)); });
    renderPlatform();
    var show = $("show"); show.textContent = "";
    a.show.forEach(function (s) { show.appendChild(el("li", "", s)); });
    if (scroll) $("kit").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPlatform() {
    var p = PLAT[state.p], a = state.app;
    [].forEach.call($("platforms").children, function (b) { b.setAttribute("aria-checked", b.dataset.p === state.p ? "true" : "false"); });
    $("p-name").textContent = p.name;
    $("p-length").textContent = p.length;
    var tips = $("p-tips"); tips.textContent = "";
    p.tips.forEach(function (t) { tips.appendChild(el("li", "", t)); });
    if (!a) return;
    var shots = $("shots"); shots.textContent = "";
    a.shots.forEach(function (s) { shots.appendChild(el("li", "", s)); });
    shots.appendChild(el("li", "", "Close: " + p.cta + " (" + a.where + ")"));
    var caps = $("captions"); caps.textContent = "";
    var tagLine = a.tags.join(" ");
    a.captions.forEach(function (c, i) {
      var b = copyRow(caps, c, "caption " + (i + 1));
      b.dataset.full = c + "\n\n" + tagLine;
    });
    var tags = $("tags"); tags.textContent = "";
    a.tags.forEach(function (t) { tags.appendChild(el("code", "", t)); });
    var tb = el("button", "copy", "Copy"); tb.type = "button"; tb.setAttribute("aria-label", "Copy hashtags");
    tb.addEventListener("click", function () { copyText(tagLine, tb); });
    tags.appendChild(tb);
  }
  $("platforms").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-p]"); if (!b) return;
    state.p = b.dataset.p; renderPlatform(); writeHash();
  });

  /* ---------- payout ---------- */
  var form = $("calc");
  function fmtDate(iso) {
    var d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }
  function calc() {
    var r = C.payout({ pool: $("pool").value, posts: $("posts").value, floor: $("floor").value, mine: $("mine").value });
    var errs = $("r-errs"); errs.textContent = "";
    if (!r.ok) {
      $("r-per").textContent = "–"; $("r-mine").textContent = "–"; $("r-explain").textContent = "";
      r.errors.forEach(function (m) { errs.appendChild(el("li", "", m)); });
      errs.hidden = false;
    } else {
      errs.hidden = true;
      var M = C.money;
      $("r-per").textContent = M(r.perPost);
      $("r-mine").textContent = M(r.yourTotal);
      var s;
      if (r.floorApplies) {
        s = M(r.pool) + " split across " + r.posts + " posts would be " + M(r.split) + " each. That is below the " + M(r.floor) +
          " floor, so each accepted post is paid the floor: " + M(r.perPost) + ". In total that is " + M(r.paidOutTotal) +
          ", " + M(r.overPool) + " more than the pool. DECA's rule says \"never less than the floor\", so the floor still applies.";
      } else {
        s = M(r.pool) + " split equally across " + r.posts + " accepted posts is " + M(r.perPost) + " each" +
          (r.floor > 0 ? ", which is at or above the " + M(r.floor) + " floor." : ".");
        if (r.floor > 0 && isFinite(r.postsCoveredByPool)) s += " The split stays at or above the floor up to " + r.postsCoveredByPool + " accepted posts.";
      }
      if (r.mine !== 1) s += " Your " + r.mine + " accepted posts \u00d7 " + M(r.perPost) + " = " + M(r.yourTotal) + ".";
      $("r-explain").textContent = s;
    }
    var close = $("close").value, when = $("r-when");
    var mon = C.mondayAfter(close);
    when.textContent = mon ? "Paid " + fmtDate(mon) + ", the Monday after the campaign closes on " + fmtDate(close) + "."
                           : "Paid the Monday after the campaign closes. Add the close date to see which Monday.";
  }
  form.addEventListener("input", calc);
  form.addEventListener("submit", function (e) { e.preventDefault(); calc(); });

  /* ---------- hash state ---------- */
  function writeHash() {
    var tab = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0].dataset.tab;
    var h = tab === "payout" ? "#payout" : (state.app ? "#app=" + state.app.id + "&p=" + state.p : "#kit");
    if (location.hash !== h) history.replaceState(null, "", h);
  }
  function readHash() {
    var h = location.hash.slice(1);
    if (h === "payout") { showTab("payout"); return; }
    showTab("kit");
    var q = {}; h.split("&").forEach(function (kv) { var p = kv.split("="); if (p[1]) q[p[0]] = decodeURIComponent(p[1]); });
    if (q.p && PLAT[q.p]) state.p = q.p;
    if (q.app) pickApp(q.app, false); else renderPlatform();
  }
  window.addEventListener("hashchange", readHash);
  readHash();
  calc();
})();
