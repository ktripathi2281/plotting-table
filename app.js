// The Plotting Table: an endless table of plates. The sheets form one block that repeats in every
// direction (each row of blocks shifted sideways, like bricks), so there is no edge to reach.
// Only the copies near the view exist in the page; the rest are made and discarded as you travel.
(function () {
  "use strict";

  var T = window.TABLE, PL = window.Plates, SH = window.Sheets, Harp = window.Harp;
  var doc = document, root = doc.documentElement;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) { return SH.esc(s); }
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var stage = $("#stage"), world = $("#world");
  var tipEl = $("#tip"), panelEl = $("#panel"), pBody = $("#p-body"), pCount = $("#p-count");
  var drawer = $("#drawer"), dList = $("#d-list"), hint = $("#hint"), live = $("#live");
  var qInput = $("#q"), qMobile = $("#q-m"), hitsEl = $("#hits"), statusEl = $("#find-status");

  var P = T.period, sheets = T.sheets, byId = {};
  var MAXZ = 1.8;

  /* ------------------------------------------------------------------ state */
  var vw = 0, vh = 0;
  var UI = { mobile: false };
  var view = { x1: 0, y1: 0, w: 0, h: 0, cx: 0, cy: 0 };   // the part of the window the table shows
  var cam = { x: 900, y: 470, z: 0.5 };                     // what is drawn
  var tgt = { x: 900, y: 470, z: 0.5 };                     // where it is heading
  var vel = { x: 0, y: 0 };                                  // inertia, world units per ms
  var panel = { w: 0, wT: 0, h: 0, hT: 0 };                  // animated size of the wall label
  var state = { focus: null, saved: null, filter: "all", query: "", flyUntil: 0, dirty: true, cull: true, noClick: false, best: null };
  var inst = {};                                             // the copies of sheets that currently exist
  var mouse = { x: 0, y: 0 };
  var matches = [];
  var lastCull = null, lastZoomAt = 0, rerasterDue = false;

  sheets.forEach(function (s, i) {
    s.index = i; byId[s.id] = s;
    s.cx = s.x + s.w / 2; s.cy = s.y + s.h / 2;
    s.seen = false; s.match = true; s.score = 1;
    s.titleLow = s.title.toLowerCase();
    s.hay = [s.title, s.kicker, s.keywords, s.description, s.excerpt, s.lead, s.pull, (s.notes || []).join(" "),
      (s.meta || []).map(function (m) { return m[1]; }).join(" "), (s.rows || []).map(function (m) { return m[0] + " " + m[1]; }).join(" "),
      s.project, s.collaborator].join(" ").toLowerCase();
  });
  function focusId() { return state.focus && state.focus.id; }

  /* ------------------------------------------------------------------ layout */
  function panelSize() {
    return UI.mobile ? { w: 0, h: Math.min(Math.round(vh * 0.5), 440) } : { w: Math.round(clamp(vw * 0.34, 360, 460)), h: 0 };
  }
  function panelTargets() {
    var p = panelSize();
    panel.wT = state.focus && !UI.mobile ? p.w : 0;
    panel.hT = state.focus && UI.mobile ? p.h : 0;
    root.style.setProperty("--panel-w", p.w + "px");
    root.style.setProperty("--panel-h", p.h + "px");
  }
  function updateView() {
    view.x1 = vw - (UI.mobile ? 0 : panel.w);
    view.y1 = vh - (UI.mobile ? panel.h : 0);
    view.w = view.x1; view.h = view.y1;
    view.cx = view.w / 2; view.cy = view.h / 2;
  }
  var ready = false;
  function resize() {
    var w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;      // hidden, or not laid out yet: wait for a real size
    vw = w; vh = h;
    UI.mobile = vw < 720;
    panelTargets();
    if (!state.focus) { panel.w = panel.wT; panel.h = panel.hT; }
    updateView();
    tgt.z = clamp(tgt.z, minZoom(), MAXZ);
    state.dirty = state.cull = true;
    if (!ready) { ready = true; place(); }
  }
  // The first time the window has a size: put the camera at the start, or at the sheet in the address.
  function place() {
    goHome(true);
    updateInstances();
    var h = location.hash.slice(1);
    if (h && byId[h]) openSheet(h, null, { instant: true, silentFocus: true });
  }

  /* ------------------------------------------------------------------ camera: free, no edges */
  function minZoom() { return UI.mobile ? 0.2 : 0.26; }
  function zoomAbout(f, sx, sy, direct) {
    var nz = clamp(tgt.z * f, minZoom(), MAXZ);
    var wx = tgt.x + (sx - view.cx) / tgt.z, wy = tgt.y + (sy - view.cy) / tgt.z;
    tgt.z = nz; tgt.x = wx - (sx - view.cx) / nz; tgt.y = wy - (sy - view.cy) / nz;
    if (direct) { cam.x = tgt.x; cam.y = tgt.y; cam.z = tgt.z; }
    vel.x = vel.y = 0;
    lastZoomAt = performance.now();
  }
  function flyTo(x, y, z, instant) {
    tgt.x = x; tgt.y = y; tgt.z = clamp(z, minZoom(), MAXZ);
    vel.x = vel.y = 0;
    if (instant || reduce) { cam.x = tgt.x; cam.y = tgt.y; cam.z = tgt.z; }
    else state.flyUntil = performance.now() + 1200;
  }
  function homeView() {
    if (UI.mobile) { var t = byId.title; return { x: t.cx, y: t.cy + 70, z: clamp((vw - 36) / t.w, 0.22, 0.6) }; }
    return { x: 900, y: 470, z: clamp(Math.min(view.w / 1900, view.h / 1100), 0.3, 0.8) };
  }
  function goHome(instant) { var h = homeView(); flyTo(h.x, h.y, h.z, instant); }

  /* ------------------------------------------------------------------ the copies: made near the view, dropped when far */
  function ikey(bx, by, id) { return bx + "|" + by + "|" + id; }
  function posX(s, bx, by) { return bx * P.w + by * P.shift + s.x; }
  function posY(s, by) { return by * P.h + s.y; }

  function makeInst(s, bx, by) {
    var k = ikey(bx, by, s.id);
    if (inst[k]) return inst[k];
    var x = posX(s, bx, by), y = posY(s, by);
    var el = doc.createElement("article");
    el.className = "sheet k-" + s.kind + " g-" + s.group + (s.seen ? " is-in" : "") + (s.match ? "" : " dim");
    el.dataset.id = s.id; el.dataset.key = k; el.dataset.stock = s.stock || "cream"; el.tabIndex = -1;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", s.no + ". " + s.title + (s.kicker ? ". " + s.kicker : "") + ". Press Enter to read.");
    el.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + s.w + "px;height:" + s.h + "px";
    el.innerHTML = SH.render(s, String(bx + "_" + by).replace(/-/g, "m"));
    var plots = $$(".plot", el);
    if (s.seen) plots.forEach(function (p) { p.classList.add("is-plotted"); }); // already drawn once: no need to plot again
    if (state.focus && state.focus.key === k) el.classList.add("is-focus");
    world.appendChild(el);
    var o = (inst[k] = { key: k, s: s, bx: bx, by: by, el: el, x: x, y: y, cx: x + s.w / 2, cy: y + s.h / 2, plotted: !!s.seen, plots: plots, svgs: $$("svg", el), vis: true, idle: false });
    if (reduce) setIdle(o, true); // no motion for those who asked for none
    return o;
  }
  // Out of sight, a sheet stops moving: no point animating what nobody can see.
  function setIdle(o, idle) {
    o.el.classList.toggle("idle", idle);
    o.svgs.forEach(function (svg) { try { if (idle) svg.pauseAnimations(); else svg.unpauseAnimations(); } catch (e) {} });
  }
  function dropInst(o) {
    if (activePart && o.el.contains(activePart)) endActivePart();
    o.el.remove(); delete inst[o.key];
  }

  // Make the copies that fall within M1 of the window, keep those within M2, drop the rest.
  function updateInstances() {
    var z = cam.z, M1 = 600, M2 = 900, keep = {};
    var wx0 = cam.x - view.cx / z, wx1 = cam.x + (vw - view.cx) / z, wy0 = cam.y - view.cy / z, wy1 = cam.y + (vh - view.cy) / z;
    sheets.forEach(function (s) {
      var byMin = Math.floor((wy0 - M2 - s.y - s.h) / P.h), byMax = Math.ceil((wy1 + M2 - s.y) / P.h);
      for (var by = byMin; by <= byMax; by++) {
        var y = posY(s, by);
        if (y + s.h < wy0 - M2 || y > wy1 + M2) continue;
        var bxMin = Math.floor((wx0 - M2 - by * P.shift - s.x - s.w) / P.w), bxMax = Math.ceil((wx1 + M2 - by * P.shift - s.x) / P.w);
        for (var bx = bxMin; bx <= bxMax; bx++) {
          var x = posX(s, bx, by);
          if (x + s.w < wx0 - M2 || x > wx1 + M2) continue;
          var k = ikey(bx, by, s.id);
          if (inst[k]) keep[k] = 1;
          else if (!(x + s.w < wx0 - M1 || x > wx1 + M1 || y + s.h < wy0 - M1 || y > wy1 + M1)) { makeInst(s, bx, by); keep[k] = 1; }
        }
      }
    });
    Object.keys(inst).forEach(function (k) {
      if (keep[k] || (state.focus && state.focus.key === k)) return;
      dropInst(inst[k]);
    });
    // only the sheets in view are reachable with Tab
    Object.keys(inst).forEach(function (k) {
      var o = inst[k];
      var l = view.cx + (o.x - cam.x) * z, t = view.cy + (o.y - cam.y) * z;
      o.el.tabIndex = (l < view.x1 && l + o.s.w * z > 0 && t < view.y1 && t + o.s.h * z > 0) ? 0 : -1;
    });
    lastCull = { x: cam.x, y: cam.y, z: cam.z };
    state.cull = false;
  }

  // The copy of a sheet nearest to a point (made if it does not exist yet).
  function nearestInst(s, fx, fy) {
    fx = fx == null ? tgt.x : fx; fy = fy == null ? tgt.y : fy;
    var best = null, bd = Infinity, cby = Math.round((fy - s.cy) / P.h);
    for (var by = cby - 1; by <= cby + 1; by++) {
      var cbx = Math.round((fx - by * P.shift - s.cx) / P.w);
      for (var bx = cbx - 1; bx <= cbx + 1; bx++) {
        var x = bx * P.w + by * P.shift + s.cx, y = by * P.h + s.cy, d = (x - fx) * (x - fx) + (y - fy) * (y - fy);
        if (d < bd) { bd = d; best = { bx: bx, by: by }; }
      }
    }
    return makeInst(s, best.bx, best.by);
  }

  // Each copy plots itself the first time it is properly in view.
  function revealInst(o) {
    o.plotted = true; o.s.seen = true;
    o.el.classList.add("is-in");
    o.plots.forEach(function (p) { p.classList.add("is-plotted"); });
  }
  var LIVE_MAX = 16; // at most this many sheets animate at once: the ones nearest the middle of the view
  function checkSeen() {
    var near = [];
    Object.keys(inst).forEach(function (k) {
      var o = inst[k];
      var l = view.cx + (o.x - cam.x) * cam.z, t = view.cy + (o.y - cam.y) * cam.z, r = l + o.s.w * cam.z, b = t + o.s.h * cam.z;
      o.vis = r > -60 && l < vw + 60 && b > -60 && t < vh + 60;
      if (o.vis) near.push({ o: o, d: Math.abs((l + r) / 2 - view.cx) + Math.abs((t + b) / 2 - view.cy) });
      if (o.plotted) return;
      var iw = Math.min(r, view.x1) - Math.max(l, 0), ih = Math.min(b, view.y1) - Math.max(t, 0);
      if (iw > 0 && ih > 0 && (iw * ih >= 0.3 * (r - l) * (b - t) || iw * ih >= 0.2 * view.w * view.h)) revealInst(o);
    });
    if (reduce) return;
    near.sort(function (a, b) { return a.d - b.d; });
    var live = {};
    near.slice(0, LIVE_MAX).forEach(function (n) { live[n.o.key] = 1; });
    Object.keys(inst).forEach(function (k) {
      var o = inst[k], idle = !live[k];
      if (idle !== o.idle) { o.idle = idle; setIdle(o, idle); }
    });
  }

  /* ------------------------------------------------------------------ pointer: pan and pinch */
  var ptrs = {}, nptr = 0;
  var pan = { armed: false, active: false, id: null, sx: 0, sy: 0, lx: 0, ly: 0, lt: 0 };
  var pinch = { active: false, d: 0, mx: 0, my: 0 };

  stage.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; nptr = Object.keys(ptrs).length;
    hideTip();
    if (nptr === 2) { // a second finger: pinch
      var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]];
      pinch.active = true; pinch.d = Math.hypot(a.x - b.x, a.y - b.y) || 1; pinch.mx = (a.x + b.x) / 2; pinch.my = (a.y + b.y) / 2;
      pan.armed = pan.active = false; stage.classList.remove("dragging");
      return;
    }
    if (nptr > 2) return;
    pan.armed = true; pan.active = false; pan.id = e.pointerId;
    pan.sx = pan.lx = e.clientX; pan.sy = pan.ly = e.clientY; pan.lt = performance.now();
    vel.x = vel.y = 0; state.flyUntil = 0;
  });

  stage.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    if (pinch.active && nptr >= 2) {
      var k = Object.keys(ptrs), a = ptrs[k[0]], b = ptrs[k[1]];
      var d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAbout(d / pinch.d, mx, my, true);
      tgt.x -= (mx - pinch.mx) / cam.z; tgt.y -= (my - pinch.my) / cam.z; cam.x = tgt.x; cam.y = tgt.y;
      pinch.d = d; pinch.mx = mx; pinch.my = my; goneHint();
      return;
    }
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

  stage.addEventListener("wheel", function (e) {
    e.preventDefault();
    var k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? view.h : 1, dx = e.deltaX * k, dy = e.deltaY * k;
    goneHint(); hideTip();
    if (e.ctrlKey || e.metaKey) { zoomAbout(Math.exp(-dy * 0.0024), e.clientX, e.clientY, false); return; } // a trackpad pinch arrives as ctrl + wheel
    if (e.shiftKey && !dx) { dx = dy; dy = 0; }
    tgt.x += dx / tgt.z; tgt.y += dy / tgt.z; vel.x = vel.y = 0; state.flyUntil = 0;
  }, { passive: false });
  ["gesturestart", "gesturechange"].forEach(function (n) { doc.addEventListener(n, function (e) { e.preventDefault(); }); });
  stage.addEventListener("scroll", function () { stage.scrollLeft = 0; stage.scrollTop = 0; });

  /* ------------------------------------------------------------------ opening a sheet: the wall label */
  function fitZoom(s) {
    var ps = panelSize();
    var availW = vw - (UI.mobile ? 0 : ps.w) - (UI.mobile ? 28 : 120);
    var availH = vh - (UI.mobile ? ps.h : 0) - (UI.mobile ? 90 : 230); // room for the corner boxes and the label
    return clamp(Math.min(availW / s.w, availH / s.h), 0.26, 1.5);
  }
  function renderPanel(s) {
    pBody.innerHTML = SH.panel(s);
    pBody.scrollTop = 0;
    pCount.textContent = (s.index + 1) + " / " + sheets.length;
  }
  function setPartTabs(key) {
    Object.keys(inst).forEach(function (k) { $$(".part[role=button]", inst[k].el).forEach(function (p) { p.tabIndex = (k === key) ? 0 : -1; }); });
  }

  function openSheet(id, key, opts) {
    var s = byId[id]; if (!s) return;
    opts = opts || {};
    var o = (key && inst[key]) || nearestInst(s);
    if (!state.focus) state.saved = { x: tgt.x, y: tgt.y, z: tgt.z };
    if (state.focus && inst[state.focus.key]) inst[state.focus.key].el.classList.remove("is-focus");
    state.focus = { id: id, key: o.key };
    o.el.classList.add("is-focus");
    root.classList.add("reading-mode");
    closeDrawer();
    renderPanel(s);
    if (panelEl.hidden) { panelEl.style.transform = UI.mobile ? "translateY(100%)" : "translateX(100%)"; panelEl.hidden = false; }
    panelTargets();
    setPartTabs(o.key);
    revealInst(o);
    var fz = fitZoom(s);
    flyTo(o.cx, o.cy + (UI.mobile ? 0 : 34 / fz), fz, opts.instant); // sit a little high, clear of the find box
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    live.textContent = "Opened " + s.no + ", " + s.title + ".";
    goneHint();
    if (!opts.instant) Harp.chord();
    if (!opts.silentFocus) setTimeout(function () { var h = $("#panel-title"); if (h) h.focus({ preventScroll: true }); }, 60);
    state.dirty = true;
  }
  function closeSheet() {
    if (!state.focus) return;
    var o = inst[state.focus.key];
    if (o) o.el.classList.remove("is-focus");
    state.focus = null;
    root.classList.remove("reading-mode");
    panelTargets();
    setPartTabs(null);
    if (state.saved) { flyTo(state.saved.x, state.saved.y, state.saved.z); state.saved = null; }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    live.textContent = "Closed.";
    if (o) { state.quiet = true; o.el.focus({ preventScroll: true }); state.quiet = false; }
    state.dirty = state.cull = true;
  }
  function step(dirn) {
    var from = state.focus ? byId[state.focus.id].index : (dirn > 0 ? -1 : 0);
    openSheet(sheets[(from + dirn + sheets.length) % sheets.length].id, null, { silentFocus: true });
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
  function partInfo(part) { return (PL.parts(part.closest(".plot").dataset.plate) || {})[part.dataset.part]; }
  function showTip(info, x, y) {
    tipEl.innerHTML = '<span class="mono">' + esc(info.name) + '</span><span class="tx">' + esc(info.text) + "</span>";
    tipEl.hidden = false;
    positionTip(x, y);
  }
  function positionTip(x, y) {
    var w = tipEl.offsetWidth, h = tipEl.offsetHeight, tx = x + 16, ty = y + 20;
    if (tx + w > vw - 10) tx = x - w - 14;
    if (ty + h > vh - 10) ty = y - h - 16;
    tipEl.style.left = Math.max(8, tx) + "px"; tipEl.style.top = Math.max(8, ty) + "px";
  }
  function hideTip() { tipEl.hidden = true; }
  function readingIn(sheetEl) { return state.focus && sheetEl.dataset.key === state.focus.key && !UI.mobile ? $("#reading") : null; }
  function setReading(el, info) {
    if (!el) return;
    el.classList.toggle("is-reading", !!info);
    el.innerHTML = info ? '<span class="mono">' + esc(info.name) + ".</span> " + esc(info.text) : '<span class="mono">On the drawing.</span> <span class="rt">' + esc(el.dataset.default || "") + "</span>";
  }
  function partIn(part, x, y) {
    if (pan.active) return;
    var sheetEl = part.closest(".sheet"), plotEl = part.closest(".plot");
    if (cam.z < 0.42 && !(state.focus && sheetEl.dataset.key === state.focus.key)) return;
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
      var o = inst[t.dataset.key];
      if (o) flyTo(o.cx, o.cy, Math.max(tgt.z, 0.45));
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
    if (state.noClick) return;
    var t = e.target;
    var rp = t.closest("[data-act=replot]");
    if (rp) { replot(rp.closest(".sheet")); return; }
    if (t.closest("a")) return;
    var part = t.closest(".part.is-live"), sh = t.closest(".sheet");
    if (sh) {
      if (state.focus && state.focus.key === sh.dataset.key) {
        if (part) { // a tap on a part pins its reading (touch has no hover)
          if (activePart === part && pinned) { partOut(part); return; }
          var r = part.getBoundingClientRect();
          pinned = false; partIn(part, r.left + r.width / 2, r.top + r.height / 2); pinned = true;
        } else if (activePart) { pinned = false; partOut(activePart); }
      } else openSheet(sh.dataset.id, sh.dataset.key);
      return;
    }
    if (state.focus) closeSheet();
  });
  world.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("sheet")) { e.preventDefault(); openSheet(e.target.dataset.id, e.target.dataset.key); }
  });

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
      if (s.match) { matches.push(s); n++; }
    });
    Object.keys(inst).forEach(function (k) { inst[k].el.classList.toggle("dim", !inst[k].s.match); });
    var filtering = state.filter !== "all" || tk.length;
    statusEl.textContent = !filtering ? "" : (n ? n + " of " + sheets.length : "No match");
    $$("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-filter") === state.filter ? "true" : "false"); });
    $$("li", dList).forEach(function (li, i) { li.classList.toggle("dim", !sheets[i].match); });
    var ranked = matches.slice().sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    if (tk.length && ranked.length && !UI.mobile) {
      hitsEl.hidden = false;
      hitsEl.innerHTML = ranked.slice(0, 6).map(function (s) {
        return '<li><button type="button" data-goto="' + s.id + '"><span class="mono n">' + esc(s.short) + '</span><span class="t">' + esc(s.title) + '</span><span class="mono g">' + esc(s.group) + "</span></button></li>";
      }).join("");
    } else { hitsEl.hidden = true; hitsEl.innerHTML = ""; }
    state.best = tk.length ? ranked[0] || null : null;
  }
  var qTimer = 0;
  function setQuery(v, from) {
    if (from !== qInput) qInput.value = v;
    if (from !== qMobile) qMobile.value = v;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { state.query = v; applyFilters(); if (matches.length && v) Harp.pluck(9, 0.3); }, 130);
  }
  [qInput, qMobile].forEach(function (inp) {
    inp.addEventListener("input", function () { setQuery(inp.value, inp); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Escape") { setQuery("", null); state.query = ""; applyFilters(); inp.blur(); e.stopPropagation(); } });
  });
  function submitFind(e) {
    e.preventDefault();
    clearTimeout(qTimer); state.query = qInput.value || qMobile.value; applyFilters();
    if (state.best) { openSheet(state.best.id); document.activeElement && document.activeElement.blur(); hitsEl.hidden = true; }
  }
  $("#find").addEventListener("submit", submitFind);
  $("#find-m").addEventListener("submit", submitFind);
  qInput.addEventListener("focus", function () { if (state.query && hitsEl.innerHTML) hitsEl.hidden = false; });
  doc.addEventListener("pointerdown", function (e) { if (!e.target.closest("#find")) hitsEl.hidden = true; });

  function setFilter(f) { state.filter = f; applyFilters(); Harp.pluck(5 + ["all", "plate", "essay", "credential", "study", "note"].indexOf(f), 0.4); }

  /* ------------------------------------------------------------------ index drawer */
  function buildDrawer() {
    dList.innerHTML = sheets.map(function (s) {
      return '<li><button type="button" data-goto="' + s.id + '"><span class="mono n">' + esc(s.short) + '</span><span class="t">' + esc(s.title) + '</span><span class="mono g">' + esc(s.group) + "</span></button></li>";
    }).join("");
    $("#d-count").textContent = "· " + sheets.length + " sheets";
    var show = $(".show").cloneNode(true);
    show.className = "d-show"; $(".lab", show).remove();
    drawer.insertBefore(show, dList);
  }
  function openDrawer() {
    if (!drawer.hidden && drawer.classList.contains("open")) return;
    drawer.hidden = false; void drawer.offsetWidth; drawer.classList.add("open");
    $('[data-act="index"]').setAttribute("aria-expanded", "true");
    if (!UI.mobile) setTimeout(function () { var b = $("button", dList); if (b) b.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("open");
    $('[data-act="index"]').setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!drawer.classList.contains("open")) drawer.hidden = true; }, 340);
  }

  /* ------------------------------------------------------------------ tools */
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("kt-theme", t); } catch (e) {}
    $$("[data-theme-tx]").forEach(function (el) { el.textContent = t === "dark" ? "Day" : "Night"; });
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute("content", t === "dark" ? "#131210" : "#f2eee5");
  }
  function toggleSound() {
    var on = Harp.toggle();
    $$("[data-sound-tx]").forEach(function (el) { el.textContent = on === null ? "n/a" : on ? "on" : "off"; });
    $$('[data-act="sound"]').forEach(function (b) { b.setAttribute("aria-pressed", on ? "true" : "false"); });
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
      case "sound": toggleSound(); break;
      case "theme": setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); break;
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
      else if (state.query || state.filter !== "all") { setQuery("", null); state.query = ""; state.filter = "all"; applyFilters(); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    var stepPx = Math.max(180, view.h * 0.34) / cam.z * (e.shiftKey ? 2.4 : 1), handled = true;
    switch (e.key) {
      case "ArrowLeft": tgt.x -= stepPx; break;
      case "ArrowRight": tgt.x += stepPx; break;
      case "ArrowUp": tgt.y -= stepPx; break;
      case "ArrowDown": tgt.y += stepPx; break;
      case "+": case "=": zoomAbout(1.3, view.cx, view.cy, false); break;
      case "-": case "_": zoomAbout(1 / 1.3, view.cx, view.cy, false); break;
      case "0": flyTo(tgt.x, tgt.y, homeView().z); break;
      case "1": if (state.focus) closeSheet(); state.saved = null; goHome(); break;
      case "/": qInput.focus(); break;
      case "[": case ",": step(-1); break;
      case "]": case ".": step(1); break;
      case "m": case "M": toggleSound(); break;
      case "d": case "D": setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); break;
      case "i": case "I": drawer.classList.contains("open") ? closeDrawer() : openDrawer(); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); goneHint(); state.flyUntil = 0; }
  });

  /* ------------------------------------------------------------------ the loop */
  var last = performance.now(), travel = 0, lastPluck = 0, noteWalk = 6, cssK = -1, cssSK = -1, dragS = 0, lastDragS = 0;

  function drawBackdrop() {
    var s = 100 * cam.z; while (s < 28) s *= 2;
    var ox = view.cx - cam.x * cam.z, oy = view.cy - cam.y * cam.z;
    stage.style.backgroundSize = s.toFixed(2) + "px " + s.toFixed(2) + "px";
    stage.style.backgroundPosition = (ox - s / 2).toFixed(2) + "px " + (oy - s / 2).toFixed(2) + "px";
  }

  function frame(now) { tick(now); requestAnimationFrame(frame); }

  function tick(now) {
    var dt = clamp(now - last, 1, 48); last = now;
    if (!ready) return;

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

    // inertia
    if (!pan.active && !pinch.active && (vel.x || vel.y)) {
      tgt.x += vel.x * dt; tgt.y += vel.y * dt;
      var dk = Math.exp(-dt * 0.0048); vel.x *= dk; vel.y *= dk;
      if (Math.abs(vel.x * cam.z) < 0.008) vel.x = 0;
      if (Math.abs(vel.y * cam.z) < 0.008) vel.y = 0;
    }

    // ease the camera toward its target
    var rate = reduce ? 200 : pan.active ? 34 : now < state.flyUntil ? 5 : 13;
    var k = 1 - Math.exp(-dt * rate * 0.001);
    var nz = Math.exp(Math.log(cam.z) + (Math.log(tgt.z) - Math.log(cam.z)) * k);
    var nx = cam.x + (tgt.x - cam.x) * k, ny = cam.y + (tgt.y - cam.y) * k;
    if (Math.abs(tgt.x - nx) * nz < 0.02 && Math.abs(tgt.y - ny) * nz < 0.02) { nx = tgt.x; ny = tgt.y; }
    if (Math.abs(Math.log(tgt.z / nz)) < 0.0004) nz = tgt.z;
    var moved = Math.hypot(nx - cam.x, ny - cam.y) * nz, zoomed = Math.abs(nz - cam.z) > 1e-5;
    if (moved > 0 || zoomed) state.dirty = true;
    if (zoomed) { lastZoomAt = now; rerasterDue = true; }
    dragS += ((reduce ? 0 : Math.min(1, (moved / dt) / 2.6)) - dragS) * (1 - Math.exp(-dt * 0.006));
    if (Math.abs(dragS - lastDragS) > 0.002) { state.dirty = true; lastDragS = dragS; }
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
      var zz = cam.z * (1 - 0.045 * dragS); // pulled back a touch while it moves fast
      world.style.transform = "translate(" + (view.cx - cam.x * zz).toFixed(2) + "px," + (view.cy - cam.y * zz).toFixed(2) + "px) scale(" + zz.toFixed(5) + ")";
      var kk = Math.round(clamp(0.55 / cam.z, 1, 1.6) * 20) / 20, sk = Math.round(clamp(1 / (cam.z * 1.15), 1, 3.2) * 10) / 10;
      if (kk !== cssK) { cssK = kk; world.style.setProperty("--k", kk); }
      if (sk !== cssSK) { cssSK = sk; world.style.setProperty("--sk", sk); }
      world.classList.toggle("far", cam.z < 0.42);
      drawBackdrop();
      if (state.cull || !lastCull || Math.abs(cam.x - lastCull.x) > 140 || Math.abs(cam.y - lastCull.y) > 140 || Math.abs(Math.log(cam.z / lastCull.z)) > 0.04) updateInstances();
      checkSeen();
    }

    // once zooming stops, ask the browser to re-draw the world sharply at the new scale
    if (rerasterDue && now - lastZoomAt > 180) {
      rerasterDue = false;
      world.style.willChange = "auto";
      requestAnimationFrame(function () { world.style.willChange = "transform"; });
    }
  }

  /* ------------------------------------------------------------------ go */
  buildDrawer();
  setTheme(root.getAttribute("data-theme") || "dark");
  world.style.willChange = "transform";
  applyFilters();
  resize();
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(function () { if (stage.clientWidth !== vw || stage.clientHeight !== vh) resize(); }).observe(stage);
  requestAnimationFrame(function () { last = performance.now(); requestAnimationFrame(frame); });
  window.addEventListener("hashchange", function () { var h = location.hash.slice(1); if (ready && h && byId[h] && focusId() !== h) openSheet(h); });

  // A small API for embedding and tests. step(ms) advances the camera by ms without waiting for a frame.
  window.table = {
    open: function (id) { openSheet(id); }, close: closeSheet, home: goHome, sheets: sheets,
    camera: function () { return { x: cam.x, y: cam.y, z: cam.z, target: { x: tgt.x, y: tgt.y, z: tgt.z }, view: { w: view.w, h: view.h }, copies: Object.keys(inst).length }; },
    step: function (ms) { for (var t = 0; t < ms; t += 16) tick(last + 16); }
  };
})();
