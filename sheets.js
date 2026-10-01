// Markup for the sheets on the table, and for the wall label that opens beside one.
// Every sheet is the same thing: a framed mat with one idea in it, and a caption underneath.
window.Sheets = (function () {
  "use strict";
  var T = window.TABLE, PL = window.Plates, PR = T.profile;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ext(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + ' <span aria-hidden="true">↗</span></a>'; }

  var REPLOT = '<button type="button" class="replot mono" data-act="replot" aria-label="Replot this drawing">Replot <span aria-hidden="true">↺</span></button>';

  // The caption is a small label stuck on the print: the number, then the name.
  function wall(s) {
    var w = s.wall || { no: s.no, nm: s.title };
    return '<figcaption class="wall"><span class="no mono">' + esc(w.no) + '</span><span class="nm">' + esc(w.nm) + "</span></figcaption>";
  }
  function figure(s, cls, mat, extra) {
    return '<figure class="plate ' + cls + '"><div class="mat">' + mat + "</div>" + wall(s) + (extra || "") + "</figure>";
  }
  function drawing(s) {
    var d = PL.make(s.drawing);
    return figure(s, "m-draw",
      '<div class="plot" data-plate="' + s.drawing + '"><svg viewBox="' + d.viewBox + '" role="img" aria-label="' + esc(d.label) + '" preserveAspectRatio="xMidYMid meet">' + d.inner + "</svg></div>",
      REPLOT);
  }

  /* ------------------------------------------------------------ sheets on the table */
  var render = {
    title: function (s) {
      return figure(s, "m-title",
        '<p class="mono kick">Selected works · 2024 – 2026</p>' +
        '<p class="name"><span>' + esc(PR.first) + "</span><em>" + esc(PR.last) + "</em></p>" +
        '<p class="lede">' + esc(PR.lede) + "</p>" +
        '<svg class="pen-line" viewBox="0 0 420 46" aria-hidden="true"><path d="M6 30C70 6 118 46 190 22S322 8 414 28" pathLength="1"/></svg>');
    },
    plate: drawing,
    timeline: drawing,

    statement: function (s) {
      return figure(s, "m-statement", '<blockquote class="m-pull">' + esc(s.pull) + "</blockquote>");
    },

    essay: function (s) {
      return figure(s, "m-essay", '<p class="m-lead">' + esc(s.lead) + '</p><p class="m-by mono">On ' + esc(s.project) + "</p>");
    },

    credential: function (s, uid) {
      var d = PL.seal(s.id + "-" + uid, s.inscription, s.badge, s.pattern);
      return figure(s, "m-seal",
        '<div class="plot seal" data-plate="seal-' + s.id + '"><svg viewBox="' + d.viewBox + '" role="img" aria-label="' + esc(d.label) + '">' + d.inner + "</svg></div>");
    },

    specimen: function (s) {
      return figure(s, "m-spec",
        "<dl>" + s.glance.map(function (r) { return '<div><dt class="mono">' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>");
    },

    gate: function (s) {
      return figure(s, "m-gate",
        '<p class="mono m-small">Write to</p><a class="m-mail" href="mailto:' + esc(PR.email) + '">' + esc(PR.email) + "</a>" +
        '<p class="m-links mono">' + ext(PR.linkedin, "LinkedIn") + ext(PR.github, "GitHub") + ext(PR.resume, "Résumé") + "</p>");
    }
  };

  /* ------------------------------------------------------------ wall labels (the docked panel) */
  function metaList(meta) {
    return '<dl class="meta">' + meta.map(function (m) { return '<div><dt class="mono">' + esc(m[0]) + "</dt><dd>" + esc(m[1]) + "</dd></div>"; }).join("") + "</dl>";
  }
  function reading(s) {
    return '<p class="reading" id="reading" aria-live="polite" data-default="' + esc(s.caption || "") + '"><span class="mono">On the drawing.</span> <span class="rt">' + esc(s.caption || "") + "</span></p>" +
      (s.hint ? '<p class="hint-line">' + esc(s.hint) + "</p>" : "");
  }
  function links(arr) {
    return '<p class="p-links mono">' + arr.map(function (l) {
      return l.goto ? '<a href="#' + l.goto + '" data-goto="' + l.goto + '">' + esc(l.label) + " →</a>" : ext(l.href, l.label);
    }).join("") + "</p>";
  }
  function head(s, noLabel) {
    return '<p class="mono red p-no">' + esc(noLabel || s.no) + "</p>" +
      '<h2 class="p-title" id="panel-title" tabindex="-1">' + esc(s.title) + "</h2>" +
      (s.kicker ? '<p class="p-kick">' + esc(s.kicker) + "</p>" : "");
  }

  var panel = {
    title: function (s) {
      return head(s, "Selected works") +
        '<p class="p-desc">' + esc(PR.lede) + "</p>" +
        metaList([["Practice", PR.role], ["Based in", PR.location], ["Currently", PR.current], ["Status", PR.availability]]) +
        '<h3 class="mono p-h">Finding your way</h3>' +
        '<ul class="p-notes how">' +
        "<li>The table has no edge. Drag in any direction, or scroll. The same sheets come round again.</li>" +
        "<li>Click a sheet to read its wall label here. Hover a drawing to read its parts.</li>" +
        "<li>Pinch, or hold Ctrl or ⌘ and scroll, to zoom. Press <kbd>/</kbd> to find something.</li></ul>" +
        '<p class="p-links mono">' + ext(PR.linkedin, "LinkedIn") + ext(PR.github, "GitHub") + ext(PR.resume, "Résumé, PDF") + ext(PR.portfolio, "Portfolio") + "</p>";
    },

    plate: function (s) {
      return head(s) +
        (s.meta ? metaList(s.meta) : "") +
        '<p class="p-desc">' + esc(s.description) + "</p>" +
        (s.notes ? '<ul class="p-notes">' + s.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
        reading(s) +
        (s.links ? links(s.links) : "");
    },

    essay: function (s) {
      return head(s, s.no + " · Essay") +
        '<p class="p-desc">' + esc(s.excerpt) + "</p>" +
        metaList([["On", s.project]].concat(s.collaborator ? [["With", s.collaborator]] : [])) +
        links([{ label: "Read the essay", href: s.href }, { label: "See the plate", goto: s.plate }]);
    },

    statement: function (s) {
      return head(s, s.no + " · " + s.kicker) +
        '<blockquote class="pull small">' + esc(s.pull) + "</blockquote>" +
        s.body.map(function (p) { return '<p class="p-desc">' + esc(p) + "</p>"; }).join("");
    },

    credential: function (s) {
      return head(s) +
        '<p class="p-desc">' + esc(s.description) + "</p>" +
        metaList([["Issued", s.issued], ["Valid until", s.validThrough], ["Assessment", s.assessment], ["Covers", s.covers]]) +
        links([{ label: "Verify on Credly", href: s.href }]);
    },

    timeline: function (s) {
      return head(s) +
        s.entries.map(function (e) {
          return '<div class="chrono"><p class="mono red">' + esc(e.year) + '</p><p class="p-desc tight">' + esc(e.text) + "</p>" + (e.detail ? '<p class="p-note">' + esc(e.detail) + "</p>" : "") + "</div>";
        }).join("") +
        reading(s);
    },

    specimen: function (s) {
      return head(s) + metaList(s.rows);
    },

    gate: function (s) {
      return head(s) +
        '<p class="p-desc">' + esc(s.text) + "</p>" +
        '<p class="p-desc"><a class="g-mail" href="mailto:' + esc(PR.email) + '">' + esc(PR.email) + "</a></p>" +
        '<p class="p-links mono">' + ext(PR.linkedin, "LinkedIn") + ext(PR.github, "GitHub") + ext(PR.resume, "Résumé, PDF") + "</p>";
    }
  };

  return {
    render: function (s, uid) { return (render[s.kind] || render.plate)(s, uid); },
    panel: function (s) { return (panel[s.kind] || panel.plate)(s); },
    esc: esc
  };
})();
