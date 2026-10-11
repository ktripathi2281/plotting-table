import { THEMES, setTheme, nextTheme } from "./theme.js";
import { findProject, openProject } from "./projects.js";
import { prefill } from "./mail.js";

// vim along the bottom of the page: a status line that follows the section
// you are reading, j/k to move between sections, and `:` for commands.

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

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const istTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

// A command and what it does, padded into two columns by visible width.
const row = (cmd, what) => `${cmd}${" ".repeat(Math.max(2, 24 - cmd.replace(/<[^>]+>/g, "").length))}${what}`;

const HELP = [
  row("<b>:help</b>", "this list"),
  row("<b>:ls</b>", "sections on this page"),
  row("<b>:cd</b> <i>section</i>", "go to a section (or just <b>:projects</b>)"),
  row("<b>:open</b> <i>project</i>", "open a project, e.g. <b>:open tollgate</b>"),
  row("<b>:resume</b>", "the résumé, as a PDF"),
  row("<b>:mail</b>", "write to me"),
  row("<b>:theme</b> [<i>name</i>]", THEMES.join(" · ")),
  row("<b>:github</b> · <b>:linkedin</b>", "my profiles"),
  row("<b>:intro</b>", "play the editor intro again"),
  "",
  "keys  <b>j</b> / <b>k</b> next / previous section · <b>gg</b> top · <b>G</b> bottom · <b>esc</b> close",
].join("\n");

export function initCommands() {
  const $ = (id) => document.getElementById(id);
  const out = $("term-out");
  const bar = $("statusbar");
  const mode = $("sb-mode");
  const file = $("sb-file");
  const form = $("sb-input");
  const input = $("cmd-input");
  const opener = $("sb-cmd");
  const sections = SECTIONS.map(([id, name]) => ({ id, name, el: $(id) })).filter((s) => s.el);
  const navLinks = [...document.querySelectorAll(".topbar nav a")];
  let current = 0;
  let lastKey = "";
  let lastAt = 0;

  // The clock, in the status line and in fetch.
  const tick = () => {
    const t = `${istTime.format(new Date())} IST`;
    $("sb-clock").textContent = t;
    const fetchClock = $("fetch-clock");
    if (fetchClock) fetchClock.textContent = t;
  };
  tick();
  setInterval(tick, 20000);

  // Which section is being read.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        current = sections.findIndex((s) => s.el === entry.target);
        const s = sections[current];
        file.textContent = `~/kaustubh/${s.name}.md`;
        for (const a of navLinks) a.toggleAttribute("aria-current", a.getAttribute("href") === `#${s.id}`);
      }
    },
    { rootMargin: "-35% 0px -60% 0px" }
  );
  for (const s of sections) io.observe(s.el);

  function print(html, ms = 0) {
    out.innerHTML = ms ? html : `${html}\n\n<span class="dim">esc to close</span>`;
    out.hidden = false;
    clearTimeout(print.timer);
    if (ms) print.timer = setTimeout(() => (out.hidden = true), ms);
  }

  function go(index) {
    const s = sections[Math.max(0, Math.min(sections.length - 1, index))];
    s.el.scrollIntoView({ block: "start" });
    history.replaceState(null, "", s.id === "top" ? location.pathname : `#${s.id}`);
  }

  const goTo = (name) => {
    const i = sections.findIndex((s) => s.name === name || s.id === name);
    if (i < 0) return false;
    go(i);
    return true;
  };

  const openLink = (href) => window.open(href, "_blank", "noopener");

  function run(line) {
    const [word = "", ...rest] = line.trim().replace(/^:/, "").split(/\s+/);
    const cmd = word.toLowerCase();
    const arg = rest.join(" ");
    if (!cmd) return;

    if (cmd === "help" || cmd === "h") return print(HELP);
    if (cmd === "ls") return print(sections.map((s) => `<b>${s.name}/</b>`).join("   "));
    if (cmd === "cd") {
      if (!arg || arg === "~") return go(0);
      return goTo(arg.replace(/\/$/, "")) || print(`<span class="err">cd: no such section: ${esc(arg)}</span> · try <b>:ls</b>`);
    }
    if (cmd === "open") {
      const p = findProject(arg);
      if (p) return openProject(p);
      return print(`<span class="err">open: no project called ${esc(arg || "that")}</span> · try <b>:cd projects</b>`);
    }
    if (cmd === "theme" || cmd === "colorscheme" || cmd === "colo") {
      if (!arg) return print(`colorscheme <b>${nextTheme()}</b>`, 2200);
      return setTheme(arg) ? print(`colorscheme <b>${esc(arg)}</b>`, 2200) : print(`<span class="err">E185: Cannot find color scheme '${esc(arg)}'</span> · ${THEMES.join(" · ")}`);
    }
    if (cmd in LINKS) return openLink(LINKS[cmd]);
    if (cmd === "mail" || cmd === "write") {
      goTo("mail");
      document.querySelector('#mail-form [name="email"]').focus({ preventScroll: true });
      return;
    }
    if (cmd === "whoami") return go(0);
    if (cmd === "intro") {
      try {
        sessionStorage.removeItem("intro");
      } catch {
        /* the query string asks for it anyway */
      }
      location.href = "/?intro";
      return;
    }
    if (cmd === "clear") return (out.hidden = true);
    if (cmd === "q" || cmd === "quit" || cmd === "wq" || cmd === "exit") {
      return print(`<span class="err">E37: No write since last change</span> · there's nothing to save here. <b>:help</b> lists what works.`);
    }
    if (cmd === "sudo") {
      if (/hire/i.test(arg)) {
        print(`[sudo] password for recruiter: ••••••••\n<span class="ok">verified.</span> opening mail…`);
        prefill("Let's talk about a role");
        setTimeout(() => run("mail"), 900);
        return;
      }
      return print(`recruiter is not in the sudoers file. This incident will be reported.\n(try <b>:sudo hire kaustubh</b>)`);
    }
    if (goTo(cmd)) return;
    const p = findProject(cmd);
    if (p) return openProject(p);
    print(`<span class="err">E492: Not an editor command: ${esc(line.replace(/^:/, ""))}</span> · try <b>:help</b>`);
  }

  function openCmd() {
    form.hidden = false;
    mode.textContent = "COMMAND";
    mode.classList.add("is-cmd");
    input.value = "";
    input.focus();
  }

  function closeCmd() {
    form.hidden = true;
    mode.textContent = "NORMAL";
    mode.classList.remove("is-cmd");
    if (document.activeElement === input) input.blur();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const line = input.value;
    closeCmd();
    run(line);
  });
  input.addEventListener("blur", () => setTimeout(() => !form.hidden && closeCmd(), 120));
  opener.addEventListener("click", openCmd);

  document.addEventListener("keydown", (e) => {
    if (document.documentElement.classList.contains("has-intro")) return;
    if (e.key === "Escape") {
      out.hidden = true;
      if (!form.hidden) closeCmd();
      return;
    }
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ":") {
      e.preventDefault();
      openCmd();
    } else if (e.key === "j") {
      go(current + 1);
    } else if (e.key === "k") {
      go(current - 1);
    } else if (e.key === "G") {
      go(sections.length - 1);
    } else if (e.key === "g") {
      if (lastKey === "g" && Date.now() - lastAt < 600) go(0);
    }
    lastKey = e.key;
    lastAt = Date.now();
  });

  document.addEventListener("click", (e) => {
    if (!out.hidden && !out.contains(e.target) && !bar.contains(e.target)) out.hidden = true;
  });

  // Mention the command line once, after a first look around.
  try {
    if (!localStorage.getItem("hinted")) {
      setTimeout(() => {
        const how = matchMedia("(hover: hover)").matches ? "press" : "tap";
        if (out.hidden && form.hidden) print(`tip: ${how} <b>:</b> for commands, or try <b>:help</b>`, 5000);
        localStorage.setItem("hinted", "1");
      }, 9000);
    }
  } catch {
    /* no storage: no tip */
  }
}
