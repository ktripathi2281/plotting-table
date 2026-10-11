// `ls -l ~/projects`: filters, and opening one project by name.

export function initProjects() {
  const buttons = [...document.querySelectorAll(".filters button")];
  const items = [...document.querySelectorAll(".proj")];
  const hint = document.querySelector("#projects .hint");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      for (const b of buttons) b.setAttribute("aria-pressed", String(b === button));
      for (const p of items) p.hidden = filter !== "all" && !p.dataset.tags.split(" ").includes(filter);
      const shown = items.filter((p) => !p.hidden).length;
      hint.textContent = `${shown} ${shown === 1 ? "entry" : "entries"} · open one to read how it works`;
    });
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findProject(query) {
  const q = slug(query);
  if (!q) return null;
  return [...document.querySelectorAll(".proj")].find((p) => {
    const label = slug(p.querySelector(".pname").textContent);
    return p.id === q || label === q || label.startsWith(q);
  });
}

export function openProject(project) {
  document.querySelector('.filters [data-filter="all"]')?.click();
  project.open = true;
  project.scrollIntoView({ block: "start" });
  project.querySelector("summary").focus({ preventScroll: true });
}
