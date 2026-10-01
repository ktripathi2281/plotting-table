// Generated drawings. Each one encodes how a project works, is seeded so it draws the same every
// time, and "plots" itself like a pen plotter the first time it comes into view.
// The five plates and the seal are ported from the portfolio's React components (src/art/*).
window.Plates = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------ seeded randomness */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function noise1(r, size) {
    size = size || 512;
    var v = [];
    for (var i = 0; i < size; i++) v.push(r() * 2 - 1);
    return function (x) {
      var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      var a = v[((i % size) + size) % size], b = v[(((i + 1) % size) + size) % size];
      return a + (b - a) * u;
    };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function line(pts) {
    var s = "";
    for (var i = 0; i < pts.length; i++) s += (i ? "L" : "M") + f1(pts[i][0]) + " " + f1(pts[i][1]);
    return s;
  }
  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }
  function dir(a, r) { r = r == null ? 1 : r; return [Math.cos(a) * r, Math.sin(a) * r]; }
  function add(p, q) { return [p[0] + q[0], p[1] + q[1]]; }
  function P(p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ------------------------------------------------------------ markup helpers */
  // Timing: d = delay, dur = duration (seconds), w = stroke width in drawing units.
  function sty(d, dur, w) {
    var s = "";
    if (d != null) s += "--d:" + d + "s;";
    if (dur != null) s += "--t:" + dur + "s;";
    if (w != null) s += "--w:" + w + ";";
    return s ? ' style="' + s + '"' : "";
  }
  function pth(d, cls, w, dl, dur, x) { return '<path d="' + d + '" class="p ' + cls + '" pathLength="1"' + sty(dl, dur, w) + (x || "") + "/>"; }
  function cir(cx, cy, r, cls, w, dl, dur, x) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="p ' + cls + '" pathLength="1"' + sty(dl, dur, w) + (x || "") + "/>"; }
  function rct(x, y, w, h, cls, sw, dl, dur) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" class="p ' + cls + '" pathLength="1"' + sty(dl, dur, sw) + "/>"; }
  function dot(cx, cy, r, fill, dl) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="fade fill-' + fill + '"' + sty(dl) + "/>"; }
  function lbl(x, y, txt, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || "start") + '" class="lbl fade' + (o.red ? " lbl-red" : "") + '"' + sty(o.d || 0) + ">" + txt + "</text>";
  }
  function hitL(d, w) { return '<path d="' + d + '" class="hit-stroke" stroke-width="' + (w || 12) + '"/>'; }
  function hitD(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r || 9) + '" class="hit-area"/>'; }

  // A readable piece of a drawing. Parts with the same id light together;
  // `lit` lists other ids that should also light this part. focus:false on repeats.
  function mkPart(parts) {
    return function (id, inner, o) {
      o = o || {};
      if (!(id && parts[id])) return '<g class="part">' + inner + "</g>";
      var a = ' data-part="' + id + '"' + (o.lit && o.lit.length ? ' data-lit="' + o.lit.join(" ") + '"' : "");
      if (o.focus !== false) a += ' role="button" tabindex="-1" aria-label="' + esc(parts[id].name + ". " + parts[id].text) + '"';
      return '<g class="part is-live"' + a + ">" + inner + "</g>";
    };
  }

  /* ============================================================ Plate 0 · Model, contained */
  function model() {
    var cx = 240, cy = 250, R = 150;
    var r = rng(7), n1 = noise1(r), n2 = noise1(r);
    var x = cx, y = cy, a = r() * TAU, pts = [[x, y]];
    for (var i = 0; i < 4000; i++) {
      a += n1(i * 0.007) * 0.075 + n2(i * 0.045) * 0.06;
      var dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy), edge = R * 0.86;
      if (dist > edge) {
        var k = Math.min(1, (dist - edge) / (R - edge));
        a += angleDiff(Math.atan2(-dy, -dx), a) * 0.09 * k;
      }
      x += Math.cos(a) * 2;
      y += Math.sin(a) * 2;
      var d2 = Math.hypot(x - cx, y - cy);
      if (d2 > R) { x = cx + ((x - cx) / d2) * R; y = cy + ((y - cy) / d2) * R; }
      pts.push([x, y]);
    }
    var ticks = "", n = 96;
    for (var j = 0; j < n; j++) {
      var ang = -Math.PI / 2 + (j / n) * TAU, long = j % 12 === 0;
      var p1 = add([cx, cy], dir(ang, R + 16)), p2 = add([cx, cy], dir(ang, R + (long ? 28 : 21)));
      ticks += "M" + P(p1) + "L" + P(p2);
    }
    var parts = {
      model: { name: "The model", text: "4,000 random steps. Capable, but never fully predictable." },
      boundary: { name: "The boundary", text: "Schemas, validation and guardrails. Fixed, measured and deterministic." },
      output: { name: "The output", text: "The only thing allowed out, and only through the gate." }
    };
    var part = mkPart(parts), gateY = cy + R + 8, start = cy + R * 0.55;
    var inner =
      '<g class="bg">' + rct(18, 18, 444, 524, "ink-faint", 1, 0, 2.2) + lbl(30, 36, "pl. 0", { d: 0.4 }) + "</g>" +
      part("model", '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" class="hit-area"/>' + pth(line(pts), "ink", 0.45, 0.2, 6.5)) +
      part("boundary",
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 18) + '" class="hit-stroke" stroke-width="26"/>' +
        cir(cx, cy, R + 8, "ink", 0.9, 0.6, 2.4, ' transform="rotate(90 ' + cx + " " + cy + ')"') +
        pth(ticks, "ink-soft", 0.7, 1.2, 3)) +
      part("output",
        hitL("M" + cx + " " + start + "L" + cx + " 500", 16) +
        dot(cx, start, 3.2, "red", 5.6) +
        pth("M" + cx + " " + (start + 3.2) + "L" + cx + " 500", "red", 1.1, 5.8, 1.6) +
        pth("M" + (cx - 9) + " " + gateY + "L" + (cx + 9) + " " + gateY, "red", 1.1, 6.2, 0.4) +
        dot(cx, 500, 2.6, "red", 7.2) +
        lbl(cx + 10, 503, "output", { red: true, d: 7.3 }));
    return {
      viewBox: "0 0 480 560", parts: parts, inner: inner,
      label: "Generated drawing: a single tangled line held inside a precise circular boundary, with one red line leaving through a gate at the bottom."
    };
  }

  /* ============================================================ Plate I · Kavach */
  function kavach() {
    var ROUTES = [
      ["triage", "Reads the complaint and sorts it into the right track. GPT-5."],
      ["extract", "Pulls out transaction IDs, phone numbers and UPI IDs: regex first, then GPT-5."],
      ["draft", "Drafts the complaint and the letters to police and bank. GPT-5."],
      ["translate", "Carries the case across all 22 scheduled Indian languages. GPT-5."],
      ["transcribe", "Turns a spoken account into text. GPT-4o-transcribe."],
      ["ask", "Answers questions grounded in the citizen's own case. GPT-5-mini."]
    ];
    var parts = {
      casefile: { name: "Case file", text: "Every route feeds one file of ten ordered steps, each with its deadline tracked." },
      rules: { name: "Rules engine", text: "The deterministic fallback beside every route. The app still works with no API key." },
      languages: { name: "22 hairlines", text: "One for each scheduled Indian language the app can speak." }
    };
    ROUTES.forEach(function (r) { parts[r[0]] = { name: "Route · " + r[0], text: r[1] }; });
    var part = mkPart(parts);
    var join = [330, 190], ys = ROUTES.map(function (_, i) { return 62 + i * 52; });
    var hair = [];
    for (var i = 0; i < 22; i++) hair.push(26 + (i * 348) / 21);
    var ticks = "";
    for (var k = 0; k < 10; k++) { var tx = 352 + k * 20; ticks += "M" + tx + " 190L" + tx + " " + (190 - (k % 2 ? 7 : 12)); }
    function routeD(y) { return "M104 " + y + "C214 " + y + " 236 " + join[1] + " " + join[0] + " " + join[1]; }
    var rulesD = "M104 356C224 356 244 202 330 202L552 202";

    var inner = part("languages", hair.map(function (y, i) {
      return hitL("M26 " + y + "L574 " + y, 5) + pth("M26 " + y + "L574 " + y, "ink-faint", 0.45, i * 0.03, 1.1);
    }).join(""));
    ROUTES.forEach(function (r, i) {
      var y = ys[i];
      inner += part(r[0],
        hitL(routeD(y), 11) +
        '<rect x="30" y="' + (y - 9) + '" width="80" height="18" class="hit-area"/>' +
        dot(104, y, 2.6, "ink", 0.5 + i * 0.1) +
        lbl(94, y + 3, r[0], { anchor: "end", d: 0.5 + i * 0.1 }) +
        pth(routeD(y), "ink", 0.9, 0.7 + i * 0.12, 1.6));
    });
    inner += part("casefile",
      hitL("M330 186L566 186", 14) +
      pth("M330 190L552 190", "ink", 1.2, 2.2, 1.3) +
      pth(ticks, "ink", 0.9, 2.5, 1.1) +
      rct(552, 183, 14, 14, "ink", 1, 3.3, 0.6) +
      lbl(559, 170, "case file", { anchor: "middle", d: 3.5 }),
      { lit: ROUTES.map(function (r) { return r[0]; }) });
    inner += part("rules",
      hitL(rulesD, 10) +
      '<rect x="40" y="347" width="70" height="18" class="hit-area"/>' +
      dot(104, 356, 2.6, "red", 3.4) +
      lbl(94, 359, "rules", { anchor: "end", red: true, d: 3.4 }) +
      pth(rulesD, "red", 1.1, 3.6, 2.2));
    return {
      viewBox: "0 0 600 400", parts: parts, inner: inner,
      label: "Six lines, one per model route, converge into a single line with ten tick marks ending at a case file. A red line runs parallel to it the whole way."
    };
  }

  /* ============================================================ Plate II · LeetCode Agent Tracker */
  function agent() {
    var TOOLS = ["problems", "topics", "readiness", "history"];
    var VISITS = [0, 2, 1, 2, 3, 0, 1, 2];
    var parts = {};
    TOOLS.forEach(function (name, i) {
      var n = VISITS.filter(function (v) { return v === i; }).length;
      parts["tool-" + i] = { name: "Tool · " + name, text: "One of four database tools the planner may call. Visited " + (n === 1 ? "once" : n + " times") + " in this run." };
    });
    VISITS.forEach(function (n, k) {
      parts["loop-" + k] = { name: "Iteration " + (k + 1), text: "The planner calls " + TOOLS[n] + ", reads the result, and decides what to do next." };
    });
    parts.plan = { name: "The plan", text: "Returned after eight iterations, with the reasoning behind every choice." };
    parts.log = { name: "Audit log", text: "Each iteration is recorded with its tool call, reasoning trace and latency." };
    var part = mkPart(parts);

    var c = [300, 178], R = 122, angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    var nodes = angles.map(function (a) { return add(c, dir(a, R)); });
    var seen = [0, 0, 0, 0];
    var petals = VISITS.map(function (n, k) {
      var th = angles[n], v = seen[n]++, w = 0.22 + 0.2 * v;
      // Lean each loop to one side so repeated visits swirl rather than stack.
      var lean = (k % 2 ? 1 : -1) * (0.35 + 0.25 * v), wl = w * (1 + lean), wr = w * (1 - lean);
      var a1 = add(c, dir(th - wl, R * (0.58 + 0.06 * v))), a2 = add(c, dir(th - wl * 0.5, R * 1.08));
      var b2 = add(c, dir(th + wr * 0.5, R * 1.08)), b1 = add(c, dir(th + wr, R * (0.58 + 0.06 * v)));
      return "M" + P(c) + "C" + P(a1) + " " + P(a2) + " " + P(nodes[n]) + "C" + P(b2) + " " + P(b1) + " " + P(c);
    });
    var labelPos = [
      [nodes[0][0], nodes[0][1] - 13, "middle"],
      [nodes[1][0] + 13, nodes[1][1] + 3, "start"],
      [nodes[2][0], nodes[2][1] + 20, "middle"],
      [nodes[3][0] - 13, nodes[3][1] + 3, "end"]
    ];
    function loopsVisiting(i) { var o = []; VISITS.forEach(function (n, k) { if (n === i) o.push("loop-" + k); }); return o; }

    var inner = "";
    petals.forEach(function (d, k) {
      inner += part("loop-" + k, hitL(d, 8) + pth(d, "ink", 0.85, 0.6 + k * 0.42, 1.2));
    });
    nodes.forEach(function (p, i) {
      inner += part("tool-" + i,
        hitD(p[0], p[1], 12) +
        cir(p[0], p[1], 5.5, "ink", 0.9, 0.1 + i * 0.1, 0.6) +
        lbl(labelPos[i][0], labelPos[i][1], TOOLS[i], { anchor: labelPos[i][2], d: 0.3 + i * 0.1 }),
        { lit: loopsVisiting(i) });
    });
    inner += part("plan",
      hitD(c[0], c[1], 9) + dot(c[0], c[1], 3.4, "ink", 4.3) + lbl(c[0] + 14, c[1] + 20, "plan", { d: 4.4 }),
      { lit: ["log"] });
    inner += part("log",
      hitL("M84 361L480 361", 12) +
      lbl(112, 364, "log", { anchor: "end", red: true, d: 0.5 }) +
      pth("M120 361L480 361", "red", 1, 0.5, 3.8));
    VISITS.forEach(function (_, k) {
      var x = 120 + (k + 0.5) * 45;
      inner += part("loop-" + k,
        '<rect x="' + (x - 12) + '" y="350" width="24" height="40" class="hit-area"/>' +
        pth("M" + x + " 355L" + x + " 367", "red", 1, 1.6 + k * 0.42, 0.3) +
        lbl(x, 384, k + 1, { anchor: "middle", red: true, d: 1.7 + k * 0.42 }),
        { lit: ["log"], focus: false });
    });
    return {
      viewBox: "0 0 600 400", parts: parts, inner: inner,
      label: "Eight looping paths leave a centre point and return, each passing through one of four tool nodes. Below, a red line records eight ticks, one per iteration."
    };
  }

  /* ============================================================ Plate III · Skill Barter */
  function barter() {
    var r = rng(21), pts = [], guard = 0;
    while (pts.length < 40 && guard++ < 8000) {
      var p = [46 + r() * 508, 40 + r() * 320];
      if (pts.every(function (q) { return Math.hypot(p[0] - q[0], p[1] - q[1]) > 44; })) pts.push(p);
    }
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    var you = 0;
    pts.forEach(function (p, i) { if (dist(p, [300, 200]) < dist(pts[you], [300, 200])) you = i; });
    var byDist = pts.map(function (_, i) { return i; }).filter(function (i) { return i !== you; })
      .sort(function (a, b) { return dist(pts[a], pts[you]) - dist(pts[b], pts[you]); });
    var edges = [], used = {};
    function key(a, b) { return a < b ? a + "-" + b : b + "-" + a; }
    function addEdge(a, b, kind) { if (used[key(a, b)]) return; used[key(a, b)] = true; edges.push({ a: a, b: b, kind: kind }); }
    addEdge(byDist[1], you, "one");
    addEdge(byDist[3], you, "one");
    pts.forEach(function (p, i) {
      if (i === you || edges.length > 30) return;
      var near = pts.map(function (q, j) { return [j, dist(p, q)]; })
        .filter(function (jd) { return jd[0] !== i && jd[0] !== you && jd[1] < 120; })
        .sort(function (a, b) { return a[1] - b[1]; });
      if (!near.length || r() < 0.2) return;
      addEdge(i, near[0][0], r() < 0.4 ? "mutual" : "one");
      if (near[1] && r() < 0.3) addEdge(i, near[1][0], "one");
    });
    var match = byDist[0];

    function arc(A, B, bulge) {
      var dx = B[0] - A[0], dy = B[1] - A[1];
      var m = [(A[0] + B[0]) / 2 - dy * bulge, (A[1] + B[1]) / 2 + dx * bulge];
      return "M" + P(A) + "Q" + P(m) + " " + P(B);
    }
    var parts = {
      you: { name: "You", text: "The rings measure distance. Closer matches rank higher." },
      people: { name: "People", text: "Each point is someone offering one skill and looking for another." },
      mutual: { name: "Mutual match", text: "Each person can teach what the other wants to learn." },
      oneway: { name: "One-way interest", text: "One wants what the other teaches, but not the reverse." },
      best: { name: "Your best match", text: "Mutual, and the nearest to you. A trade still needs both of you to agree." }
    };
    var part = mkPart(parts), Y = pts[you], M = pts[match];
    function firstOf(kind) { for (var i = 0; i < edges.length; i++) if (edges[i].kind === kind) return i; return -1; }

    var inner = part("you", [46, 92, 138].map(function (rad, i) {
      return '<circle cx="' + Y[0] + '" cy="' + Y[1] + '" r="' + rad + '" class="hit-stroke" stroke-width="7"/>' +
        cir(Y[0], Y[1], rad, "ink-faint", 0.6, 0.3 + i * 0.25, 1.4);
    }).join(""));
    inner += part("people", pts.map(function (p, i) {
      if (i === you || i === match) return "";
      return hitD(p[0], p[1], 7) + dot(p[0], p[1], 2.4, "soft", 0.1 + (i % 10) * 0.06);
    }).join(""));
    edges.forEach(function (e, i) {
      var A = pts[e.a], B = pts[e.b], d = 1.2 + i * 0.14;
      if (e.kind === "mutual") {
        inner += part("mutual",
          hitL(arc(A, B, 0.2), 8) + hitL(arc(B, A, 0.2), 8) +
          pth(arc(A, B, 0.2), "ink", 0.8, d, 1) + pth(arc(B, A, 0.2), "ink", 0.8, d + 0.1, 1),
          { focus: i === firstOf("mutual") });
      } else {
        inner += part("oneway",
          hitL(arc(A, B, 0.16), 8) + pth(arc(A, B, 0.16), "ink-soft", 0.6, d, 1) +
          cir(B[0], B[1], 4.2, "ink-soft", 0.6, d + 0.8, 0.4),
          { focus: i === firstOf("one") });
      }
    });
    inner += part("best",
      hitL(arc(Y, M, 0.22), 10) + hitL(arc(M, Y, 0.22), 10) + hitD(M[0], M[1], 8) +
      pth(arc(Y, M, 0.22), "red", 1.1, 4, 1.2) + pth(arc(M, Y, 0.22), "red", 1.1, 4.2, 1.2) +
      dot(M[0], M[1], 3, "red", 4.8));
    inner += part("you",
      hitD(Y[0], Y[1], 9) + dot(Y[0], Y[1], 4, "ink", 0.2) + lbl(Y[0] + 9, Y[1] - 9, "you", { d: 0.4 }),
      { lit: ["best"], focus: false });
    return {
      viewBox: "0 0 600 400", parts: parts, inner: inner,
      label: "Scattered points joined by curves: lens shapes for mutual matches, single arcs for one-way interest. Concentric rings surround one point, and its nearest mutual match is drawn in red."
    };
  }

  /* ============================================================ Plate IV · Ride Radar */
  function radar() {
    var r = rng(44), dest = [522, 196], starts = [70, 132, 198, 266, 332], SOS = 3;
    var trails = starts.map(function (sy, k) {
      var n = noise1(r), p = [64 + r() * 18, sy], pts = [p];
      for (var i = 0; i < 600; i++) {
        var head = Math.atan2(dest[1] - p[1], dest[0] - p[0]) + n(i * 0.045) * 1.05;
        p = add(p, dir(head, 3));
        pts.push(p);
        if (Math.hypot(dest[0] - p[0], dest[1] - p[1]) < 16) break;
      }
      if (k === SOS) pts = pts.slice(0, Math.floor(pts.length * 0.56));
      return { d: line(pts), start: pts[0], end: pts[pts.length - 1] };
    });
    var parts = {
      sos: { name: "Rider " + (SOS + 1) + " · SOS", text: "One tap sends the alert and a pinned location to everyone in the trip room at once." },
      checkpoint: { name: "Checkpoint", text: "A typed waypoint on the trip, like fuel, rest or a regroup." }
    };
    [0, 1, 2, 4].forEach(function (k) {
      parts["rider-" + k] = { name: "Rider " + (k + 1), text: "Position, speed and battery shared with the group live, with a trail of up to 1,000 points." };
    });
    var part = mkPart(parts);
    var grid = [];
    for (var x = 40; x <= 560; x += 40) grid.push("M" + x + " 24L" + x + " 376");
    for (var y = 40; y <= 360; y += 40) grid.push("M24 " + y + "L576 " + y);
    var sos = trails[SOS].end;

    var inner = '<g class="bg">' + grid.map(function (d, i) { return pth(d, "ink-faint", 0.45, i * 0.025, 1); }).join("") + "</g>";
    trails.forEach(function (tr, k) {
      var s = k === SOS;
      inner += part(s ? "sos" : "rider-" + k,
        hitL(tr.d, 10) +
        cir(tr.start[0], tr.start[1], 3, "ink-soft", 0.8, 0.5 + k * 0.2, 0.4) +
        pth(tr.d, s ? "ink-soft" : "ink", 0.9, 0.8 + k * 0.22, 2.6) +
        (s ? "" : dot(tr.end[0], tr.end[1], 2.6, "ink", 3.4 + k * 0.22)),
        { focus: !s });
    });
    inner += part("checkpoint",
      hitD(dest[0], dest[1], 14) + rct(dest[0] - 7, dest[1] - 7, 14, 14, "ink", 1, 0.4, 0.8) +
      lbl(dest[0], dest[1] - 16, "checkpoint", { anchor: "middle", d: 0.6 }));
    inner += part("sos",
      hitD(sos[0], sos[1], 32) + dot(sos[0], sos[1], 3.2, "red", 3.2) +
      [11, 20, 31].map(function (rad, i) {
        return cir(sos[0], sos[1], rad, "red", 0.9, 3.4 + i * 0.25, 0.9, ' stroke-opacity="' + (1 - i * 0.28) + '"');
      }).join("") +
      lbl(sos[0] + 36, sos[1] + 3, "SOS", { red: true, d: 4.2 }));
    return {
      viewBox: "0 0 600 400", parts: parts, inner: inner,
      label: "Five wandering trails cross a faint map grid toward a shared checkpoint. One trail stops early, marked by red concentric rings."
    };
  }

  /* ============================================================ § 4 · Chronology (new for the table) */
  // A timeline in the same language: a baseline, a tick a month, one red bar for the present.
  function chronology() {
    var X0 = 40, SPAN = 520, Y0 = 2020, YEARS = 7, BASE = 150;
    function x(t) { return f1(X0 + ((t - Y0) / YEARS) * SPAN); }
    var parts = {
      years: { name: "Seven years", text: "One tick for every month, 2020 to 2026, drawn to scale." },
      study: { name: "B.Tech", text: "Computer Science & Engineering at MMMUT, Gorakhpur, 2020 to 2024. CGPA 7.9." },
      work: { name: "Tata Consultancy Services", text: "Product Engineer in Bangalore since 2025: Java and Spring Boot for a banking product." },
      certs: { name: "September 2026", text: "Claude Certified Developer on the 12th, Claude Certified Architect on the 19th. Both proctored." }
    };
    var part = mkPart(parts);
    var months = "", yearTicks = "";
    for (var m = 0; m <= YEARS * 12; m++) {
      var xx = x(Y0 + m / 12);
      if (m % 12 === 0) yearTicks += "M" + xx + " " + (BASE - 11) + "L" + xx + " " + (BASE + 11);
      else months += "M" + xx + " " + (BASE - 4) + "L" + xx + " " + (BASE + 4);
    }
    var base = "M" + X0 + " " + BASE + "L" + (X0 + SPAN) + " " + BASE;
    var s0 = x(2020.62), s1 = x(2024.4), w0 = x(2025.45), w1 = x(2026.92), c0 = x(2026.7), c1 = x(2026.72);
    var inner = part("years",
      hitL(base, 16) + pth(base, "ink", 1, 0, 2.4) + pth(months, "ink-faint", 0.45, 0.4, 2.2) + pth(yearTicks, "ink", 0.8, 0.6, 2) +
      [0, 1, 2, 3, 4, 5, 6].map(function (i) { return lbl(x(Y0 + i), BASE + 26, Y0 + i, { anchor: "middle", d: 1 + i * 0.12 }); }).join(""));
    inner += part("study",
      hitL("M" + s0 + " 106L" + s1 + " 106", 14) +
      pth("M" + s0 + " 116L" + s0 + " 106L" + s1 + " 106L" + s1 + " 116", "ink-soft", 0.8, 1.4, 2) +
      lbl(f1((s0 + s1) / 2), 94, "B.Tech · Computer Science &amp; Engineering", { anchor: "middle", d: 3 }));
    inner += part("work",
      hitL("M" + w0 + " 196L" + w1 + " 196", 14) +
      pth("M" + w0 + " 186L" + w0 + " 196L" + w1 + " 196L" + w1 + " 186", "red", 1, 2.4, 2.2) +
      lbl(f1((w0 + w1) / 2), 216, "Product Engineer · TCS", { anchor: "middle", red: true, d: 4 }));
    inner += part("certs",
      hitD(c0, 80, 20) + hitL("M" + c0 + " " + (BASE - 10) + "L" + c0 + " 76", 10) +
      pth("M" + c0 + " " + (BASE - 10) + "L" + c0 + " 76", "red", 0.8, 3.4, 0.9) +
      pth("M" + c1 + " " + (BASE - 10) + "L" + c1 + " 90", "red", 0.8, 3.6, 0.7) +
      dot(c0, 76, 2.4, "red", 4.2) + dot(c1, 90, 2.4, "red", 4.4) +
      lbl(c0 - 9, 73, "Claude certified × 2", { anchor: "end", red: true, d: 4.6 }));
    return {
      viewBox: "0 0 600 250", parts: parts, inner: inner,
      label: "A timeline from 2020 to 2026 with a tick for every month. A bracket marks four years of study, and a red bar marks the current role. Two red marks sit at September 2026."
    };
  }

  /* ============================================================ Certificate seal (guilloché) */
  // Interlaced sine rings, the security pattern of banknotes and diplomas.
  function seal(id, inscription, badge, pattern) {
    var C = 120, RIM = 101;
    function ring(r) { return "M" + C + " " + (C - r) + "A" + r + " " + r + " 0 1 1 " + C + " " + (C + r) + "A" + r + " " + r + " 0 1 1 " + C + " " + (C - r); }
    var strands = [];
    for (var k = 0; k < pattern.copies; k++) {
      var phase = (TAU * k) / pattern.copies, pts = [];
      for (var i = 0; i <= 720; i++) {
        var a = (i / 720) * TAU;
        var r = pattern.r0 + pattern.amp * Math.sin(pattern.waves * a + phase) + (pattern.amp2 || 0) * Math.sin((pattern.waves2 || 0) * a);
        pts.push([C + Math.cos(a) * r, C + Math.sin(a) * r]);
      }
      strands.push(line(pts));
    }
    var inner = '<defs><path id="rim-' + id + '" d="' + ring(RIM) + '"/></defs>';
    [116, 111, 95, 59].forEach(function (r, i) {
      inner += cir(C, C, r, "ink-soft", i === 0 ? 0.8 : 0.45, i * 0.15, 1.4, ' transform="rotate(-90 ' + C + " " + C + ')"');
    });
    strands.forEach(function (d, k2) { inner += pth(d, "ink-soft", 0.4, 0.5 + k2 * 0.12, 2.2); });
    inner += '<g class="seal-rim fade"' + sty(1.4) + '><text class="seal-text"><textPath href="#rim-' + id + '" textLength="' + (TAU * RIM - 4).toFixed(1) +
      '" lengthAdjust="spacing">' + esc(inscription.toUpperCase()) + "</textPath></text></g>";
    if (badge) inner += '<image href="' + esc(badge) + '" x="' + (C - 51) + '" y="' + (C - 51) + '" width="102" height="102" class="fade"' + sty(2) + ' onerror="this.style.display=\'none\'"/>';
    return { viewBox: "0 0 240 240", inner: inner, parts: {}, label: inscription.replace(/ · $/, "") + " seal: interlaced rings around the official badge." };
  }

  /* ------------------------------------------------------------ registry */
  var makers = { model: model, kavach: kavach, agent: agent, barter: barter, radar: radar, chronology: chronology };
  var cache = {};
  function make(id) { return cache[id] || (cache[id] = makers[id]()); }

  return { make: make, seal: seal, parts: function (id) { return (make(id) || {}).parts || {}; } };
})();
