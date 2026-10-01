// Markup for each kind of sheet on the table, and for the wall label that opens beside it.
window.Sheets = (function () {
  "use strict";
  var T = window.TABLE, PL = window.Plates, PR = T.profile;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ext(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + ' <span aria-hidden="true">↗</span></a>'; }

  function drawingFigure(s) {
    var d = PL.make(s.drawing);
    return '<figure class="plot-figure">' +
      '<div class="mat"><div class="plot" data-plate="' + s.drawing + '">' +
      '<svg viewBox="' + d.viewBox + '" role="img" aria-label="' + esc(d.label) + '" preserveAspectRatio="xMidYMid meet">' + d.inner + "</svg></div></div>" +
      '<figcaption class="wall"><span class="no mono">' + esc(s.no) + '</span><span class="nm">' + esc(s.title) + '</span><span class="kk">' + esc(s.kicker) + "</span></figcaption></figure>" +
      '<button type="button" class="replot mono" data-act="replot" aria-label="Replot this drawing">Replot <span aria-hidden="true">↺</span></button>';
  }

  /* ------------------------------------------------------------ sheets on the table */
  var render = {
    title: function (s) {
      return '<div class="card title-card">' +
        '<p class="mono kick">Selected works · 2024 – 2026</p>' +
        '<h1 class="name"><span>' + esc(PR.first) + "</span><em>" + esc(PR.last) + "</em></h1>" +
        '<p class="lede">' + esc(PR.lede) + "</p>" +
        '<dl class="facts">' +
        "<div><dt>Practice</dt><dd>" + esc(PR.role) + "</dd></div>" +
        "<div><dt>Based in</dt><dd>" + esc(PR.location) + "</dd></div>" +
        "<div><dt>Currently</dt><dd>" + esc(PR.current) + "</dd></div>" +
        '<div><dt>Status</dt><dd class="status"><i aria-hidden="true"></i>' + esc(PR.availability) + "</dd></div>" +
        "</dl>" +
        '<div class="tblock mono" aria-hidden="true"><span>Sheet 1 of 1</span><span>Scale 1 : 1</span><span>Drawn by K·T</span><span>Rev. 2026.10</span></div>' +
        "</div>";
    },

    plate: drawingFigure,
    timeline: drawingFigure,

    essay: function (s) {
      return '<div class="card essay">' +
        '<p class="mono red">' + esc(s.no) + " · Essay</p>" +
        '<h3 class="e-title">' + esc(s.title) + "</h3>" +
        '<p class="e-sub">' + esc(s.kicker) + "</p>" +
        '<p class="e-body">' + esc(s.excerpt) + "</p>" +
        '<p class="e-foot mono">On ' + esc(s.project) + (s.collaborator ? " · with " + esc(s.collaborator) : "") + "</p>" +
        "</div>";
    },

    statement: function (s) {
      return '<div class="card statement">' +
        '<p class="mono kick">' + esc(s.no) + " · " + esc(s.kicker) + "</p>" +
        '<blockquote class="pull">' + esc(s.pull) + "</blockquote>" +
        '<p class="s-body">' + esc(s.body[0]) + "</p>" +
        "</div>";
    },

    credential: function (s) {
      var d = PL.seal(s.id, s.inscription, s.badge, s.pattern);
      return '<div class="card cert">' +
        '<div class="plot seal" data-plate="seal-' + s.id + '"><svg viewBox="' + d.viewBox + '" role="img" aria-label="' + esc(d.label) + '">' + d.inner + "</svg></div>" +
        '<p class="mono red cert-no">' + esc(s.no) + "</p>" +
        '<h3 class="cert-name">' + esc(s.title) + "</h3>" +
        '<p class="cert-level">' + esc(s.kicker) + "</p>" +
        '<p class="cert-dates mono">Issued ' + esc(s.issued) + "</p>" +
        "</div>";
    },

    specimen: function (s) {
      return '<div class="card specimen">' +
        '<p class="mono kick">' + esc(s.title) + "</p>" +
        "<dl>" + s.rows.map(function (r) { return "<div><dt class=\"mono\">" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>" +
        "</div>";
    },

    gate: function (s) {
      return '<div class="card gatecard">' +
        '<p class="mono red">' + esc(s.no) + " · " + esc(s.kicker) + "</p>" +
        '<h3 class="g-title">' + esc(s.title) + "</h3>" +
        '<p class="g-text">' + esc(s.text) + "</p>" +
        '<a class="g-mail" href="mailto:' + esc(PR.email) + '">' + esc(PR.email) + "</a>" +
        '<p class="g-links mono">' + ext(PR.linkedin, "LinkedIn") + ext(PR.github, "GitHub") + ext(PR.resume, "Résumé, PDF") + "</p>" +
        "</div>";
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
        '<h3 class="mono p-h">How the table works</h3>' +
        '<ul class="p-notes how">' +
        "<li>Drag to pan. Scroll or use the arrow keys. Hold Ctrl or ⌘ and scroll, or pinch, to zoom.</li>" +
        "<li>Click a sheet to read its wall label here. Hover a drawing to read its parts.</li>" +
        "<li>Follow the red line from sheet to sheet. It is the only way out of the drawing.</li>" +
        "<li>Switch on Pen to leave your own red line. Press <kbd>/</kbd> to find something.</li></ul>" +
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
          return '<div class="chrono"><p class="mono red">' + esc(e.year) + "</p><p class=\"p-desc tight\">" + esc(e.text) + "</p>" + (e.detail ? '<p class="p-note">' + esc(e.detail) + "</p>" : "") + "</div>";
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
    render: function (s) { return (render[s.kind] || render.plate)(s); },
    panel: function (s) { return (panel[s.kind] || panel.plate)(s); },
    esc: esc
  };
})();
