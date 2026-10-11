// `git log --recent`: the latest commit in each of the five repositories
// pushed to most recently, live from GitHub's public API. The page ships with
// a snapshot, which stays if the API is slow, rate-limited or offline.

const USER = "ktripathi2281";
// Portfolio sites, the profile repository and forks are left out: the log
// is for the work itself.
const SKIP = new Set(["kaustubh-tripathi", "plotting-table", "Portfolio", "kaustubh-dev", "ktripathi2281", "kaustubh-tripathi-gallery"]);
const CACHE = "gitlog-v1";
const FRESH_FOR = 30 * 60 * 1000;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function ago(iso, now = Date.now()) {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

async function get(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function load() {
  const [user, repos] = await Promise.all([
    get(`https://api.github.com/users/${USER}`),
    get(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=30`),
  ]);
  const picked = repos.filter((r) => !r.fork && !SKIP.has(r.name)).slice(0, 5);
  const rows = await Promise.all(
    picked.map(async (r) => {
      const [c] = await get(`https://api.github.com/repos/${r.full_name}/commits?per_page=1`);
      return {
        repo: r.name,
        lang: r.language || "",
        sha: c.sha.slice(0, 7),
        msg: c.commit.message.split("\n")[0],
        at: c.commit.committer?.date || r.pushed_at,
        url: c.html_url,
      };
    })
  );
  return { savedAt: Date.now(), repos: user.public_repos, rows };
}

function cached() {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE));
    if (data && Date.now() - data.savedAt < FRESH_FOR) return data;
  } catch {
    /* nothing cached */
  }
  return null;
}

function draw(list, rows) {
  list.innerHTML = rows
    .map(
      (r) =>
        `<li><a href="${esc(r.url)}" target="_blank" rel="noreferrer"><span class="sha">${esc(r.sha)}</span> <span class="repo">${esc(r.repo)}</span> <span class="lang">${esc(r.lang)}</span> <time datetime="${esc(r.at)}">${ago(r.at)}</time> <span class="msg">${esc(r.msg)}</span></a></li>`
    )
    .join("");
}

export async function initActivity() {
  const list = document.getElementById("gitlog");
  if (!list) return;
  // The snapshot's dates, as relative times, straight away.
  for (const t of list.querySelectorAll("time")) t.textContent = ago(t.dateTime);

  let data = cached();
  if (!data) {
    try {
      data = await load();
      localStorage.setItem(CACHE, JSON.stringify(data));
    } catch {
      return;
    }
  }
  if (data.rows.length) draw(list, data.rows);
  if (data.repos) document.getElementById("repo-count").textContent = data.repos;
}
