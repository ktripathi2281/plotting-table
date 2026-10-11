# Kaustubh Tripathi · terminal edition

A portfolio set out as a developer's own terminal. It opens on an editor that types out real code from three of
my repositories (Tollgate, DeepResearch and Loop Detector) until you press Enter. Then every section is a command:
`whoami`, `fetch`, `ls -l ~/projects`, `cat experience.log`, `cat stack.toml`, `ls ~/writing` and `mail`.

- **Commands:** press `:` for vim's command line (`:help` lists them), `j` / `k` to move between sections.
- **Live:** `git log --recent` reads the latest commit in each of my most recently pushed repositories from
  GitHub's public API, cached for half an hour. The page ships with a snapshot, used when the API is unavailable.
- **Portrait:** ASCII, generated from a photograph with the background traced out.
- **Mail:** sent through Web3Forms with a public access key, with the visitor's own mail app as the fallback.
- **Themes:** amber (default), paper, phosphor and daylight; `:theme` cycles, and the choice is kept.

Plain HTML, CSS and JavaScript modules. No build step, no dependencies.

```bash
python -m http.server 5192   # or any static server, then open http://localhost:5192
```

The plotting table that used to live on this branch's `main` is tagged `plotting-table-v1`.
