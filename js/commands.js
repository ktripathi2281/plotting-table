import { THEMES, currentTheme, setTheme, nextTheme } from "./theme.js";
import { findProject, openProject } from "./projects.js";
import { prefill } from "./mail.js";
import { initReader, findEssay, ESSAYS } from "./reader.js";

// vim along the bottom of the page. `:` opens a command line whose palette
// lists the site's own commands. The vim a vim user would reach for (motions,
// counts, search, buffers, :set, :w, :q and the rest) works too, and is left
// out of the palette on purpose: it is there to be found.

const SECTIONS = [
  ["top", "whoami"],
  ["fetch", "fetch"],
  ["projects", "projects"],
  ["experience", "experience"],
  ["stack", "stack"],
  ["principles", "how-i-work"],
  ["writing", "writing"],
  ["mail", "mail"],
];

const LINKS = {
  github: "https://github.com/ktripathi2281",
  linkedin: "https://www.linkedin.com/in/kaustubh-tripathi",
  resume: "/resume.pdf",
};

// The palette: the site's own commands, and nothing from vim itself.
const LISTED = [
  { cmd: "help", desc: "this list" },
  { cmd: "projects", desc: "jump to the projects" },
  { cmd: "open ", label: "open …", desc: "a project, by name", fill: true },
  { cmd: "experience", desc: "work, certificates and education" },
  { cmd: "writing", desc: "an essay for each project" },
  { cmd: "read ", label: "read …", desc: "a project's essay, in the editor", fill: true },
  { cmd: "mail", desc: "write to me" },
  { cmd: "resume", desc: "the résumé, as a PDF" },
  { cmd: "github", desc: "github.com/ktripathi2281" },
  { cmd: "linkedin", desc: "linkedin.com/in/kaustubh-tripathi" },
  { cmd: "theme", desc: "the next colour scheme" },
  { cmd: "theme ", label: "theme …", desc: THEMES.join(" · "), fill: true },
  { cmd: "intro", desc: "play the editor intro again" },
  { cmd: "sudo hire kaustubh", desc: "for recruiters" },
];

const NUDGE = "it's vim, sort of. the rest is yours to find.";

const E21 = "E21: Cannot make changes, 'modifiable' is off";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const istTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
const istDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });

// A command and what it does, padded into two columns by visible width.
const row = (cmd, what) => `${cmd}${" ".repeat(Math.max(2, 24 - cmd.replace(/<[^>]+>/g, "").length))}${what}`;

const HELP = [
  ...LISTED.map((e) => row(`<b>:${esc(e.label || e.cmd.trim())}</b>`, esc(e.desc))),
  "",
  `<span class="dim">${NUDGE}</span>`,
].join("\n");

const VERSION = `VIM - Vi IMproved 9.1 (kaustubh-tripathi.vercel.app)
Included patches: 1-2281
Compiled by kaustubh@bangalore
Features included (+) or not (-):
+java  +spring_boot  +go  +typescript  +structured_outputs
+guardrails  +fallbacks  +audit_log  -hallucination  -vendor_lock_in`;

const SMILE = `        .-""""""-.
      .'          '.
     /   O      O   \\
    :                :
    |    ~~~~~~~~    |
    :    \\      /    :
     \\    '----'    /
      '.          .'
        '-......-'
   keep shipping.`;

export function initCommands() {
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const main = $("main");
  const out = $("term-out");
  const bar = $("statusbar");
  const mode = $("sb-mode");
  const file = $("sb-file");
  const showcmd = $("sb-showcmd");
  const posEl = $("sb-pos");
  const form = $("sb-input");
  const prompt = $("cmd-prompt");
  const input = $("cmd-input");
  const palette = $("palette");
  const mailForm = $("mail-form");
  const shell = $("shell");
  const shellLog = $("shell-log");
  const shellForm = $("shell-form");
  const shellInput = $("shell-input");
  const site = $("site");
  const sections = SECTIONS.map(([id, name]) => ({ id, name, el: $(id) })).filter((s) => s.el);
  const projects = [...document.querySelectorAll(".proj")].map((p) => ({
    name: p.querySelector(".pname").textContent.replace(/\/$/, ""),
    type: p.querySelector(".ptype").textContent,
  }));
  const navLinks = [...document.querySelectorAll(".topbar nav a")];
  const touch = matchMedia("(hover: none)").matches;
  const highlights = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights : null;

  let current = 0; // the section being read
  let fileName = file.textContent;
  let sectionFile = fileName;
  let reader = null; // the essay buffer, once set up below
  let echoTimer = 0;
  let count = ""; // a count typed before a motion, as in 3j
  let pending = ""; // the first key of gg, yy, dd, ]], ZZ…
  let keysTimer = 0;
  let kind = ":"; // what the command line is for: ":" commands, "/" or "?" search
  let items = []; // the palette's suggestions
  let active = 0;
  let cycled = false; // the selection was moved with Tab or the arrows
  let pressing = false; // a palette item is being clicked
  const past = []; // command-line history
  let pastAt = 0;
  const search = { pattern: "", backward: false, ranges: [], index: -1 };

  // ---------------------------------------------------------------- status line

  const setMode = (m) => {
    mode.textContent = m;
    mode.className = `sb-mode${m === "INSERT" ? " is-insert" : m === "COMMAND" ? " is-cmd" : ""}`;
  };

  // A one-line message where the file name is, as vim shows them.
  function echo(text, tone = "", ms = 3200) {
    clearTimeout(echoTimer);
    file.textContent = text;
    file.className = `sb-file is-echo${tone ? ` is-${tone}` : ""}`;
    echoTimer = setTimeout(() => {
      echoTimer = 0;
      file.className = "sb-file";
      file.textContent = fileName;
    }, ms);
  }

  // Longer output, in a panel above the status line.
  function print(html, { ms = 0, hint = "esc to close" } = {}) {
    out.innerHTML = ms || !hint ? html : `${html}\n\n<span class="dim">${hint}</span>`;
    out.hidden = false;
    clearTimeout(print.timer);
    if (ms) print.timer = setTimeout(() => (out.hidden = true), ms);
  }

  const tick = () => {
    const t = `${istTime.format(new Date())} IST`;
    $("sb-clock").textContent = t;
    const fetchClock = $("fetch-clock");
    if (fetchClock) fetchClock.textContent = t;
  };
  tick();
  setInterval(tick, 20000);

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        current = sections.findIndex((s) => s.el === entry.target);
        const s = sections[current];
        sectionFile = `~/kaustubh/${s.name}.md`;
        if (reader?.isOpen()) continue;
        fileName = sectionFile;
        if (!echoTimer) file.textContent = fileName;
        for (const a of navLinks) a.toggleAttribute("aria-current", a.getAttribute("href") === `#${s.id}`);
      }
    },
    { rootMargin: "-35% 0px -60% 0px" }
  );
  for (const s of sections) io.observe(s.el);

  // ---------------------------------------------------------------- moving

  const reading = () => !!reader?.isOpen();

  function go(index) {
    reader?.finish();
    const s = sections[Math.max(0, Math.min(sections.length - 1, index))];
    s.el.scrollIntoView({ block: "start" });
    window.history.replaceState(null, "", s.id === "top" ? location.pathname : `#${s.id}`);
  }

  const top = () => go(0);
  const bottom = () => window.scrollTo({ top: document.documentElement.scrollHeight });
  const lineHeight = () => parseFloat(getComputedStyle(document.body).lineHeight) || 24;
  const lines = (n) => window.scrollBy({ top: n * lineHeight(), behavior: "instant" });
  const half = (n) => window.scrollBy({ top: (n * innerHeight) / 2 });

  const normalise = (name) => name.toLowerCase().replace(/^~\/kaustubh\//, "").replace(/\.md$|\/$/g, "");
  const sectionIndex = (name) => {
    const n = normalise(name);
    return sections.findIndex((s) => s.name === n || s.id === n);
  };
  const goTo = (name) => {
    const i = sectionIndex(name);
    if (i < 0) return false;
    go(i);
    return true;
  };

  // { and }, [[ and ]]: by section, counted from where the page is now.
  function bySection(steps) {
    const at = window.scrollY + 76;
    const tops = sections.map((s) => s.el.getBoundingClientRect().top + window.scrollY);
    if (steps > 0) {
      const here = tops.filter((t) => t <= at + 2).length - 1;
      const to = here + steps;
      return to > sections.length - 1 ? bottom() : go(to);
    }
    // Sitting at a section's start counts as before it, so { goes back one.
    const before = tops.filter((t) => t < at - 10).length - 1;
    go(Math.max(0, before + steps + 1));
  }

  function toMail() {
    reader?.finish();
    goTo("mail");
    const fields = [...mailForm.querySelectorAll("input:not(.trap), textarea")];
    (fields.find((f) => f.required && !f.value) || mailForm.querySelector("textarea")).focus({ preventScroll: true });
  }

  async function yank() {
    const s = sections[current];
    const essay = reader?.current();
    const url = essay ? `${location.origin}/#vi/${essay.slug}` : `${location.origin}/${s.id === "top" ? "" : `#${s.id}`}`;
    try {
      await navigator.clipboard.writeText(url);
      echo(`yanked ${url}`);
    } catch {
      echo(url);
    }
  }

  // ---------------------------------------------------------------- search

  function matches(pattern) {
    const smart = /[A-Z]/.test(pattern); // smartcase: case matters once it has capitals
    const needle = smart ? pattern : pattern.toLowerCase();
    const walker = document.createTreeWalker(reader?.isOpen() ? reader.root() : main, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.nodeValue.trim() && !node.parentElement.closest("#portrait, .fetch-logo, [aria-hidden='true'], script, style")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    const ranges = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const hay = smart ? node.nodeValue : node.nodeValue.toLowerCase();
      for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + needle.length);
        ranges.push(r);
      }
    }
    return ranges;
  }

  function paint(ranges, cur) {
    if (highlights) {
      highlights.set("search", new Highlight(...ranges));
      if (cur) highlights.set("search-current", new Highlight(cur));
      else highlights.delete("search-current");
    } else if (cur) {
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(cur);
    }
  }

  function unpaint() {
    highlights?.delete("search");
    highlights?.delete("search-current");
  }

  // The scroller a search moves: the essay's buffer, or the page.
  const scroller = () => (reader?.isOpen() ? reader.root() : null);
  const scrolled = () => (scroller() ? scroller().scrollTop : window.scrollY);

  // Where a match sits, or its project's row if it is folded away.
  function offset(r) {
    const folded = r.startContainer.parentElement.closest("details:not([open])");
    const box = folded ? folded.querySelector("summary").getBoundingClientRect() : r.getBoundingClientRect();
    return box.top + scrolled();
  }

  function show(i, message, tone = "") {
    search.index = i;
    const r = search.ranges[i];
    const el = r.startContainer.parentElement;
    if (el.closest(".proj[hidden]")) document.querySelector('.filters [data-filter="all"]').click();
    const folded = el.closest("details");
    if (folded && !folded.open) folded.open = true;
    paint(search.ranges, r);
    const box = scroller();
    if (box) box.scrollTo({ top: box.scrollTop + r.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 3 });
    else window.scrollTo({ top: window.scrollY + r.getBoundingClientRect().top - innerHeight / 3 });
    echo(message, tone);
  }

  function find(pattern, backward) {
    if (!pattern) return echo("E35: No previous regular expression", "err");
    Object.assign(search, { pattern, backward, ranges: matches(pattern), index: -1 });
    if (!search.ranges.length) {
      unpaint();
      return echo(`E486: Pattern not found: ${pattern}`, "err");
    }
    const at = scrolled() + (scroller() ? scroller().getBoundingClientRect().top + 4 : 80);
    const ys = search.ranges.map(offset);
    let i = backward ? ys.findLastIndex((y) => y < at - 1) : ys.findIndex((y) => y > at + 1);
    if (i >= 0) return show(i, `${backward ? "?" : "/"}${pattern}`);
    i = backward ? ys.length - 1 : 0;
    show(i, backward ? "search hit TOP, continuing at BOTTOM" : "search hit BOTTOM, continuing at TOP", "warn");
  }

  // n and N: on, or back, in the direction of the last search.
  function again(dir) {
    if (!search.pattern) return echo("E35: No previous regular expression", "err");
    search.ranges = matches(search.pattern);
    if (!search.ranges.length) return echo(`E486: Pattern not found: ${search.pattern}`, "err");
    const forward = dir > 0 !== search.backward;
    const i = search.index + (forward ? 1 : -1);
    if (i >= search.ranges.length) return show(0, "search hit BOTTOM, continuing at TOP", "warn");
    if (i < 0) return show(search.ranges.length - 1, "search hit TOP, continuing at BOTTOM", "warn");
    show(i, `${forward ? "/" : "?"}${search.pattern}`);
  }

  // ---------------------------------------------------------------- essays

  reader = initReader({
    echo,
    onState({ open, file: f, pos }) {
      fileName = open ? f : sectionFile;
      posEl.hidden = !open;
      posEl.textContent = pos;
      if (!echoTimer) file.textContent = fileName;
    },
  });

  // ---------------------------------------------------------------- the shell, after :q

  const PS = '<span class="ps">kaustubh@bangalore</span> ~ % ';

  function quit(suspended = false) {
    out.hidden = true;
    shellLog.innerHTML = suspended
      ? `${PS}vim ~/kaustubh\n\nzsh: suspended  vim ~/kaustubh\n`
      : `${PS}vim ~/kaustubh\n`;
    shell.hidden = false;
    site.inert = true;
    shellInput.value = "";
    // After the key that quit has finished, so it isn't typed into the prompt.
    setTimeout(() => shellInput.focus(), 0);
  }

  function resume() {
    shell.hidden = true;
    site.inert = false;
    setMode("NORMAL");
  }

  // The faint suggestion at the prompt, as fish and zsh-autosuggestions show one.
  shellInput.addEventListener("keydown", (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && !shellInput.value) {
      e.preventDefault();
      shellInput.value = shellInput.placeholder;
    }
  });

  shellForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const line = shellInput.value.trim();
    shellInput.value = "";
    const [prog = "", ...args] = line.split(/\s+/);
    if (["vim", "vi", "nvim", "fg", "exit", "logout"].includes(prog)) {
      resume();
      if (args.length && ["vim", "vi", "nvim"].includes(prog)) openEssay(args.join(" "));
      return;
    }
    const reply = {
      "": "",
      ls: sections.map((s) => `${s.name}.md`).join("  "),
      pwd: "/home/kaustubh",
      whoami: "kaustubh",
      date: `${istDate.format(new Date())} IST`,
      echo: esc(args.join(" ")),
      clear: null,
    }[prog];
    if (prog === "clear") {
      shellLog.innerHTML = "";
      return;
    }
    shellLog.innerHTML += `${PS}${esc(line)}\n${reply === undefined ? `zsh: command not found: ${esc(prog)}\n` : reply ? `${reply}\n` : ""}`;
    shell.scrollTop = shell.scrollHeight;
  });

  // ---------------------------------------------------------------- :commands

  function theme(arg) {
    if (!arg) return echo(`colorscheme ${nextTheme()}`);
    if (setTheme(arg)) return echo(`colorscheme ${arg}`);
    echo(`E185: Cannot find color scheme '${arg}'`, "err");
  }

  function sudo(arg) {
    if (/hire/i.test(arg)) {
      print(`[sudo] password for recruiter: ••••••••\n<span class="ok">verified.</span> opening mail…`, { ms: 2400 });
      prefill("Let's talk about a role");
      setTimeout(toMail, 900);
      return;
    }
    print(`recruiter is not in the sudoers file. This incident will be reported.\n<span class="dim">(try :sudo hire kaustubh)</span>`);
  }

  function replayIntro() {
    try {
      sessionStorage.removeItem("intro");
    } catch {
      /* the query string asks for it anyway */
    }
    location.href = "/?intro";
  }

  function edit(arg, missing) {
    if (goTo(arg)) return;
    const p = findProject(normalise(arg));
    if (p) {
      reader?.finish();
      return openProject(p);
    }
    echo(missing, "err");
  }

  // :vi, :e, :read and friends: an essay if the name is a project's, else
  // a section or a project on the page.
  function openEssay(arg, word = "vi") {
    if (!arg) {
      if (word === "read") return echo("read which essay? try :read kavach", "err");
      return reading() ? echo(`"${fileName}" [readonly]`) : echo("E32: No file name", "err");
    }
    if (findEssay(arg)) return reader.open(arg);
    if (word === "read" || word === "r") return echo(`no essay for ${arg}: try ${ESSAYS.slice(0, 3).map((e) => e.slug).join(", ")}…`, "err");
    edit(arg, `"${arg}" [New]`);
  }

  function buffer(arg) {
    if (/^\d+$/.test(arg)) return Number(arg) <= sections.length ? go(Number(arg) - 1) : echo(`E86: Buffer ${arg} does not exist`, "err");
    const i = sections.findIndex((s) => s.name.startsWith(normalise(arg)));
    if (!arg || i < 0) return echo(`E94: No matching buffer for ${arg}`, "err");
    go(i);
  }

  const bufferList = () =>
    print(
      sections
        .map((s, i) => `${String(i + 1).padStart(3)} ${i === current ? "%a" : "  "}   ${`"${s.name}.md"`.padEnd(20)} line ${i === current ? 1 : 0}`)
        .join("\n")
    );

  const numbered = () => main.classList.contains("numbered");
  // The page numbers its blocks; an essay has line numbers until :set nonu.
  const numbers = (on) => {
    main.classList.toggle("numbered", on);
    reader?.numbers(on);
  };

  function setOption(arg) {
    if (!arg || arg === "all") {
      return print(`  background=${currentTheme() === "daylight" ? "light" : "dark"}  ${numbered() ? "" : "no"}number  readonly  nomodifiable`);
    }
    for (const opt of arg.split(/\s+/)) {
      const [name, value] = opt.split("=");
      if (name === "background" || name === "bg") {
        if (value === "light") setTheme("daylight");
        else if (value === "dark") currentTheme() === "daylight" && setTheme("amber");
        else return echo(`E474: Invalid argument: ${opt}`, "err");
      } else if (["number", "nu", "relativenumber", "rnu"].includes(name)) numbers(true);
      else if (["nonumber", "nonu", "norelativenumber", "nornu"].includes(name)) numbers(false);
      else if (["number!", "nu!", "invnumber", "invnu"].includes(name)) numbers(!numbered());
      else if (["modifiable", "ma", "noreadonly", "noro"].includes(name)) return echo("nice try.", "warn");
      else return echo(`E518: Unknown option: ${name}`, "err");
    }
  }

  function shellCommand(line) {
    const [prog = "", ...args] = line.split(/\s+/);
    if (!prog) return echo("E471: Argument required", "err");
    if (prog === "sudo") return sudo(args.join(" "));
    if (prog === "git" && args[0] === "log") return goTo("fetch");
    const reply = {
      ls: sections.map((s) => `${s.name}.md`).join("  "),
      pwd: "/home/kaustubh",
      whoami: "kaustubh",
      date: `${istDate.format(new Date())} IST`,
      echo: esc(args.join(" ")),
      uname: args.includes("-a") ? "kaustubh 6.0-tcs #2281 SMP PREEMPT x86_64 GNU/Linux" : "kaustubh",
      rm: "rm: cannot remove: Read-only file system",
      vim: "you're already in it.",
      git: `git: '${esc(args[0] || "")}' is not a git command. See 'git --help'.`,
    }[prog];
    print(`<span class="dim">:!${esc(line)}</span>\n${reply ?? `zsh: command not found: ${esc(prog)}`}`, {
      hint: "Press ENTER or type command to continue",
    });
  }

  // What a command line does, or null if it is not a command. Nothing runs here.
  function resolve(text) {
    const line = text.trim().replace(/^:+/, "");
    if (!line) return null;
    if (/^\d+$/.test(line)) return () => (reading() ? reader.toLine(Number(line)) : go(Number(line) - 1));
    if (line === "$") return () => (reading() ? reader.bottom() : bottom());
    if (line.startsWith("!")) return () => shellCommand(line.slice(1).trim());
    if (/^%?s\/|^%?s(ubstitute)?$|^g\/|^%?d$/.test(line)) return () => echo(E21, "err");
    const [first, ...rest] = line.split(/\s+/);
    const word = first.toLowerCase();
    const arg = rest.join(" ");
    if (first === "bN" || first === "bNext") return () => (reading() ? reader.step(-1) : go((current - 1 + sections.length) % sections.length));

    switch (word) {
      // The site's own, as the palette lists them.
      case "help":
      case "h":
        return () => (arg ? echo(`E149: Sorry, no help for ${arg}`, "err") : print(HELP));
      case "open":
        return () => edit(arg, arg ? `no project called ${arg}` : "open which project? try :open tollgate");
      case "theme":
        return () => theme(arg);
      case "resume":
      case "github":
      case "linkedin":
        return () => window.open(LINKS[word], "_blank", "noopener");
      case "mail":
        return toMail;
      case "intro":
        return replayIntro;
      case "sudo":
        return () => sudo(arg);

      // vim's own, left to be found.
      case "q":
      case "q!":
      case "quit":
      case "quit!":
      case "qa":
      case "qa!":
      case "qall":
      case "qall!":
      case "cq":
      case "x":
      case "xit":
      case "exit":
      case "wq!":
      case "x!":
      case "clo":
      case "close":
      case "bd":
      case "bdelete":
        // An open essay closes first; quitting again leaves the editor.
        return () => (reading() ? reader.close() : quit());
      case "sh":
      case "shell":
      case "st":
      case "stop":
      case "sus":
      case "suspend":
        return () => quit(word !== "sh" && word !== "shell");
      case "w":
      case "write":
      case "wq":
      case "wa":
      case "wqa":
      case "xa":
      case "up":
      case "update":
      case "sav":
      case "saveas":
        return () => echo("E45: 'readonly' option is set (add ! to override)", "err");
      case "w!":
      case "write!":
        return () => echo(`"${fileName}" E212: Can't open file for writing`, "err");
      case "read":
      case "r":
      case "e":
      case "edit":
      case "vi":
      case "vim":
      case "nvim":
      case "view":
      case "sp":
      case "split":
      case "vs":
      case "vsplit":
      case "tabe":
      case "tabedit":
      case "tabnew":
        return () => openEssay(arg, word);
      case "e!":
      case "edit!":
        return () => location.reload();
      case "ls":
      case "buffers":
      case "files":
        return () => (reading() ? print(reader.list()) : bufferList());
      case "b":
      case "buffer":
        return () => {
          if (!reading()) return buffer(arg);
          if (/^\d+$/.test(arg)) return ESSAYS[Number(arg) - 1] ? reader.open(ESSAYS[Number(arg) - 1]) : echo(`E86: Buffer ${arg} does not exist`, "err");
          return findEssay(arg) ? reader.open(arg) : echo(`E94: No matching buffer for ${arg}`, "err");
        };
      case "bn":
      case "bnext":
        return () => (reading() ? reader.step(1) : go((current + 1) % sections.length));
      case "bp":
      case "bprev":
      case "bprevious":
        return () => (reading() ? reader.step(-1) : go((current - 1 + sections.length) % sections.length));
      case "bf":
      case "bfirst":
      case "br":
      case "brewind":
        return () => (reading() ? reader.open(ESSAYS[0]) : top());
      case "bl":
      case "blast":
        return () => (reading() ? reader.open(ESSAYS[ESSAYS.length - 1]) : go(sections.length - 1));
      case "cd":
        return () => (!arg || arg === "~" ? top() : edit(arg, `E344: Can't find directory "${arg}" in cdpath`));
      case "pwd":
        return () => echo("~/kaustubh");
      case "set":
      case "se":
        return () => setOption(arg);
      case "colorscheme":
      case "colo":
        return () => (arg ? theme(arg) : echo(currentTheme()));
      case "noh":
      case "nohlsearch":
        return unpaint;
      case "version":
      case "ve":
      case "ver":
        return () => print(VERSION);
      case "smile":
        return () => print(SMILE);
      case "echo":
        return () => echo(arg.replace(/^["']|["']$/g, ""));
      case "u":
      case "undo":
        return () => echo("Already at oldest change");
      case "red":
      case "redo":
        return () => echo("Already at newest change");
      case "term":
      case "terminal":
        return () => echo("you're looking at one.");
      case "clear":
        return () => (out.hidden = true);
    }
    if (sectionIndex(word) >= 0) return () => goTo(word);
    const p = findProject(line);
    if (p)
      return () => {
        reader?.finish();
        openProject(p);
      };
    return null;
  }

  function run(text) {
    const line = text.trim().replace(/^:+/, "");
    if (!line) return;
    const action = resolve(line);
    if (action) action();
    else echo(`E492: Not an editor command: ${line}`, "err");
  }

  // ---------------------------------------------------------------- the command line and its palette

  function suggestions(text) {
    const q = text.replace(/^\s*:?/, "").toLowerCase();
    const byName = (rest) => projects.filter((p) => p.name.startsWith(rest) || p.name.replace(/-/g, "").startsWith(rest.replace(/-/g, "")));
    if (/^open\s/.test(q)) return byName(q.slice(5).trim()).map((p) => ({ cmd: `open ${p.name}`, desc: p.type }));
    if (/^read\s/.test(q)) {
      const rest = q.slice(5).trim().replace(/[^a-z0-9]/g, "");
      return ESSAYS.filter((e) => e.slug.startsWith(rest) || e.project.replace(/-/g, "").startsWith(rest)).map((e) => ({ cmd: `read ${e.slug}`, desc: e.title }));
    }
    if (/^theme\s/.test(q)) {
      const rest = q.slice(6).trim();
      return THEMES.filter((t) => t.startsWith(rest)).map((t) => ({ cmd: `theme ${t}`, desc: t === currentTheme() ? "in use" : "" }));
    }
    if (!q) return LISTED;
    const listed = LISTED.filter((e) => e.cmd.startsWith(q) || e.label?.startsWith(q));
    return listed.length ? listed : byName(q).map((p) => ({ cmd: `open ${p.name}`, desc: p.type }));
  }

  function drawPalette() {
    if (kind !== ":" || !items.length) {
      palette.hidden = true;
      palette.textContent = "";
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      return;
    }
    palette.innerHTML =
      items
        .map(
          (it, i) =>
            `<button type="button" role="option" id="pal-${i}" class="pal-item${i === active && cycled ? " is-on" : ""}" aria-selected="${i === active && cycled}" data-i="${i}"><span class="pal-cmd">:${esc(it.label || it.cmd.trim())}</span><span class="pal-desc">${esc(it.desc)}</span></button>`
        )
        .join("") + (input.value.trim() ? "" : `<p class="pal-nudge">${NUDGE}</p>`);
    palette.hidden = false;
    out.hidden = true;
    input.setAttribute("aria-expanded", "true");
    if (cycled) {
      input.setAttribute("aria-activedescendant", `pal-${active}`);
      palette.querySelector(".is-on")?.scrollIntoView({ block: "nearest" });
    }
  }

  function refresh() {
    items = kind === ":" ? suggestions(input.value) : [];
    active = 0;
    cycled = false;
    drawPalette();
  }

  // Tab and the arrows step through the suggestions, as vim's wildmenu does.
  function step(dir) {
    if (!items.length) return;
    active = cycled ? (active + dir + items.length) % items.length : dir > 0 ? 0 : items.length - 1;
    cycled = true;
    input.value = items[active].cmd;
    drawPalette();
  }

  function finish(line) {
    if (line.trim()) past.push(line.trim());
    closeCmd();
    run(line);
  }

  function choose(item) {
    if (!item.fill) return finish(item.cmd);
    input.value = item.cmd;
    refresh();
    if (!touch) input.focus();
  }

  function openCmd(k = ":") {
    kind = k;
    prompt.textContent = k;
    form.hidden = false;
    setMode("COMMAND");
    input.value = "";
    pastAt = past.length;
    out.hidden = true;
    refresh();
    // On a phone the list is there to tap; the keyboard waits until the field is.
    if (!touch || k !== ":") input.focus();
  }

  function closeCmd() {
    form.hidden = true;
    palette.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setMode(mailForm.contains(document.activeElement) ? "INSERT" : "NORMAL");
    if (document.activeElement === input) input.blur();
  }

  function cancel() {
    if (kind !== ":") search.ranges.length ? paint(search.ranges, search.ranges[search.index]) : unpaint();
    closeCmd();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    if (kind !== ":") {
      closeCmd();
      return find(text || search.pattern, kind === "?");
    }
    if (cycled && items[active]) return choose(items[active]);
    if (resolve(text)) return finish(text);
    if (text.trim() && items[0]) return choose(items[0]);
    finish(text);
  });

  input.addEventListener("input", () => {
    if (kind === ":") return refresh();
    // Incremental search: every match lights up while the pattern is typed.
    if (input.value) paint(matches(input.value), null);
    else unpaint();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || (e.ctrlKey && e.key === "c")) {
      e.preventDefault();
      return cancel();
    }
    if (e.key === "Backspace" && !input.value) {
      e.preventDefault();
      return cancel();
    }
    if (kind === ":" && (e.key === "Tab" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      return step(e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey) ? -1 : 1);
    }
    if (e.ctrlKey && (e.key === "p" || e.key === "n")) {
      // Command-line history.
      e.preventDefault();
      pastAt = Math.max(0, Math.min(past.length, pastAt + (e.key === "p" ? -1 : 1)));
      input.value = past[pastAt] ?? "";
    }
  });

  input.addEventListener("blur", () =>
    setTimeout(() => {
      if (!pressing && !form.hidden && document.activeElement !== input) closeCmd();
    }, 150)
  );

  palette.addEventListener("pointerdown", () => (pressing = true));
  palette.addEventListener("mousedown", (e) => e.preventDefault());
  palette.addEventListener("click", (e) => {
    pressing = false;
    const button = e.target.closest(".pal-item");
    if (button) choose(items[Number(button.dataset.i)]);
  });
  document.addEventListener("pointerup", () => setTimeout(() => (pressing = false), 200));

  $("sb-cmd").addEventListener("click", () => (form.hidden ? openCmd(":") : closeCmd()));

  // Typing in the mail form is INSERT mode; Esc leaves it.
  mailForm.addEventListener("focusin", () => form.hidden && setMode("INSERT"));
  mailForm.addEventListener("focusout", () =>
    setTimeout(() => {
      if (!mailForm.contains(document.activeElement) && form.hidden) setMode("NORMAL");
    }, 0)
  );

  // ---------------------------------------------------------------- normal mode

  const keys = () => {
    showcmd.textContent = count + pending;
    clearTimeout(keysTimer);
    if (count || pending) {
      keysTimer = setTimeout(() => {
        count = pending = "";
        showcmd.textContent = "";
      }, 1600);
    }
  };

  function takeCount() {
    const given = count !== "";
    const n = Math.max(1, Number(count) || 1);
    count = "";
    keys();
    return { n, given };
  }

  function one(k, { n, given }, e) {
    const r = reading() ? reader : null;
    switch (k) {
      case "j":
        return r ? r.lines(n) : lines(n);
      case "k":
        return r ? r.lines(-n) : lines(-n);
      case "}":
      case "{":
        if (!r) return bySection(k === "}" ? n : -n);
        for (let i = 0; i < n; i++) r.paragraph(k === "}" ? 1 : -1);
        return;
      case "G":
        if (r) return given ? r.toLine(n) : r.bottom();
        return given ? go(n - 1) : bottom();
      case "n":
        return again(1);
      case "N":
        return again(-1);
      case ":":
      case "/":
      case "?":
        e.preventDefault();
        return openCmd(k);
      case "i":
      case "I":
      case "a":
      case "A":
      case "o":
      case "O":
        e.preventDefault();
        return r ? echo("W10: Warning: Changing a readonly file", "warn") : toMail();
      case "u":
        return echo("Already at oldest change");
      case "Y":
        return yank();
      case "x":
      case "X":
      case "D":
      case "C":
      case "s":
      case "S":
      case "p":
      case "P":
      case "r":
      case "R":
      case "J":
      case "~":
        return echo(E21, "err");
    }
  }

  function two(first, k, { n, given }) {
    const r = reading() ? reader : null;
    if (first === "g" && k === "g") return r ? (given ? r.toLine(n) : r.top()) : given ? go(n - 1) : top();
    if (first === "y" && k === "y") return yank();
    if (first === "d" || first === "c") return echo(E21, "err");
    if ((first === "]" && k === "]") || (first === "[" && k === "[")) {
      const dir = first === "]" ? 1 : -1;
      if (!r) return bySection(dir * n);
      for (let i = 0; i < n; i++) r.heading(dir);
      return;
    }
    if (first === "Z" && (k === "Z" || k === "Q")) return r ? r.close() : quit();
  }

  document.addEventListener("keydown", (e) => {
    if (root.classList.contains("has-intro") || !shell.hidden) return;
    const field = e.target.closest?.("input, textarea, select, [contenteditable]");
    if (field) {
      if (e.key === "Escape" && field !== input) field.blur();
      return;
    }
    if (!form.hidden || e.metaKey || e.altKey) return;
    if (e.ctrlKey) {
      const k = e.key.toLowerCase();
      const { n } = takeCount();
      const r = reading() ? reader : null;
      if (k === "d") r ? r.half(n) : half(n);
      else if (k === "u") r ? r.half(-n) : half(-n);
      else if (k === "e") r ? r.lines(n) : lines(n);
      else if (k === "y") r ? r.lines(-n) : lines(-n);
      else if (k === "z") quit(true);
      else return;
      e.preventDefault();
      return;
    }
    const k = e.key;
    if (k === "Escape") {
      out.hidden = true;
      count = pending = "";
      return keys();
    }
    if (k === "Enter") {
      if (!out.hidden) {
        e.preventDefault();
        out.hidden = true;
      }
      return;
    }
    if (k.length !== 1) return; // arrows, Tab, Page Down and the rest stay the browser's
    if (!pending && (/[1-9]/.test(k) || (k === "0" && count))) {
      count += k;
      return keys();
    }
    if (pending) {
      const first = pending;
      pending = "";
      return two(first, k, takeCount());
    }
    if ("gydc[]Z".includes(k)) {
      pending = k;
      return keys();
    }
    one(k, takeCount(), e);
  });

  // A click anywhere else closes the output and the command line. The path is
  // taken at dispatch, so a palette item redrawn by its own click still counts.
  document.addEventListener("click", (e) => {
    const path = e.composedPath();
    if (!out.hidden && !path.includes(out) && !path.includes(bar)) out.hidden = true;
    if (!form.hidden && !path.includes(bar) && !path.includes(palette)) closeCmd();
  });

  // Mention the command line once, after a first look around.
  try {
    if (!localStorage.getItem("hinted")) {
      setTimeout(() => {
        const how = touch ? "tap" : "press";
        if (out.hidden && form.hidden) print(`tip: ${how} <b>:</b> for commands`, { ms: 5000 });
        localStorage.setItem("hinted", "1");
      }, 9000);
    }
  } catch {
    /* no storage: no tip */
  }
}
