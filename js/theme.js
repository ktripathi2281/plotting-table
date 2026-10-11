// Colour schemes, as in an editor: amber by default, kept between visits.
export const THEMES = ["amber", "paper", "phosphor", "daylight"];

const root = document.documentElement;

export const currentTheme = () => (THEMES.includes(root.dataset.theme) ? root.dataset.theme : THEMES[0]);

export function setTheme(name, { save = true } = {}) {
  if (!THEMES.includes(name)) return false;
  root.dataset.theme = name;
  if (save) {
    try {
      localStorage.setItem("theme", name);
    } catch {
      /* storage unavailable: the theme still applies for this visit */
    }
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(root).getPropertyValue("--bg").trim();
  return true;
}

export function nextTheme() {
  const next = THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length];
  setTheme(next);
  return next;
}

export const initTheme = () => setTheme(currentTheme(), { save: false });
