import { snippets } from "./snippets.js";
import { tokenize, render } from "./highlight.js";
import { nextTheme } from "./theme.js";

// The opening screen: an editor that opens real files from three repositories
// and types them out, line by line, until the visitor presses Enter.

const TAB = "    ";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rand = (a, b) => a + Math.random() * (b - a);
const name = (file) => file.path.split("/").pop();

// Tokenise every line up front, carrying open comments across lines.
function prepare(snippet) {
  let state = {};
  const lines = snippet.code
    .replace(/\t/g, TAB)
    .split("\n")
    .map((text) => {
      const out = tokenize(text, snippet.lang, state);
      state = out.state;
      return { text, tokens: out.tokens };
    });
  return { ...snippet, lines };
}

export function runIntro(onEnter) {
  const root = document.documentElement;
  const intro = document.getElementById("intro");
  const site = document.getElementById("site");
  if (!root.classList.contains("has-intro") || !intro) {
    onEnter(false);
    return;
  }

  const $ = (id) => document.getElementById(id);
  const buffer = $("buffer");
  const tabline = $("tabline");
  const mode = $("mode");
  const path = $("status-path");
  const pos = $("status-pos");
  const echo = $("echo");
  const list = $("intro-files");
  const enterButton = $("enter");
  const files = snippets.map(prepare);

  tabline.innerHTML = files.map((f, i) => `<span data-i="${i}">${esc(name(f))}</span>`).join("");
  list.innerHTML = files
    .map((f, i) => `<li data-i="${i}"><a href="${f.href}" target="_blank" rel="noreferrer">${esc(f.repo)}/${esc(f.path)}</a></li>`)
    .join("");

  site.inert = true;
  enterButton.focus({ preventScroll: true });

  let stopped = false;
  let timer = 0;
  const wait = (ms) =>
    new Promise((resolve) => {
      timer = setTimeout(resolve, ms);
    });

  const setMode = (m) => {
    mode.textContent = m;
    mode.classList.toggle("is-insert", m === "INSERT");
  };

  function open(file, index) {
    buffer.textContent = "";
    for (const el of tabline.children) el.classList.toggle("is-on", Number(el.dataset.i) === index);
    for (const el of list.children) el.classList.toggle("is-on", Number(el.dataset.i) === index);
    path.textContent = `~/projects/${file.repo}/${file.path}`;
  }

  function row(number) {
    const ln = document.createElement("div");
    ln.className = "ln";
    ln.innerHTML = `<span class="no">${number}</span><span class="code"></span>`;
    buffer.querySelector(".is-cur")?.classList.remove("is-cur");
    ln.classList.add("is-cur");
    buffer.appendChild(ln);
    buffer.scrollTop = buffer.scrollHeight;
    return ln.lastChild;
  }

  const where = (file, li, col) => {
    const pct = li + 1 >= file.lines.length ? "Bot" : li < 2 ? "Top" : `${Math.round(((li + 1) / file.lines.length) * 100)}%`;
    pos.textContent = `${file.start + li}:${col + 1}  ${pct}`;
  };

  // Everything at once: for reduced motion.
  function show(file) {
    file.lines.forEach((line, li) => {
      row(file.start + li).innerHTML = render(line.tokens);
    });
    buffer.scrollTop = 0;
    buffer.querySelector(".is-cur")?.classList.remove("is-cur");
    where(file, 0, 0);
  }

  async function type(file) {
    setMode("INSERT");
    echo.textContent = "-- INSERT --";
    for (let li = 0; li < file.lines.length; li++) {
      const { text, tokens } = file.lines[li];
      const code = row(file.start + li);
      // Auto-indent: the leading whitespace arrives with the new line.
      let n = text.length - text.trimStart().length;
      while (n < text.length) {
        if (stopped) return;
        n = Math.min(text.length, n + 1 + Math.floor(Math.random() * 3));
        code.innerHTML = render(tokens, n) + '<span class="caret"></span>';
        where(file, li, n);
        await wait(rand(8, 22));
      }
      code.innerHTML = render(tokens) + (li === file.lines.length - 1 ? '<span class="caret is-blink"></span>' : "");
      where(file, li, text.length);
      if (stopped) return;
      await wait(text.trim() ? rand(40, 110) : 25);
    }
  }

  async function command(text) {
    setMode("NORMAL");
    echo.textContent = "";
    for (const ch of text) {
      if (stopped) return;
      echo.textContent += ch;
      await wait(rand(18, 40));
    }
    await wait(260);
  }

  async function play() {
    for (let k = 0; !stopped; k++) {
      const i = k % files.length;
      const file = files[i];
      if (k > 0) await command(`:e ~/projects/${file.repo}/${file.path}`);
      if (stopped) return;
      open(file, i);
      await type(file);
      if (stopped) return;
      setMode("NORMAL");
      echo.textContent = `"${name(file)}" ${file.lines.length}L, ${file.bytes}B written`;
      enterButton.classList.add("is-ready");
      await wait(2600);
    }
  }

  function enter() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    echo.textContent = ":q";
    try {
      sessionStorage.setItem("intro", "seen");
    } catch {
      /* the intro will simply play again next time */
    }
    const finish = () => {
      root.classList.remove("has-intro");
      intro.remove();
      site.inert = false;
      document.removeEventListener("keydown", onKey);
      onEnter(true);
    };
    if (reduce) return finish();
    setTimeout(() => {
      intro.classList.add("is-leaving");
      setTimeout(finish, 450);
    }, 160);
  }

  function onKey(e) {
    if (e.key !== "Enter" && e.key !== "Escape") return;
    // Enter on a focused file link opens it, as links do.
    if (e.key === "Enter" && e.target.closest?.("a")) return;
    e.preventDefault();
    enter();
  }

  document.addEventListener("keydown", onKey);
  enterButton.addEventListener("click", enter);
  $("intro-theme").addEventListener("click", () => {
    const theme = nextTheme();
    if (reduce || !echo.textContent.startsWith("-- INSERT")) echo.textContent = `:colorscheme ${theme}`;
  });

  if (reduce) {
    open(files[0], 0);
    show(files[0]);
    echo.textContent = `"${name(files[0])}" ${files[0].lines.length}L, ${files[0].bytes}B`;
    enterButton.classList.add("is-ready");
  } else {
    play();
  }
}
