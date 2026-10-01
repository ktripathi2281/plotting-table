// The Plotting Table: a bounded sheet you pan and zoom, with plates, essays and seals pinned to it.
(function () {
  "use strict";

  var T = window.TABLE, PL = window.Plates, SH = window.Sheets, Harp = window.Harp;
  var doc = document, root = doc.documentElement;
  var NS = "http://www.w3.org/2000/svg";
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return SH.esc(s); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function pad4(n) { n = Math.round(n); return (n < 0 ? "-" : "") + String(Math.abs(n)).padStart(4, "0"); }
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var stage = $("#stage"), world = $("#world"), gridC = $("#grid"), rulC = $("#rulers");
  var tipEl = $("#tip"), panelEl = $("#panel"), pBody = $("#p-body"), pCount = $("#p-count");
  var drawer = $("#drawer"), dList = $("#d-list"), hint = $("#hint"), beacon = $("#beacon"), live = $("#live");
  var qInput = $("#q"), hitsEl = $("#hits"), statusEl = $("#find-status"), kpBox = $("#keyplan"), kpC = $("#kp");

  var WORLD = T.world, B = WORLD.bounds, sheets = T.sheets, byId = {};
  var MAXZ = 3;

  /* ------------------------------------------------------------------ state */
  var vw = 0, vh = 0, dpr = 1;
  var UI = { top: 48, ruler: 18, bottom: 44, mobile: false };
  var view = { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0, cx: 0, cy: 0 };
  var cam = { x: 1540, y: 470, z: 0.45 };   // what is drawn
  var tgt = { x: 1540, y: 470, z: 0.45 };   // where it is heading
  var vel = { x: 0, y: 0 };                  // inertia, world units per ms
  var panel = { w: 0, wT: 0, h: 0, hT: 0 }; // animated size of the wall label
  var state = { focus: null, saved: null, filter: "all", query: "", pen: false, dirty: true, flyUntil: 0, wheelSoft: 0, noClick: false, soft: false };
  var C = {};
  var mouse = { x: -1, y: -1 };
  var matches = [];
  var lastZoomAt = 0, rerasterDue = false;

  /* ------------------------------------------------------------------ colours (read from the tokens) */
  function readColors() {
    var cs = getComputedStyle(root);
    ["paper", "mat", "ink", "ink-2", "muted", "rule", "rule-strong", "accent", "accent-soft", "header-bg", "shadow"].forEach(function (k) { C[k] = cs.getPropertyValue("--" + k).trim(); });
    state.dirty = true;
  }

  /* ------------------------------------------------------------------ build the world */
  sheets.forEach(function (s, i) { s.index = i; byId[s.id] = s; });

  function anchor(id, side) {
    var s = byId[id];
    switch (side) {
      case "n": return { x: s.x + s.w / 2, y: s.y, nx: 0, ny: -1 };
      case "s": return { x: s.x + s.w * 0.84, y: s.y + s.h, nx: 0, ny: 1 }; // right of the caption text
      case "e": return { x: s.x + s.w, y: s.y + s.h / 2, nx: 1, ny: 0 };
      default: return { x: s.x, y: s.y + s.h / 2, nx: -1, ny: 0 };
    }
  }
  function curve(a, b) {
    var d = Math.hypot(b.x - a.x, b.y - a.y), k = Math.min(d * 0.5, 280);
    return { d: "M" + a.x + " " + a.y + "C" + (a.x + a.nx * k) + " " + (a.y + a.ny * k) + " " + (b.x + b.nx * k) + " " + (b.y + b.ny * k) + " " + b.x + " " + b.y,
      c: [[a.x, a.y], [a.x + a.nx * k, a.y + a.ny * k], [b.x + b.nx * k, b.y + b.ny * k], [b.x, b.y]] };
  }
  function bez(c, t) {
    var u = 1 - t;
    return [u * u * u * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t * t * t * c[3][0],
      u * u * u * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t * t * t * c[3][1]];
  }

  var routePts = []; // sampled red line, for the key plan
  function buildWorld() {
    // 1. the red line, the dotted ties, the gate
    var svg = "", n = 0;
    T.ties.forEach(function (t) {
      var c = curve(anchor(t[0], t[1]), anchor(t[2], t[3]));
      svg += '<path d="' + c.d + '" class="tie"/>'; n++;
    });
    T.route.forEach(function (r, i) {
      var c = curve(anchor(r[0], r[1]), anchor(r[2], r[3]));
      svg += '<path d="' + c.d + '" class="p red" pathLength="1" style="--w:1.7;--d:' + (0.6 + i * 0.85) + 's;--t:1.5s"/>';
      for (var k = 0; k <= 14; k++) routePts.push(bez(c.c, k / 14));
    });
    var g = WORLD.gate;
    svg += '<path d="M' + g.x + " " + (g.y - g.half) + "L" + g.x + " " + (g.y + g.half) + '" class="p red" pathLength="1" style="--w:1.7;--d:' + (0.6 + T.route.length * 0.85) + 's;--t:.5s"/>';
    world.insertAdjacentHTML("beforeend",
      '<div class="route-layer plot" id="route" aria-hidden="true"><svg viewBox="-300 -300 5300 3100" width="5300" height="3100">' + svg + "</svg></div>" +
      '<p class="gate-mark mono" aria-hidden="true">output</p>');

    // 2. the sheets
    sheets.forEach(function (s) {
      var el = doc.createElement("article");
      el.className = "sheet k-" + s.kind + " g-" + s.group;
      el.id = "sheet-" + s.id;
      el.dataset.id = s.id;
      el.tabIndex = 0;
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", s.no + ". " + s.title + (s.kicker ? ". " + s.kicker : "") + ". Press Enter to read.");
      el.style.cssText = "left:" + s.x + "px;top:" + s.y + "px;width:" + s.w + "px;height:" + s.h + "px";
      el.innerHTML = SH.render(s);
      world.appendChild(el);
      s.el = el;
      s.plots = $$(".plot", el);
      s.hay = [s.title, s.kicker, s.keywords, s.description, s.excerpt, s.pull, (s.notes || []).join(" "),
        (s.meta || []).map(function (m) { return m[1]; }).join(" "), (s.rows || []).map(function (m) { return m[0] + " " + m[1]; }).join(" "), s.project, s.collaborator]
        .join(" ").toLowerCase();
      s.titleLow = s.title.toLowerCase();
      s.cx = s.x + s.w / 2; s.cy = s.y + s.h / 2;
    });

    // 3. the visitor's own ink goes on top
    world.insertAdjacentHTML("beforeend", '<svg class="ink-layer" id="ink" viewBox="-300 -300 5300 3100" width="5300" height="3100" aria-hidden="true"></svg>');
  }

  /* ------------------------------------------------------------------ layout */
  function panelSize() {
    return UI.mobile ? { w: 0, h: Math.min(Math.round(vh * 0.48), 440) } : { w: Math.round(clamp(vw * 0.34, 360, 480)), h: 0 };
  }
  function panelTargets() {
    var p = panelSize();
    panel.wT = state.focus && !UI.mobile ? p.w : 0;
    panel.hT = state.focus && UI.mobile ? p.h : 0;
    root.style.setProperty("--panel-w", p.w + "px");
    root.style.setProperty("--panel-h", p.h + "px");
  }
  function updateView() {
    view.x0 = UI.ruler; view.y0 = UI.top + UI.ruler;
    view.x1 = vw - (UI.mobile ? 0 : panel.w);
    view.y1 = vh - UI.bottom - (UI.mobile ? panel.h : 0);
    view.w = Math.max(40, view.x1 - view.x0); view.h = Math.max(40, view.y1 - view.y0);
    view.cx = view.x0 + view.w / 2; view.cy = view.y0 + view.h / 2;
  }
  var kpW = 194, kpH = 112;
  function resize() {
    var ow = vw;
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    UI.mobile = vw < 720;
    UI.top = UI.mobile ? 44 : 48; UI.ruler = UI.mobile ? 0 : 18; UI.bottom = UI.mobile ? 58 : 44;
    root.style.setProperty("--top", UI.top + "px");
    root.style.setProperty("--bottom", UI.bottom + "px");
    root.style.setProperty("--ruler", UI.ruler + "px");
    [gridC, rulC].forEach(function (c) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); });
    kpH = Math.round(kpW * (B.y1 - B.y0) / (B.x1 - B.x0));
    kpC.width = Math.round(kpW * dpr); kpC.height = Math.round(kpH * dpr);
    kpC.style.width = kpW + "px"; kpC.style.height = kpH + "px";
    panelTargets();
    if (!state.focus) { panel.w = panel.wT; panel.h = panel.hT; }
    updateView();
    if (ow === 0) return;
    var c = clampCenter(tgt.x, tgt.y, Math.max(tgt.z, minZoom()));
    tgt.x = c.x; tgt.y = c.y; tgt.z = Math.max(tgt.z, minZoom());
    state.dirty = true;
  }

  /* ------------------------------------------------------------------ camera */
  function minZoom() { return Math.max(0.1, Math.min(view.w / (B.x1 - B.x0), view.h / (B.y1 - B.y0))); }
  function clampCenter(x, y, z) {
    var hw = view.w / 2 / z, hh = view.h / 2 / z;
    return {
      x: (B.x1 - B.x0 > 2 * hw) ? clamp(x, B.x0 + hw, B.x1 - hw) : (B.x0 + B.x1) / 2,
      y: (B.y1 - B.y0 > 2 * hh) ? clamp(y, B.y0 + hh, B.y1 - hh) : (B.y0 + B.y1) / 2
    };
  }
  function rubber(over, z, k) {
    var s = over * z, r = (s < 0 ? -1 : 1) * k * (1 - Math.exp(-Math.abs(s) / k));
    return r / z;
  }
  function displayTarget() {
    var c = clampCenter(tgt.x, tgt.y, tgt.z);
    return { x: c.x + rubber(tgt.x - c.x, tgt.z, 70), y: c.y + rubber(tgt.y - c.y, tgt.z, 70), z: tgt.z };
  }
  function s2w(sx, sy) { return { x: cam.x + (sx - view.cx) / cam.z, y: cam.y + (sy - view.cy) / cam.z }; }
  function w2s(wx, wy) { return { x: view.cx + (wx - cam.x) * cam.z, y: view.cy + (wy - cam.y) * cam.z }; }

  function zoomAbout(f, sx, sy, direct) {
    var nz = clamp(tgt.z * f, minZoom(), MAXZ);
    var wx = tgt.x + (sx - view.cx) / tgt.z, wy = tgt.y + (sy - view.cy) / tgt.z;
    tgt.z = nz; tgt.x = wx - (sx - view.cx) / nz; tgt.y = wy - (sy - view.cy) / nz;
    if (direct) { cam.x = tgt.x; cam.y = tgt.y; cam.z = tgt.z; }
    else { var c = clampCenter(tgt.x, tgt.y, tgt.z); tgt.x = c.x; tgt.y = c.y; }
    vel.x = vel.y = 0;
  }
  function flyTo(x, y, z, instant) {
    z = clamp(z, minZoom(), MAXZ);
    var c = clampCenter(x, y, z);
    tgt.x = c.x; tgt.y = c.y; tgt.z = z;
    vel.x = vel.y = 0;
    if (instant || reduce) { cam.x = tgt.x; cam.y = tgt.y; cam.z = tgt.z; }
    else state.flyUntil = performance.now() + 1200;
  }
  function homeView() {
    if (UI.mobile) return { x: 700, y: 480, z: clamp(view.w / 1090, 0.25, 0.6) };
    return { x: 1600, y: 470, z: clamp(Math.min(view.w / 2900, view.h / 1050), 0.3, 0.95) };
  }
  function goHome(instant) { var h = homeView(); flyTo(h.x, h.y, h.z, instant); }
  function fitAll() { flyTo((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, minZoom()); }

  /* ------------------------------------------------------------------ pointer: pan, pinch, pen */
  var ptrs = {}, nptr = 0;
  var pan = { armed: false, active: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, lt: 0 };
  var pinch = { active: false, d: 0, mx: 0, my: 0 };
  var cur = null; // stroke being drawn
  var ink = [];
  try { ink = JSON.parse(localStorage.getItem("kt-ink") || "[]"); } catch (e) { ink = []; }
  var inkSvg;

  function pathD(p) {
    if (p.length < 3) return "M" + p.map(function (q) { return q[0] + " " + q[1]; }).join("L");
    var d = "M" + p[0][0] + " " + p[0][1];
    for (var i = 1; i < p.length - 1; i++) d += "Q" + p[i][0] + " " + p[i][1] + " " + r1((p[i][0] + p[i + 1][0]) / 2) + " " + r1((p[i][1] + p[i + 1][1]) / 2);
    var l = p[p.length - 1];
    return d + "L" + l[0] + " " + l[1];
  }
  function renderInk() { inkSvg.innerHTML = ink.map(function (p) { return '<path d="' + pathD(p) + '"/>'; }).join(""); }
  function saveInk() {
    var total = 0;
    while (ink.length > 1 && (total = ink.reduce(function (a, p) { return a + p.length; }, 0)) > 24000) ink.shift();
    try { localStorage.setItem("kt-ink", JSON.stringify(ink)); } catch (e) {}
  }
  function beginStroke(e) {
    var w = s2w(e.clientX, e.clientY);
    cur = { id: e.pointerId, pts: [[r1(w.x), r1(w.y)]], last: [e.clientX, e.clientY], acc: 0, el: doc.createElementNS(NS, "path") };
    inkSvg.appendChild(cur.el);
  }
  function extendStroke(e) {
    if (!cur || e.pointerId !== cur.id) return;
    var dx = e.clientX - cur.last[0], dy = e.clientY - cur.last[1], dd = Math.hypot(dx, dy);
    if (dd < 2.5) return;
    cur.last = [e.clientX, e.clientY]; cur.acc += dd;
    var w = s2w(e.clientX, e.clientY);
    cur.pts.push([r1(w.x), r1(w.y)]);
    cur.el.setAttribute("d", pathD(cur.pts));
    if (cur.acc > 150) { cur.acc = 0; Harp.pluck(4 + ((cur.pts.length / 6) | 0) % 8, 0.4); }
  }
  function endStroke() {
    if (!cur) return;
    if (cur.pts.length < 2) cur.pts.push([cur.pts[0][0] + 0.1, cur.pts[0][1]]);
    cur.el.setAttribute("d", pathD(cur.pts));
    ink.push(cur.pts); saveInk(); cur = null;
  }

  stage.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; nptr = Object.keys(ptrs).length;
    hideTip();
    if (nptr === 2) { // a second finger: pinch, and drop any stroke or pan in progress
      if (cur) { cur.el.remove(); cur = null; }
      var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]];
      pinch.active = true; pinch.d = Math.hypot(a.x - b.x, a.y - b.y) || 1; pinch.mx = (a.x + b.x) / 2; pinch.my = (a.y + b.y) / 2;
      pan.armed = pan.active = false; stage.classList.remove("dragging");
      return;
    }
    if (nptr > 2) return;
    if (state.pen) { stage.setPointerCapture(e.pointerId); beginStroke(e); return; }
    pan.armed = true; pan.active = false; pan.id = e.pointerId;
    pan.sx = pan.lx = e.clientX; pan.sy = pan.ly = e.clientY; pan.lt = performance.now();
    vel.x = vel.y = 0; state.flyUntil = 0;
  });

  stage.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; state.dirty = true;
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    if (pinch.active && nptr >= 2) {
      var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAbout(d / pinch.d, mx, my, true);
      tgt.x -= (mx - pinch.mx) / cam.z; tgt.y -= (my - pinch.my) / cam.z; cam.x = tgt.x; cam.y = tgt.y;
      pinch.d = d; pinch.mx = mx; pinch.my = my; lastZoomAt = performance.now(); goneHint();
      return;
    }
    if (cur) { extendStroke(e); return; }
    if (!pan.armed || e.pointerId !== pan.id) return;
    if (!pan.active) {
      if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) < 4) return;
      pan.active = true; stage.setPointerCapture(e.pointerId); stage.classList.add("dragging");
      endActivePart(); hideTip(); goneHint();
    }
    var now = performance.now(), dx = e.clientX - pan.lx, dy = e.clientY - pan.ly, dt = Math.max(1, now - pan.lt);
    tgt.x -= dx / tgt.z; tgt.y -= dy / tgt.z;
    vel.x = vel.x * 0.65 + (-dx / tgt.z / dt) * 0.35; vel.y = vel.y * 0.65 + (-dy / tgt.z / dt) * 0.35;
    pan.lx = e.clientX; pan.ly = e.clientY; pan.lt = now;
  });

  function up(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId]; nptr = Object.keys(ptrs).length;
    if (cur && e.pointerId === cur.id) endStroke();
    if (pinch.active && nptr < 2) { pinch.active = false; vel.x = vel.y = 0; }
    if (pan.active && e.pointerId === pan.id) {
      pan.active = false; stage.classList.remove("dragging");
      if (performance.now() - pan.lt > 70 || reduce) vel.x = vel.y = 0;
      state.noClick = true; setTimeout(function () { state.noClick = false; }, 60);
    }
    if (e.pointerId === pan.id) pan.armed = false;
  }
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("pointerleave", function () { mouse.x = mouse.y = -1; state.dirty = true; });

  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    var k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? view.h : 1, dx = e.deltaX * k, dy = e.deltaY * k;
    goneHint(); hideTip();
    if (e.ctrlKey || e.metaKey) { // a trackpad pinch arrives as ctrl + wheel
      zoomAbout(Math.exp(-dy * 0.0024), e.clientX, e.clientY, false);
      lastZoomAt = performance.now();
      return;
    }
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    tgt.x += dx / tgt.z; tgt.y += dy / tgt.z; vel.x = vel.y = 0;
    state.wheelSoft = performance.now() + 140; state.flyUntil = 0;
  }, { passive: false });
  ["gesturestart", "gesturechange"].forEach(function (n) { doc.addEventListener(n, function (e) { e.preventDefault(); }); });
  stage.addEventListener("scroll", function () { stage.scrollLeft = 0; stage.scrollTop = 0; });

  stage.addEventListener("dblclick", function (e) {
    if (state.pen || e.target.closest(".sheet")) return;
    zoomAbout(1.9, e.clientX, e.clientY, false);
    lastZoomAt = performance.now();
  });

  /* ------------------------------------------------------------------ opening a sheet (the wall label) */
  function fitZoom(s) {
    var ps = panelSize();
    var availW = vw - UI.ruler - (UI.mobile ? 0 : ps.w) - (UI.mobile ? 24 : 72);
    var availH = vh - UI.top - UI.ruler - UI.bottom - (UI.mobile ? ps.h : 0) - (UI.mobile ? 28 : 72);
    return clamp(Math.min(availW / s.w, availH / s.h), 0.28, 1.7);
  }
  function renderPanel(s) {
    pBody.innerHTML = SH.panel(s);
    pBody.scrollTop = 0;
    pCount.textContent = (s.index + 1) + " / " + sheets.length;
  }
  function setPartTabs(s) {
    sheets.forEach(function (o) { $$(".part[role=button]", o.el).forEach(function (p) { p.tabIndex = (o === s) ? 0 : -1; }); });
  }

  function openSheet(id, opts) {
    var s = byId[id]; if (!s) return;
    opts = opts || {};
    if (!state.focus) state.saved = { x: tgt.x, y: tgt.y, z: tgt.z };
    if (state.focus && state.focus !== id) byId[state.focus].el.classList.remove("is-focus");
    state.focus = id;
    s.el.classList.add("is-focus");
    root.classList.add("reading-mode");
    closeDrawer();
    renderPanel(s);
    if (panelEl.hidden) { panelEl.style.transform = UI.mobile ? "translateY(100%)" : "translateX(100%)"; panelEl.hidden = false; }
    panelTargets();
    setPartTabs(s);
    reveal(s);
    flyTo(s.cx, s.cy, fitZoom(s), opts.instant);
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    live.textContent = "Opened " + s.no + ", " + s.title + ".";
    hint.classList.add("gone");
    if (!opts.instant) { Harp.chord(); }
    if (!opts.silentFocus) setTimeout(function () { var h = $("#panel-title"); if (h) h.focus({ preventScroll: true }); }, 60);
    state.dirty = true;
  }
  function closeSheet() {
    if (!state.focus) return;
    var s = byId[state.focus];
    s.el.classList.remove("is-focus");
    state.focus = null;
    root.classList.remove("reading-mode");
    panelTargets();
    setPartTabs(null);
    if (state.saved) { flyTo(state.saved.x, state.saved.y, state.saved.z); state.saved = null; }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    live.textContent = "Closed.";
    state.quiet = true; s.el.focus({ preventScroll: true }); state.quiet = false;
    state.dirty = true;
  }
  function step(dirn) {
    var from = state.focus ? byId[state.focus].index : (dirn > 0 ? -1 : 0);
    var i = (from + dirn + sheets.length) % sheets.length;
    openSheet(sheets[i].id, { silentFocus: true });
  }

  /* ------------------------------------------------------------------ reading drawings: parts, tooltip, panel caption */
  var activePart = null, pinned = false;
  function setActive(plotEl, id) {
    $$(".part.is-live", plotEl).forEach(function (p) {
      var lit = p.dataset.lit ? p.dataset.lit.split(" ") : [];
      p.classList.toggle("is-on", id != null && (p.dataset.part === id || lit.indexOf(id) > -1));
    });
    plotEl.classList.toggle("has-focus", id != null);
  }
  function partInfo(part) {
    var plotEl = part.closest(".plot");
    return (PL.parts(plotEl.dataset.plate) || {})[part.dataset.part];
  }
  function showTip(info, x, y) {
    tipEl.innerHTML = '<span class="mono">' + esc(info.name) + '</span><span class="tx">' + esc(info.text) + "</span>";
    tipEl.hidden = false;
    positionTip(x, y);
  }
  function positionTip(x, y) {
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    var tx = x + 16, ty = y + 20;
    if (tx + w > vw - 10) tx = x - w - 14;
    if (ty + h > vh - UI.bottom - 8) ty = y - h - 16;
    tipEl.style.left = Math.max(8, tx) + "px"; tipEl.style.top = Math.max(UI.top + 6, ty) + "px";
  }
  function hideTip() { tipEl.hidden = true; }
  function readingIn(sheetEl) { return state.focus && sheetEl.dataset.id === state.focus && !UI.mobile ? $("#reading") : null; }
  function setReading(el, info) {
    if (!el) return;
    el.classList.toggle("is-reading", !!info);
    el.innerHTML = info ? '<span class="mono">' + esc(info.name) + ".</span> " + esc(info.text) : '<span class="mono">On the drawing.</span> <span class="rt">' + esc(el.dataset.default || "") + "</span>";
  }
  function partIn(part, x, y) {
    if (state.pen || pan.active) return;
    var sheetEl = part.closest(".sheet"), plotEl = part.closest(".plot");
    if (cam.z < 0.42 && state.focus !== sheetEl.dataset.id) return;
    if (activePart && activePart !== part) partOut(activePart);
    activePart = part;
    setActive(plotEl, part.dataset.part);
    var info = partInfo(part); if (!info) return;
    var rd = readingIn(sheetEl);
    if (rd) setReading(rd, info); // mirrored in the wall label for screen readers
    showTip(info, x, y);
    Harp.pluck(Harp.noteOf(part.dataset.part), 0.5);
  }
  function partOut(part) {
    var plotEl = part.closest(".plot"), sheetEl = part.closest(".sheet");
    setActive(plotEl, null); hideTip();
    var rd = readingIn(sheetEl); if (rd) setReading(rd, null);
    if (activePart === part) activePart = null;
    pinned = false;
  }
  function endActivePart() { if (activePart) partOut(activePart); }

  world.addEventListener("pointerover", function (e) {
    if (e.pointerType === "touch" || !e.target.closest) return;
    var part = e.target.closest(".part.is-live");
    if (part && part !== activePart) partIn(part, e.clientX, e.clientY);
  });
  world.addEventListener("pointerout", function (e) {
    if (e.pointerType === "touch" || !activePart || pinned) return;
    var to = e.relatedTarget;
    if (to && to.nodeType === 1 && activePart.contains(to)) return;
    var from = e.target.closest && e.target.closest(".part.is-live");
    if (from === activePart) partOut(from);
  });
  world.addEventListener("pointermove", function (e) { if (activePart && !tipEl.hidden) positionTip(e.clientX, e.clientY); });
  world.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains("part")) {
      var r = t.getBoundingClientRect();
      partIn(t, r.left + r.width / 2, r.top + r.height / 2);
    } else if (t.classList && t.classList.contains("sheet") && !state.focus && !state.quiet && t.matches(":focus-visible")) {
      var s = byId[t.dataset.id];
      flyTo(s.cx, s.cy, Math.max(tgt.z, 0.5));
    }
  });
  world.addEventListener("focusout", function (e) { if (e.target.classList && e.target.classList.contains("part") && activePart === e.target) partOut(e.target); });

  /* ------------------------------------------------------------------ clicks */
  function replot(sheetEl) {
    $$(".plot", sheetEl).forEach(function (p) {
      p.classList.remove("is-plotted"); p.classList.add("is-reset");
      void p.offsetWidth;
      requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.remove("is-reset"); p.classList.add("is-plotted"); }); });
      setActive(p, null);
    });
    endActivePart();
  }
  stage.addEventListener("click", function (e) {
    if (state.noClick || state.pen) return;
    var t = e.target;
    var rp = t.closest("[data-act=replot]");
    if (rp) { replot(rp.closest(".sheet")); return; }
    if (t.closest("a")) return;
    var part = t.closest(".part.is-live"), sh = t.closest(".sheet");
    if (sh) {
      var id = sh.dataset.id;
      if (state.focus === id) {
        if (part) { // a tap on a part pins its reading (touch has no hover)
          if (activePart === part && pinned) { partOut(part); return; }
          var r = part.getBoundingClientRect();
          pinned = false; partIn(part, r.left + r.width / 2, r.top + r.height / 2); pinned = true;
        } else if (activePart) { pinned = false; partOut(activePart); }
      } else openSheet(id);
      return;
    }
    if (state.focus) closeSheet();
  });
  world.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("sheet")) { e.preventDefault(); openSheet(e.target.dataset.id); }
  });

  /* ------------------------------------------------------------------ reveal: sheets plot the first time they are seen */
  function reveal(s) {
    if (s.seen) return;
    s.seen = true;
    s.el.classList.add("is-in");
    s.plots.forEach(function (p) { p.classList.add("is-plotted"); });
  }
  function checkSeen() {
    for (var i = 0; i < sheets.length; i++) {
      var s = sheets[i]; if (s.seen) continue;
      var l = view.cx + (s.x - cam.x) * cam.z, t = view.cy + (s.y - cam.y) * cam.z, r = l + s.w * cam.z, b = t + s.h * cam.z;
      var iw = Math.min(r, view.x1) - Math.max(l, view.x0), ih = Math.min(b, view.y1) - Math.max(t, view.y0);
      if (iw > 0 && ih > 0 && (iw * ih >= 0.3 * (r - l) * (b - t) || iw * ih >= 0.22 * view.w * view.h)) reveal(s);
    }
  }

  /* ------------------------------------------------------------------ find + show */
  var STOP = { the: 1, a: 1, an: 1, of: 1, for: 1, and: 1, with: 1, or: 1, in: 1, on: 1, to: 1, me: 1, show: 1, work: 1, works: 1, project: 1, projects: 1, stuff: 1, things: 1 };
  var SYN = {
    ai: ["ai", "llm", "gpt", "gemini", "model", "agent"], llm: ["llm", "gpt", "gemini", "model", "ai"], agent: ["agent", "planner", "tutor", "tool calling"],
    realtime: ["real-time", "realtime", "socket", "live"], live: ["live", "real-time", "socket"],
    map: ["map", "leaflet", "openstreetmap", "grid", "radar"], safety: ["guardrail", "safety", "fraud", "cybercrime", "validation", "schema"],
    security: ["jwt", "auth", "otp", "rate limit", "cors", "guardrail"], backend: ["spring", "java", "node", "express", "sql", "mongodb", "api"],
    frontend: ["react", "next.js", "leaflet"], java: ["java", "spring"], db: ["mongodb", "postgres", "sql", "redis", "supabase", "database"],
    database: ["mongodb", "postgres", "sql", "redis", "supabase"], cert: ["certified", "credential", "claude", "badge"], certificate: ["certified", "credential", "claude", "badge"],
    resume: ["résumé", "resume", "cv", "pdf"], cv: ["resume", "résumé", "cv"], contact: ["email", "write", "enquir", "linkedin", "github"],
    hire: ["open to", "roles", "enquir", "resume"], hiring: ["open to", "roles", "enquir", "resume"], india: ["india", "indian", "bangalore", "22"],
    voice: ["voice", "transcribe", "speech"], language: ["language", "translate", "22"], writing: ["essay"], skill: ["skill", "materials", "stack"], skills: ["skill", "materials", "stack"],
    stack: ["materials", "methods", "frameworks", "languages"], education: ["b.tech", "mmmut", "education", "cgpa"], experience: ["tcs", "tata", "product engineer", "chronology"]
  };
  function tokens(q) { return q.toLowerCase().split(/[\s,+&]+/).filter(function (t) { return t && !STOP[t]; }); }
  function expand(t) {
    var base = t.length > 3 && /s$/.test(t) && !/ss$/.test(t) ? t.slice(0, -1) : t, out = [t];
    if (base !== t) out.push(base);
    [t, base].forEach(function (k) { if (SYN[k]) out = out.concat(SYN[k]); });
    return out;
  }
  function score(s, tk) {
    var total = 0;
    for (var i = 0; i < tk.length; i++) {
      var best = 0, alts = expand(tk[i]);
      for (var j = 0; j < alts.length; j++) {
        if (s.titleLow.indexOf(alts[j]) > -1) best = Math.max(best, 3);
        else if (s.hay.indexOf(alts[j]) > -1) best = Math.max(best, 1);
      }
      if (!best) return 0;
      total += best;
    }
    return total;
  }
  function applyFilters() {
    var tk = tokens(state.query), n = 0;
    matches = [];
    sheets.forEach(function (s) {
      var okF = state.filter === "all" || s.group === state.filter;
      s.score = tk.length ? score(s, tk) : 1;
      s.match = okF && s.score > 0;
      s.el.classList.toggle("dim", !s.match);
      if (s.match) { matches.push(s); n++; }
    });
    var filtering = state.filter !== "all" || tk.length;
    statusEl.textContent = !filtering ? "" : (n ? n + " of " + sheets.length : "No match");
    $$("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === state.filter ? "true" : "false"); });
    $$("li", dList).forEach(function (li, i) { li.classList.toggle("dim", !sheets[i].match); });
    var ranked = matches.slice().sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    if (tk.length && ranked.length) {
      hitsEl.hidden = false;
      hitsEl.innerHTML = ranked.slice(0, 6).map(function (s) {
        return '<li><button type="button" data-goto="' + s.id + '"><span class="mono n">' + esc(s.short) + '</span><span class="t">' + esc(s.title) + '</span><span class="mono g">' + esc(s.group) + "</span></button></li>";
      }).join("");
    } else { hitsEl.hidden = true; hitsEl.innerHTML = ""; }
    state.best = ranked[0] || null;
    state.dirty = true;
  }
  var qTimer = 0;
  qInput.addEventListener("input", function () { clearTimeout(qTimer); qTimer = setTimeout(function () { state.query = qInput.value; applyFilters(); if (matches.length && state.query) Harp.pluck(9, 0.3); }, 130); });
  $("#find").addEventListener("submit", function (e) {
    e.preventDefault();
    clearTimeout(qTimer); state.query = qInput.value; applyFilters();
    if (state.best) { openSheet(state.best.id); qInput.blur(); hitsEl.hidden = true; }
  });
  qInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { qInput.value = ""; state.query = ""; applyFilters(); qInput.blur(); e.stopPropagation(); }
  });
  qInput.addEventListener("focus", function () { if (state.query && hitsEl.innerHTML) hitsEl.hidden = false; });
  doc.addEventListener("pointerdown", function (e) { if (!e.target.closest("#find")) hitsEl.hidden = true; });

  /* a red marker at the edge of the view pointing to the best match when it is out of sight */
  function updateBeacon() {
    var s = state.query && state.best;
    if (!s) { beacon.hidden = true; return; }
    var c = w2s(s.cx, s.cy), l = w2s(s.x, s.y), r = w2s(s.x + s.w, s.y + s.h);
    var visible = r.x > view.x0 + 30 && l.x < view.x1 - 30 && r.y > view.y0 + 30 && l.y < view.y1 - 30;
    if (visible) { beacon.hidden = true; return; }
    var dx = c.x - view.cx, dy = c.y - view.cy, m = 34;
    var hw = view.w / 2 - m, hh = view.h / 2 - m;
    var t = Math.min(dx ? hw / Math.abs(dx) : 1e9, dy ? hh / Math.abs(dy) : 1e9);
    var bx = view.cx + dx * t, by = view.cy + dy * t;
    beacon.hidden = false;
    $(".bl", beacon).textContent = s.title;
    $(".arr", beacon).style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
    var bw = beacon.offsetWidth, bh = beacon.offsetHeight;
    var left = clamp(bx - bw / 2, view.x0 + 6, view.x1 - bw - 6), topY = clamp(by - bh / 2, view.y0 + 6, view.y1 - bh - 6);
    if (!UI.mobile && !kpBox.classList.contains("quiet")) { // keep clear of the key plan
      var kr = kpBox.getBoundingClientRect();
      if (left + bw > kr.left - 6 && topY + bh > kr.top - 6) topY = kr.top - bh - 10;
    }
    beacon.style.left = left + "px";
    beacon.style.top = topY + "px";
  }
  beacon.addEventListener("click", function () { if (state.best) openSheet(state.best.id); });

  function setFilter(f) { state.filter = f; applyFilters(); Harp.pluck(5 + ["all", "plate", "essay", "credential", "note"].indexOf(f), 0.4); }

  /* ------------------------------------------------------------------ index drawer */
  function buildDrawer() {
    dList.innerHTML = sheets.map(function (s) {
      return '<li><button type="button" data-goto="' + s.id + '"><span class="mono n">' + esc(s.short) + '</span><span class="t">' + esc(s.title) + '</span><span class="mono g">' + esc(s.group) + "</span></button></li>";
    }).join("");
    $("#d-count").textContent = "· " + sheets.length + " sheets";
    var show = $(".show").cloneNode(true);
    show.className = "show d-show"; $(".lab", show).remove();
    drawer.insertBefore(show, dList);
  }
  function openDrawer() {
    if (!drawer.hidden && drawer.classList.contains("open")) return;
    drawer.hidden = false; void drawer.offsetWidth; drawer.classList.add("open");
    $('[data-act="index"]').setAttribute("aria-expanded", "true");
    setTimeout(function () { var b = $("button", dList); if (b) b.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("open");
    $('[data-act="index"]').setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!drawer.classList.contains("open")) drawer.hidden = true; }, 340);
  }

  /* ------------------------------------------------------------------ toolbar */
  function setPen(on) {
    state.pen = on;
    root.classList.toggle("pen-on", on);
    $('[data-act="pen"]').setAttribute("aria-pressed", on ? "true" : "false");
    $(".pen-only").hidden = !on;
    if (on) { endActivePart(); hideTip(); hint.textContent = "Pen on · draw anywhere · Esc to stop"; hint.classList.remove("gone"); setTimeout(function () { hint.classList.add("gone"); }, 3500); }
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("kt-theme", t); } catch (e) {}
    $("#theme-tx").textContent = t === "dark" ? "Day" : "Night";
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#131210" : "#f2eee5");
    readColors();
  }
  function toggleSound() {
    var on = Harp.toggle();
    if (on === null) { $("#sound-tx").textContent = "No audio"; return; }
    $('[data-act="sound"]').setAttribute("aria-pressed", on ? "true" : "false");
    $("#sound-tx").textContent = on ? "Sound on" : "Sound off";
  }
  var goneT = 0;
  function goneHint() { if (goneT) return; goneT = 1; hint.classList.add("gone"); }

  doc.addEventListener("click", function (e) {
    var g = e.target.closest("[data-goto]");
    if (g) { e.preventDefault(); hitsEl.hidden = true; openSheet(g.getAttribute("data-goto")); return; }
    var f = e.target.closest("[data-filter]");
    if (f) { setFilter(f.getAttribute("data-filter")); return; }
    var a = e.target.closest("[data-act]");
    if (!a || a.getAttribute("data-act") === "replot") return;
    switch (a.getAttribute("data-act")) {
      case "index": drawer.classList.contains("open") ? closeDrawer() : openDrawer(); break;
      case "index-close": closeDrawer(); $('[data-act="index"]').focus(); break;
      case "pen": setPen(!state.pen); break;
      case "undo": ink.pop(); renderInk(); saveInk(); break;
      case "clear": ink = []; renderInk(); saveInk(); break;
      case "sound": toggleSound(); break;
      case "theme": setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); break;
      case "zoom-in": zoomAbout(1.35, view.cx, view.cy, false); lastZoomAt = performance.now(); break;
      case "zoom-out": zoomAbout(1 / 1.35, view.cx, view.cy, false); lastZoomAt = performance.now(); break;
      case "fit": if (state.focus) closeSheet(); state.saved = null; fitAll(); break;
      case "prev": step(-1); break;
      case "next": step(1); break;
      case "close": closeSheet(); break;
    }
  });

  doc.addEventListener("keydown", function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (e.key === "Escape") {
      if (typing) return;
      if (drawer.classList.contains("open")) { closeDrawer(); $('[data-act="index"]').focus(); }
      else if (state.focus) closeSheet();
      else if (state.pen) setPen(false);
      else if (state.query || state.filter !== "all") { qInput.value = ""; state.query = ""; state.filter = "all"; applyFilters(); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    var stepPx = Math.max(160, view.h * 0.32) / cam.z * (e.shiftKey ? 2.4 : 1), handled = true;
    switch (e.key) {
      case "ArrowLeft": tgt.x -= stepPx; break;
      case "ArrowRight": tgt.x += stepPx; break;
      case "ArrowUp": tgt.y -= stepPx; break;
      case "ArrowDown": tgt.y += stepPx; break;
      case "+": case "=": zoomAbout(1.3, view.cx, view.cy, false); lastZoomAt = performance.now(); break;
      case "-": case "_": zoomAbout(1 / 1.3, view.cx, view.cy, false); lastZoomAt = performance.now(); break;
      case "0": if (state.focus) closeSheet(); state.saved = null; fitAll(); break;
      case "1": if (state.focus) closeSheet(); state.saved = null; goHome(); break;
      case "/": qInput.focus(); break;
      case "[": case ",": step(-1); break;
      case "]": case ".": step(1); break;
      case "p": case "P": setPen(!state.pen); break;
      case "m": case "M": toggleSound(); break;
      case "d": case "D": setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); break;
      case "i": case "I": drawer.classList.contains("open") ? closeDrawer() : openDrawer(); break;
      default: handled = false;
    }
    if (handled) {
      e.preventDefault(); goneHint(); state.flyUntil = 0;
      if (/^Arrow/.test(e.key)) { var c = clampCenter(tgt.x, tgt.y, tgt.z); tgt.x = c.x; tgt.y = c.y; }
    }
  });

  /* ------------------------------------------------------------------ drawing: the sheet, its grid, the rulers, the key plan */
  function drawGrid() {
    var g = gridC.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.paper; g.fillRect(0, 0, vw, vh);
    var z = cam.z, ox = view.cx - cam.x * z, oy = view.cy - cam.y * z, W = WORLD.w, H = WORLD.h, ins = WORLD.inset;

    g.save();
    g.shadowColor = C.shadow; g.shadowBlur = 44 * Math.min(z, 1); g.shadowOffsetY = 20 * Math.min(z, 1);
    g.fillStyle = C.mat; g.fillRect(ox, oy, W * z, H * z);
    g.restore();
    g.strokeStyle = C.rule; g.lineWidth = 1; g.strokeRect(Math.round(ox) + 0.5, Math.round(oy) + 0.5, W * z, H * z);

    var vx0 = Math.max(0, (view.x0 - ox) / z), vx1 = Math.min(W, (view.x1 - ox) / z);
    var vy0 = Math.max(0, (view.y0 - oy) / z), vy1 = Math.min(H, (view.y1 - oy) / z);
    var wx, wy, sx, sy;

    // graph paper: a small cross at every 100, a fainter line every 500
    var st = 100 * z >= 18 ? 100 : 500 * z >= 18 ? 500 : 0;
    if (st) {
      g.strokeStyle = C["rule-strong"]; g.globalAlpha = 0.55; g.lineWidth = 1; g.beginPath();
      var arm = Math.min(4, st * z * 0.16);
      for (wx = Math.ceil(vx0 / st) * st; wx <= vx1; wx += st) for (wy = Math.ceil(vy0 / st) * st; wy <= vy1; wy += st) {
        sx = Math.round(ox + wx * z) + 0.5; sy = Math.round(oy + wy * z) + 0.5;
        g.moveTo(sx - arm, sy); g.lineTo(sx + arm, sy); g.moveTo(sx, sy - arm); g.lineTo(sx, sy + arm);
      }
      g.stroke(); g.globalAlpha = 1;
    }
    if (500 * z >= 36) {
      g.strokeStyle = C.rule; g.globalAlpha = 0.9; g.beginPath();
      for (wx = Math.ceil(vx0 / 500) * 500; wx <= vx1; wx += 500) { sx = Math.round(ox + wx * z) + 0.5; g.moveTo(sx, Math.max(view.y0, oy)); g.lineTo(sx, Math.min(view.y1, oy + H * z)); }
      for (wy = Math.ceil(vy0 / 500) * 500; wy <= vy1; wy += 500) { sy = Math.round(oy + wy * z) + 0.5; g.moveTo(Math.max(view.x0, ox), sy); g.lineTo(Math.min(view.x1, ox + W * z), sy); }
      g.stroke(); g.globalAlpha = 1;
    }

    // the boundary: an inner border with a tick every 50, a longer one every 250, and one gate
    var ix0 = ox + ins * z, iy0 = oy + ins * z, ix1 = ox + (W - ins) * z, iy1 = oy + (H - ins) * z;
    var gy = oy + WORLD.gate.y * z, gh = WORLD.gate.half * z;
    g.strokeStyle = C["rule-strong"]; g.lineWidth = 1; g.beginPath();
    g.moveTo(ix0, iy0); g.lineTo(ix1, iy0); g.moveTo(ix0, iy1); g.lineTo(ix1, iy1); g.moveTo(ix0, iy0); g.lineTo(ix0, iy1);
    g.moveTo(ix1, iy0); g.lineTo(ix1, gy - gh); g.moveTo(ix1, gy + gh); g.lineTo(ix1, iy1);
    var ts = 50 * z >= 7 ? 50 : 250;
    for (wx = Math.max(ins, Math.ceil(vx0 / ts) * ts); wx <= Math.min(W - ins, vx1); wx += ts) {
      var L = (wx % 250 === 0 ? 18 : 9) * z; sx = ox + wx * z;
      g.moveTo(sx, iy0); g.lineTo(sx, iy0 - L); g.moveTo(sx, iy1); g.lineTo(sx, iy1 + L);
    }
    for (wy = Math.max(ins, Math.ceil(vy0 / ts) * ts); wy <= Math.min(H - ins, vy1); wy += ts) {
      var L2 = (wy % 250 === 0 ? 18 : 9) * z; sy = oy + wy * z;
      g.moveTo(ix0, sy); g.lineTo(ix0 - L2, sy);
      if (Math.abs(wy - WORLD.gate.y) > WORLD.gate.half) { g.moveTo(ix1, sy); g.lineTo(ix1 + L2, sy); }
    }
    g.stroke();
    // the gate: the border opens, and two red bars mark the way out
    g.strokeStyle = C.accent; g.lineWidth = 1.4; g.beginPath();
    g.moveTo(ix1, gy - gh); g.lineTo(ox + W * z, gy - gh); g.moveTo(ix1, gy + gh); g.lineTo(ox + W * z, gy + gh);
    g.stroke();

    // registration marks just outside each corner
    if (z >= 0.15) {
      g.strokeStyle = C["rule-strong"]; g.lineWidth = 1; g.beginPath();
      [[-64, -64], [W + 64, -64], [-64, H + 64], [W + 64, H + 64]].forEach(function (c) {
        var cx = ox + c[0] * z, cy = oy + c[1] * z, r = 9 * z, a = 22 * z;
        g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, Math.PI * 2);
        g.moveTo(cx - a, cy); g.lineTo(cx + a, cy); g.moveTo(cx, cy - a); g.lineTo(cx, cy + a);
      });
      g.stroke();
    }
  }

  function nice(min) { var s = [10, 25, 50, 100, 250, 500, 1000, 2500]; for (var i = 0; i < s.length; i++) if (s[i] >= min) return s[i]; return 5000; }
  function drawRulers() {
    var g = rulC.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, vw, vh);
    if (!UI.ruler) return;
    var R = UI.ruler, top = UI.top, z = cam.z;
    g.fillStyle = C.paper;
    g.fillRect(0, top, vw, R); g.fillRect(0, top, R, vh - top - UI.bottom);
    g.strokeStyle = C.rule; g.lineWidth = 1; g.beginPath();
    g.moveTo(0, top + R + 0.5); g.lineTo(vw, top + R + 0.5); g.moveTo(R + 0.5, top); g.lineTo(R + 0.5, vh - UI.bottom);
    g.stroke();

    var minor = nice(7 / z), major = nice(70 / z);
    if (major < minor) major = minor;
    var x0 = cam.x - (view.cx - view.x0) / z, x1 = cam.x + (view.x1 - view.cx) / z;
    var y0 = cam.y - (view.cy - view.y0) / z, y1 = cam.y + (view.y1 - view.cy) / z, v, p;
    g.strokeStyle = C["rule-strong"]; g.fillStyle = C.muted; g.font = "9px " + getComputedStyle(root).getPropertyValue("--mono"); g.textBaseline = "alphabetic";
    g.beginPath();
    for (v = Math.ceil(x0 / minor) * minor; v <= x1; v += minor) {
      p = Math.round(view.cx + (v - cam.x) * z) + 0.5; if (p < R || p > view.x1) continue;
      var big = v % major === 0;
      g.moveTo(p, top + R); g.lineTo(p, top + R - (big ? R * 0.62 : R * 0.3));
    }
    for (v = Math.ceil(y0 / minor) * minor; v <= y1; v += minor) {
      p = Math.round(view.cy + (v - cam.y) * z) + 0.5; if (p < top + R) continue;
      var bg = v % major === 0;
      g.moveTo(R, p); g.lineTo(R - (bg ? R * 0.62 : R * 0.3), p);
    }
    g.stroke();
    for (v = Math.ceil(x0 / major) * major; v <= x1; v += major) {
      p = view.cx + (v - cam.x) * z; if (p < R + 14 || p > view.x1 - 20) continue;
      g.fillText(String(v), p + 3, top + 9);
    }
    for (v = Math.ceil(y0 / major) * major; v <= y1; v += major) {
      p = view.cy + (v - cam.y) * z; if (p < top + R + 20) continue;
      g.save(); g.translate(8, p - 3); g.rotate(-Math.PI / 2); g.fillText(String(v), 0, 0); g.restore();
    }
    // the pointer, marked on both rulers in red
    if (mouse.x >= view.x0 && mouse.x <= view.x1 && mouse.y >= view.y0 && mouse.y <= view.y1) {
      g.strokeStyle = C.accent; g.lineWidth = 1.2; g.beginPath();
      g.moveTo(Math.round(mouse.x) + 0.5, top); g.lineTo(Math.round(mouse.x) + 0.5, top + R);
      g.moveTo(0, Math.round(mouse.y) + 0.5); g.lineTo(R, Math.round(mouse.y) + 0.5);
      g.stroke();
    }
    g.fillStyle = C.accent; g.fillRect(2, top + 2, R - 4, R - 4); // the corner: where the two rulers meet
  }

  function drawKeyplan() {
    if (UI.mobile) return;
    var g = kpC.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, kpW, kpH);
    var s = kpW / (B.x1 - B.x0);
    function X(v) { return (v - B.x0) * s; }
    function Y(v) { return (v - B.y0) * s; }
    g.fillStyle = C.mat; g.strokeStyle = C.rule; g.lineWidth = 1;
    g.fillRect(X(0), Y(0), WORLD.w * s, WORLD.h * s); g.strokeRect(X(0) + 0.5, Y(0) + 0.5, WORLD.w * s, WORLD.h * s);
    sheets.forEach(function (sh) {
      g.globalAlpha = sh.match === false ? 0.18 : 0.6;
      g.fillStyle = sh.id === state.focus ? C.accent : C["rule-strong"];
      g.fillRect(X(sh.x), Y(sh.y), Math.max(2, sh.w * s), Math.max(2, sh.h * s));
    });
    g.globalAlpha = 1;
    g.strokeStyle = C.accent; g.lineWidth = 1; g.beginPath();
    routePts.forEach(function (p, i) { if (i % 15 === 0) g.moveTo(X(p[0]), Y(p[1])); else g.lineTo(X(p[0]), Y(p[1])); });
    g.stroke();
    var vx = cam.x - view.w / 2 / cam.z, vy = cam.y - view.h / 2 / cam.z, vww = view.w / cam.z, vhh = view.h / cam.z;
    g.fillStyle = C["accent-soft"]; g.fillRect(X(vx), Y(vy), vww * s, vhh * s);
    g.strokeStyle = C.ink; g.strokeRect(X(vx) + 0.5, Y(vy) + 0.5, vww * s, vhh * s);
  }
  (function keyplanPointer() {
    var down = false;
    function go(e) {
      var r = kpC.getBoundingClientRect(), s = (B.x1 - B.x0) / r.width;
      var x = B.x0 + (e.clientX - r.left) * s, y = B.y0 + (e.clientY - r.top) * s;
      var c = clampCenter(x, y, tgt.z); tgt.x = c.x; tgt.y = c.y; vel.x = vel.y = 0; state.flyUntil = performance.now() + 500;
    }
    kpBox.addEventListener("pointerdown", function (e) { down = true; kpBox.setPointerCapture(e.pointerId); go(e); });
    kpBox.addEventListener("pointermove", function (e) { if (down) go(e); });
    kpBox.addEventListener("pointerup", function () { down = false; });
    kpBox.addEventListener("pointercancel", function () { down = false; });
  })();

  /* ------------------------------------------------------------------ the loop */
  var last = performance.now(), travel = 0, lastPluck = 0, noteWalk = 6, cssK = -1, cssSK = -1;
  var readoutEl = $("#readout"), zoomEl = $("#zoomlab");

  function frame(now) { step(now); requestAnimationFrame(frame); }

  function step(now) {
    var dt = clamp(now - last, 1, 48); last = now;

    // the wall label slides in and the view shrinks to make room
    var kp = 1 - Math.exp(-dt * (reduce ? 0.2 : 0.011));
    panel.w += (panel.wT - panel.w) * kp; panel.h += (panel.hT - panel.h) * kp;
    if (Math.abs(panel.wT - panel.w) < 0.4) panel.w = panel.wT;
    if (Math.abs(panel.hT - panel.h) < 0.4) panel.h = panel.hT;
    updateView();
    var ps = panelSize();
    if (!panelEl.hidden) {
      panelEl.style.transform = UI.mobile ? "translateY(" + (1 - panel.h / ps.h) * 100 + "%)" : "translateX(" + (1 - panel.w / ps.w) * 100 + "%)";
      if (!state.focus && panel.w < 1 && panel.h < 1) panelEl.hidden = true;
    }

    // inertia, then bounds (soft while you are holding it, so the edge gives a little)
    state.soft = pan.active || pinch.active || now < state.wheelSoft;
    if (!pan.active && !pinch.active && (vel.x || vel.y)) {
      tgt.x += vel.x * dt; tgt.y += vel.y * dt;
      var dk = Math.exp(-dt * 0.0048); vel.x *= dk; vel.y *= dk;
      if (Math.abs(vel.x * cam.z) < 0.008) vel.x = 0;
      if (Math.abs(vel.y * cam.z) < 0.008) vel.y = 0;
    }
    if (!state.soft) { var cc = clampCenter(tgt.x, tgt.y, tgt.z); tgt.x = cc.x; tgt.y = cc.y; }

    // ease the camera toward its target
    var rate = reduce ? 200 : pan.active ? 34 : now < state.flyUntil ? 5 : 13;
    var k = 1 - Math.exp(-dt * rate * 0.001), d = displayTarget();
    var nz = Math.exp(Math.log(cam.z) + (Math.log(d.z) - Math.log(cam.z)) * k);
    var nx = cam.x + (d.x - cam.x) * k, ny = cam.y + (d.y - cam.y) * k;
    if (Math.abs(d.x - nx) * nz < 0.02 && Math.abs(d.y - ny) * nz < 0.02) { nx = d.x; ny = d.y; }
    if (Math.abs(Math.log(d.z / nz)) < 0.0004) nz = d.z;
    var moved = Math.hypot(nx - cam.x, ny - cam.y) * nz, zoomed = Math.abs(nz - cam.z) > 1e-5;
    if (moved > 0 || zoomed) state.dirty = true;
    if (zoomed) { lastZoomAt = now; rerasterDue = true; }
    cam.x = nx; cam.y = ny; cam.z = nz;

    // a note for every stretch of ground covered
    travel += moved;
    if (travel > 140) {
      travel = 0;
      if (Harp.on && now - lastPluck > 60) {
        lastPluck = now;
        noteWalk = clamp(noteWalk + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() * 2 | 0)), 0, 14);
        var n = pan.active ? Math.round((mouse.x / Math.max(vw, 1)) * 12) + 2 : noteWalk;
        Harp.pluck(n, Math.min(1, 0.3 + moved * 0.04));
      }
    }

    if (state.dirty || panel.w !== panel.wT || panel.h !== panel.hT) {
      state.dirty = false;
      var tx = view.cx - cam.x * cam.z, ty = view.cy - cam.y * cam.z;
      world.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" + cam.z.toFixed(5) + ")";
      var kk = Math.round(clamp(0.5 / cam.z, 1, 1.7) * 20) / 20, sk = Math.round(clamp(1 / (cam.z * 1.15), 1, 3.2) * 10) / 10;
      if (kk !== cssK) { cssK = kk; world.style.setProperty("--k", kk); }
      if (sk !== cssSK) { cssSK = sk; world.style.setProperty("--sk", sk); }
      world.classList.toggle("far", cam.z < 0.42);
      kpBox.classList.toggle("quiet", cam.z < minZoom() * 1.12);
      drawGrid(); drawRulers(); drawKeyplan();
      readoutEl.textContent = "X " + pad4(cam.x) + " · Y " + pad4(cam.y);
      zoomEl.textContent = "×" + cam.z.toFixed(2);
      checkSeen(); updateBeacon();
    }

    // once zooming stops, ask the browser to re-draw the world sharply at the new scale
    if (rerasterDue && now - lastZoomAt > 180) {
      rerasterDue = false;
      world.style.willChange = "auto";
      requestAnimationFrame(function () { world.style.willChange = "transform"; });
    }
  }

  /* ------------------------------------------------------------------ go */
  buildWorld();
  inkSvg = $("#ink");
  renderInk();
  buildDrawer();
  readColors();
  setTheme(root.getAttribute("data-theme") || "dark");
  world.style.willChange = "transform";
  resize();
  applyFilters();
  goHome(true);
  window.addEventListener("resize", function () { resize(); });
  if (window.ResizeObserver) new ResizeObserver(function () { if (window.innerWidth !== vw || window.innerHeight !== vh) resize(); }).observe(doc.documentElement);

  // the red line plots first, then whatever is in view
  requestAnimationFrame(function () {
    $("#route").classList.add("is-plotted");
    var h = location.hash.slice(1);
    if (h && byId[h]) openSheet(h, { instant: true, silentFocus: true });
    last = performance.now();
    requestAnimationFrame(frame);
  });
  window.addEventListener("hashchange", function () { var h = location.hash.slice(1); if (h && byId[h] && state.focus !== h) openSheet(h); });

  // A small API for embedding and tests. step(ms) advances the camera by ms without waiting for a frame.
  window.table = {
    open: openSheet, close: closeSheet, home: goHome, fit: fitAll, sheets: sheets,
    camera: function () { return { x: cam.x, y: cam.y, z: cam.z, target: { x: tgt.x, y: tgt.y, z: tgt.z }, view: { w: view.w, h: view.h } }; },
    step: function (ms) { for (var t = 0; t < ms; t += 16) step(last + 16); }
  };
})();
