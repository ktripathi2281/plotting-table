// A small syntax highlighter for the intro's editor: enough of Go, Python and
// TypeScript to colour comments, strings, numbers, keywords, types and calls.

const WORDS = {
  go: {
    key: "break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false",
    type: "any bool byte error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr",
  },
  python: {
    key: "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield None True False",
    type: "int float str bool dict list tuple set bytes object",
  },
  ts: {
    key: "as async await break case catch class const continue default delete do else export extends finally for from function if implements import in instanceof interface let new of return static switch throw try type typeof var void while yield readonly null undefined true false",
    type: "string number boolean unknown never any",
  },
};

const SETS = Object.fromEntries(
  Object.entries(WORDS).map(([lang, w]) => [lang, { key: new Set(w.key.split(" ")), type: new Set(w.type.split(" ")) }])
);

const STRING = /^(?:"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`[^`]*`?)/;

// One line as [text, class] tokens. `state` carries a block comment or
// docstring that is still open at the end of the line on to the next one.
export function tokenize(line, lang, state = {}) {
  const { key, type } = SETS[lang];
  const tokens = [];
  const push = (text, cls = "") => text && tokens.push([text, cls]);
  let i = 0;

  if (state.close) {
    const end = line.indexOf(state.close);
    if (end < 0) {
      push(line, state.cls);
      return { tokens, state };
    }
    i = end + state.close.length;
    push(line.slice(0, i), state.cls);
    state = {};
  }

  while (i < line.length) {
    const rest = line.slice(i);
    let m;
    if (lang === "python" ? rest.startsWith("#") : rest.startsWith("//")) {
      push(rest, "tk-com");
      break;
    }
    const opener = lang === "ts" && rest.startsWith("/*") ? ["*/", "tk-com"] : lang === "python" && /^("""|''')/.test(rest) ? [rest.slice(0, 3), "tk-str"] : null;
    if (opener) {
      const [close, cls] = opener;
      const end = rest.indexOf(close, close === "*/" ? 2 : 3);
      if (end < 0) {
        push(rest, cls);
        state = { close, cls };
        break;
      }
      push(rest.slice(0, end + close.length), cls);
      i += end + close.length;
      continue;
    }
    if (lang === "python" && (m = rest.match(/^[fbrFBR]{1,2}(?=["'])/))) {
      const s = rest.slice(m[0].length).match(STRING)[0];
      push(m[0] + s, "tk-str");
      i += m[0].length + s.length;
      continue;
    }
    if ((m = rest.match(STRING))) {
      push(m[0], "tk-str");
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?/i))) {
      push(m[0], "tk-num");
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const word = m[0];
      const after = rest.slice(word.length);
      const cls = key.has(word)
        ? "tk-key"
        : type.has(word) || /^[A-Z]/.test(word)
          ? "tk-type"
          : /^\s*\(/.test(after)
            ? "tk-fn"
            : "";
      push(word, cls);
      i += word.length;
      continue;
    }
    if ((m = rest.match(/^\s+/))) {
      push(m[0]);
      i += m[0].length;
      continue;
    }
    push(rest[0], "tk-pun");
    i += 1;
  }
  return { tokens, state };
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The first `upto` characters of a tokenised line, as HTML.
export function render(tokens, upto = Infinity) {
  let html = "";
  let n = 0;
  for (const [text, cls] of tokens) {
    if (n >= upto) break;
    const part = esc(text.slice(0, upto - n));
    n += text.length;
    html += cls ? `<span class="${cls}">${part}</span>` : part;
  }
  return html;
}
