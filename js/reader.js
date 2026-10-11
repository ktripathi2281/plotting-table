// The essays, read in vim: a second buffer over the page. :vi <project> (or
// :e, :read, or an essay link) opens one; :q closes it. Each essay is the
// raw markdown, highlighted, with line numbers and wrapped lines, as vim
// shows a .md file.

export const ESSAYS = [
  { slug: "kavach", project: "kavach", title: "Confidently wrong" },
  { slug: "leetcode", project: "leetcode-agent-tracker", title: "Show your work" },
  { slug: "deepresearch", project: "deepresearch", title: "Pointing is not proving" },
  { slug: "loopdetector", project: "loop-detector", title: "The same failure, again" },
  { slug: "tollgate", project: "tollgate", title: "The commit point" },
  { slug: "rideradar", project: "ride-radar", title: "Where is everyone?" },
  { slug: "skillbarter", project: "skill-barter", title: "A double coincidence of wants" },
];

const flat = (s) => s.toLowerCase().replace(/^~\/kaustubh\/(essays\/)?/, "").replace(/\.md$/, "").replace(/[^a-z0-9]/g, "");

// An essay by its file, its project or the start of either: kavach, kavach.md,
// loop-detector, leet…
export function findEssay(name) {
  const q = flat(name || "");
  if (!q) return null;
  return ESSAYS.find((e) => e.slug === q || flat(e.project) === q) || ESSAYS.find((e) => e.slug.startsWith(q) || flat(e.project).startsWith(q)) || null;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline markdown, highlighted but kept: the backticks, asterisks and
// brackets stay on the line, as they do in vim.
function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`[^`]+`/g, (m) => {
    codes.push(m);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noreferrer">[$1]</a><span class="md-url">($2)</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<span class="md-bold">**$1**</span>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<span class="md-em">*$2*</span>')
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?![_\w])/g, '$1<span class="md-em">_$2_</span>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<span class="md-code">${codes[Number(i)]}</span>`);
}

function highlight(source) {
  const lines = source.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  let front = lines[0] === "---";
  let fence = false;
  return lines.map((line, i) => {
    let html;
    if (front && i > 0 && line === "---") {
      front = false;
      html = '<span class="md-rule">---</span>';
    } else if (front) {
      html = i === 0 ? '<span class="md-rule">---</span>' : esc(line).replace(/^(\w+):(.*)$/, '<span class="md-key">$1</span>:<span class="md-val">$2</span>');
    } else if (line.startsWith("```")) {
      fence = !fence;
      html = `<span class="md-rule">${esc(line)}</span>`;
    } else if (fence) {
      html = `<span class="md-code">${esc(line)}</span>`;
    } else if (/^#{1,6}\s/.test(line)) {
      html = `<span class="md-h${line.startsWith("## ") ? 2 : 1}">${esc(line)}</span>`;
    } else if (/^(---|\*\*\*)$/.test(line)) {
      html = `<span class="md-rule">${line}</span>`;
    } else if (/^>\s?/.test(line)) {
      html = `<span class="md-quote">${inline(line)}</span>`;
    } else {
      html = inline(line).replace(/^(\s*)([-*+]|\d+\.)(\s)/, '$1<span class="md-mark">$2</span>$3');
    }
    return { html, blank: !line.trim() };
  });
}

export function initReader({ echo, onState }) {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const reader = $("reader");
  const tabs = $("reader-tabs");
  const buffer = $("reader-buffer");
  const cache = new Map();
  let current = null; // the open essay
  let landed = false; // arrived on the essay's own address, so there is no page to go back to
  let scrollY = 0;

  tabs.innerHTML = ESSAYS.map((e) => `<a role="tab" href="#vi/${e.slug}" data-slug="${e.slug}">${e.slug}.md</a>`).join("");

  async function load(essay) {
    if (!cache.has(essay.slug)) {
      const res = await fetch(`/essays/${essay.slug}.md`);
      if (!res.ok) throw new Error(`${res.status}`);
      cache.set(essay.slug, await res.text());
    }
    return cache.get(essay.slug);
  }

  const position = () => {
    if (!current) return "";
    const lines = buffer.querySelectorAll(".ln[data-n]");
    const top = buffer.scrollTop;
    let n = 1;
    for (const ln of lines) {
      if (ln.offsetTop - buffer.offsetTop > top + 2) break;
      n = Number(ln.dataset.n);
    }
    const max = buffer.scrollHeight - buffer.clientHeight;
    const pct = max <= 0 ? "All" : top <= 1 ? "Top" : top >= max - 1 ? "Bot" : `${Math.round((top / max) * 100)}%`;
    return `${n},1  ${pct}`;
  };

  const report = () => onState?.({ open: !!current, file: current ? `~/kaustubh/essays/${current.slug}.md [RO]` : null, pos: position() });

  async function show(essay) {
    let text;
    try {
      text = await load(essay);
    } catch {
      echo(`E484: Can't open file essays/${essay.slug}.md`, "err");
      return false;
    }
    current = essay;
    const lines = highlight(text);
    buffer.innerHTML =
      lines.map((l, i) => `<div class="ln${l.blank ? " is-blank" : ""}" data-n="${i + 1}"><span class="no">${i + 1}</span><span class="tx">${l.html || " "}</span></div>`).join("") +
      '<div class="ln is-end"><span class="no">~</span></div>'.repeat(3);
    buffer.scrollTop = 0;
    reader.setAttribute("aria-label", `Essay: ${essay.title}`);
    for (const t of tabs.children) t.setAttribute("aria-selected", String(t.dataset.slug === essay.slug));
    tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    echo(`"${essay.slug}.md" [readonly] ${lines.length}L, ${new Blob([text]).size}B`);
    report();
    return true;
  }

  async function open(name, { push = true } = {}) {
    const essay = typeof name === "string" ? findEssay(name) : name;
    if (!essay) {
      echo(`E484: Can't open file ${name}`, "err");
      return false;
    }
    const wasOpen = !!current;
    if (!wasOpen) scrollY = window.scrollY;
    if (!(await show(essay))) return false;
    reader.hidden = false;
    root.classList.add("reading");
    report(); // now that it has a size to measure
    // Opening from the page adds a step to history, so Back (or :q) returns
    // to it; moving between essays only changes the address.
    const hash = `#vi/${essay.slug}`;
    if (location.hash !== hash) {
      if (push && !wasOpen) history.pushState(null, "", hash);
      else history.replaceState(null, "", hash);
    }
    buffer.focus({ preventScroll: true });
    return true;
  }

  // Close at once, leaving the address on the page.
  function finish() {
    if (!current) return;
    landed = false;
    current = null;
    reader.hidden = true;
    root.classList.remove("reading");
    if (/^#vi\//.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo({ top: scrollY, behavior: "instant" });
    report();
  }

  // :q. Back through history when there is a page behind the essay; the
  // address change then closes it.
  function close() {
    if (!current) return;
    if (!landed && /^#vi\//.test(location.hash)) history.back();
    else finish();
  }

  // Following the address: links to #vi/<essay>, and the back button.
  const route = () => {
    const m = location.hash.match(/^#vi\/([\w-]+)/);
    if (m) {
      const essay = findEssay(m[1]);
      if (essay && essay !== current) open(essay, { push: false });
    } else if (current) {
      finish();
    }
  };
  window.addEventListener("hashchange", route);
  window.addEventListener("popstate", route);
  landed = /^#vi\//.test(location.hash);
  route();

  // Tabs switch essays in place, so :q still returns to the page.
  tabs.addEventListener("click", (e) => {
    const tab = e.target.closest("a[data-slug]");
    if (!tab || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    open(tab.dataset.slug, { push: false });
  });

  buffer.addEventListener("scroll", () => report(), { passive: true });
  $("reader-close").addEventListener("click", close);

  const lineHeight = () => parseFloat(getComputedStyle(buffer).lineHeight) || 24;
  const scrollTo = (top) => buffer.scrollTo({ top, behavior: "instant" });
  const lineTop = (n) => {
    const ln = buffer.querySelector(`.ln[data-n="${n}"]`) || buffer.querySelector(".ln:last-of-type");
    return ln ? ln.offsetTop - buffer.offsetTop : 0;
  };

  return {
    ESSAYS,
    isOpen: () => !!current,
    current: () => current,
    root: () => buffer,
    open,
    close,
    finish,
    lines: (n) => scrollTo(buffer.scrollTop + n * lineHeight()),
    half: (n) => buffer.scrollBy({ top: (n * buffer.clientHeight) / 2 }),
    top: () => scrollTo(0),
    bottom: () => scrollTo(buffer.scrollHeight),
    toLine: (n) => scrollTo(lineTop(n)),
    // { and }: to the next blank line, as vim moves by paragraph.
    paragraph(dir) {
      const blanks = [...buffer.querySelectorAll(".ln.is-blank")].map((ln) => ln.offsetTop - buffer.offsetTop);
      const at = buffer.scrollTop;
      const to = dir > 0 ? blanks.find((t) => t > at + 4) : [...blanks].reverse().find((t) => t < at - 4);
      if (to === undefined) return dir > 0 ? scrollTo(buffer.scrollHeight) : scrollTo(0);
      scrollTo(to);
    },
    // ]] and [[: to the next heading, a markdown file's sections.
    heading(dir) {
      const heads = [...buffer.querySelectorAll(".ln")].filter((ln) => ln.querySelector(".md-h1, .md-h2")).map((ln) => ln.offsetTop - buffer.offsetTop);
      const at = buffer.scrollTop;
      const to = dir > 0 ? heads.find((t) => t > at + 4) : [...heads].reverse().find((t) => t < at - 4);
      if (to === undefined) return dir > 0 ? scrollTo(buffer.scrollHeight) : scrollTo(0);
      scrollTo(to);
    },
    step(dir) {
      const i = ESSAYS.indexOf(current);
      return open(ESSAYS[(i + dir + ESSAYS.length) % ESSAYS.length], { push: false });
    },
    list: () => ESSAYS.map((e, i) => `${String(i + 1).padStart(3)} ${e === current ? "%a" : "  "}   ${`"${e.slug}.md"`.padEnd(22)} ${e.title}`).join("\n"),
    numbers: (on) => reader.classList.toggle("nonumber", !on),
  };
}
